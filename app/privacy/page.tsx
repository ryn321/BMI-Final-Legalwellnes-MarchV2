import type { CSSProperties } from "react";

const mainStyle: CSSProperties = {
  background: "#061037",
  color: "#f8fafc",
  fontFamily: "Arial, sans-serif",
  lineHeight: 1.65,
  minHeight: "100vh",
  padding: "48px 20px",
};

const articleStyle: CSSProperties = {
  margin: "0 auto",
  maxWidth: 800,
};

const headingStyle: CSSProperties = {
  color: "#d4af37",
};

export const metadata = {
  title: "Privacy Notice | Legal Wellness",
  description: "Privacy notice for Legal Wellness website enquiries and consultation requests.",
};

export default function PrivacyNotice() {
  return (
    <main style={mainStyle}>
      <article style={articleStyle}>
        <a href="/" style={{ color: "#d4af37" }}>← Back to Legal Wellness</a>
        <h1 style={headingStyle}>Website enquiry privacy notice</h1>
        <p><strong>Effective date:</strong> 16 September 2026</p>

        <h2 style={headingStyle}>Who is responsible</h2>
        <p>
          Legal Wellness is operated by Bornman Marlow Inc. Bornman Marlow Inc. is the responsible party for personal information submitted through this website.
        </p>

        <h2 style={headingStyle}>Information collected and why</h2>
        <p>
          The consultation form collects your name, contact details, South African ID number, consultation preference and a summary of your legal issue. This information is used to identify or match you as a client, assess and route your request, contact you and arrange the requested consultation. It is not collected through this form for unrelated marketing.
        </p>
        <p>
          These details, including the ID number, are required for the consultation-request process. If you do not provide them, the consultation form cannot be submitted. You may instead contact Legal Wellness to discuss another appropriate way to make an enquiry.
        </p>

        <h2 style={headingStyle}>Service providers and access</h2>
        <p>
          The website is delivered through Netlify and enquiry emails are delivered through Resend to <a href="mailto:client@legalwellness.co.za" style={{ color: "#d4af37" }}>client@legalwellness.co.za</a>. These providers act as technology operators and may process data outside South Africa subject to their security and contractual safeguards. Access within Legal Wellness and Bornman Marlow Inc. is limited to authorised personnel who handle enquiries and consultations.
        </p>

        <h2 style={headingStyle}>Retention and security</h2>
        <p>
          The gateway does not keep a separate database copy of the submission. The enquiry email and related client record are retained only for as long as reasonably needed to handle the request and meet applicable legal, professional and recordkeeping obligations. Reasonable technical and organisational safeguards are used, but no internet transmission can be guaranteed completely secure.
        </p>

        <h2 style={headingStyle}>Your rights</h2>
        <p>
          You may ask whether your information is held, request access or correction, object to processing where applicable, withdraw consent where consent is relied on, or request deletion subject to legal retention duties. Contact <a href="mailto:client@legalwellness.co.za" style={{ color: "#d4af37" }}>client@legalwellness.co.za</a> or call <a href="tel:0871140387" style={{ color: "#d4af37" }}>087 114 0387</a>.
        </p>
        <p>
          You may also lodge a POPIA complaint with the <a href="https://inforegulator.org.za/contact-us/" target="_blank" rel="noopener noreferrer" style={{ color: "#d4af37" }}>Information Regulator (South Africa)</a>.
        </p>

        <h2 style={headingStyle}>Contact address</h2>
        <p>
          300 Middel Building B, Ground Floor<br />
          300 Middel Street, Nieuw Muckleneuk<br />
          Pretoria, 0181
        </p>
      </article>
    </main>
  );
}
