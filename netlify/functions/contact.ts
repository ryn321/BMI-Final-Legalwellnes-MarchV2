import type { Config, Context } from "@netlify/functions";
import { Resend } from "resend";

const recipient = "client@legalwellness.co.za";
const sender = "Legal Wellness <info@updates.bornmanmarlow.co.za>";
const maximumBodyBytes = 16_384;

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function parseMessage(value: string): { idNumber: string; message: string; consultation: boolean } {
  const consultation = /^Consultation Type:/im.test(value);
  const rawIdNumber = value.match(/^ID Number:\s*(.*)$/im)?.[1] ?? "";
  const idNumber = rawIdNumber.replace(/\D/g, "").slice(0, 13);
  return {
    consultation,
    idNumber,
    message: value.replace(/^ID Number:.*(?:\r?\n)?/im, "").trim(),
  };
}

export default async function handler(request: Request, _context: Context) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maximumBodyBytes) {
    return Response.json({ error: "Request is too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) {
    return Response.json({ error: "Request is too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const record = payload as Record<string, unknown>;
  const name = clean(record.name, 120);
  const email = clean(record.email, 254).toLowerCase();
  const phone = clean(record.phone, 40);
  const parsedMessage = parseMessage(clean(record.message, 5_000));
  const message = parsedMessage.message;

  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  if (parsedMessage.consultation && !/^\d{13}$/.test(parsedMessage.idNumber)) {
    return Response.json({ error: "A valid 13-digit South African ID number is required" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "Email service is not configured" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: sender,
    to: [recipient],
    replyTo: email,
    subject: `Legal Wellness website enquiry - ${name}`,
    text: [
      "New Legal Wellness website enquiry",
      `Name: ${name}`,
      `Email: ${email}`,
      `Telephone: ${phone || "Not supplied"}`,
      ...(parsedMessage.idNumber ? [`ID number: ${parsedMessage.idNumber}`] : []),
      "",
      message,
    ].join("\n"),
    html: `
      <h2>New Legal Wellness website enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telephone:</strong> ${escapeHtml(phone || "Not supplied")}</p>
      ${parsedMessage.idNumber ? `<p><strong>ID number:</strong> ${escapeHtml(parsedMessage.idNumber)}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `,
  });

  if (result.error) {
    console.error("Legal Wellness contact delivery failed", result.error.name);
    return Response.json({ error: "Unable to send enquiry" }, { status: 502 });
  }

  return Response.json({ message: "Enquiry sent" });
}

export const config: Config = {
  path: "/api/contact",
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
