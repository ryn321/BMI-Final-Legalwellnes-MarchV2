const origin = "https://legal-wellness-master-final.netlify.app";
const serverIdField = '<input id="consultation-idNumber" type="text" placeholder="SA ID Number…" required=""';
const clientIdField = 'id:"consultation-idNumber",name:"id-number",type:"text",placeholder:"SA ID Number…",required:!0,value:n.idNumber,onChange:e=>i({...n,idNumber:e.target.value})';
const serverSubmitMarker = ">Submit Request</button></form>";
const clientSubmitMarker = '"Submit Request"})]})]})';
const serverNewsletterBlock = '<section class="container mx-auto px-6 pt-12 text-center"><h3 class="text-2xl font-bold text-foreground mb-4">Click on Newsletter</h3><a href="mailto:client@legalwellness.co.za" class="text-accent hover:underline font-bold text-lg mb-8 inline-block rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Click here for more information</a></section>';
const serverGuidanceSection = '<section class="container mx-auto px-6 pt-4 pb-12">';
const clientNewsletterBlock = '(0,t.jsxs)("section",{className:"container mx-auto px-6 pt-12 text-center",children:[(0,t.jsx)("h3",{className:"text-2xl font-bold text-foreground mb-4",children:"Click on Newsletter"}),(0,t.jsx)("a",{href:"mailto:client@legalwellness.co.za",className:"text-accent hover:underline font-bold text-lg mb-8 inline-block rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",children:"Click here for more information"})]})';
const clientGuidanceSection = 'className:"container mx-auto px-6 pt-4 pb-12"';

const response = await fetch(origin, { redirect: "error" });
if (!response.ok) throw new Error(`Approved origin returned HTTP ${response.status}`);

const html = await response.text();
for (const marker of [
  "<title>Legal Wellness | Dignity, Integrity &amp; Excellence</title>",
  "mailto:client@legalwellness.co.za",
  serverIdField,
  serverSubmitMarker,
]) {
  if (!html.includes(marker)) throw new Error(`Approved-origin marker missing: ${marker}`);
}

const newsResponse = await fetch(new URL("/news", origin), { redirect: "error" });
if (!newsResponse.ok) throw new Error(`Approved-origin news page returned HTTP ${newsResponse.status}`);

const newsHtml = await newsResponse.text();
for (const marker of [serverNewsletterBlock, serverGuidanceSection]) {
  if (!newsHtml.includes(marker)) throw new Error(`Approved-origin news marker missing: ${marker}`);
}

const chunkPaths = [...new Set([
  ...(html.match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js/g) ?? []),
  ...(newsHtml.match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js/g) ?? []),
])];
let clientMarkerCount = 0;
let clientSubmitMarkerCount = 0;
let clientNewsletterMarkerCount = 0;
let clientGuidanceMarkerCount = 0;
for (const chunkPath of chunkPaths) {
  const chunkResponse = await fetch(new URL(chunkPath, origin));
  if (!chunkResponse.ok) throw new Error(`Chunk ${chunkPath} returned HTTP ${chunkResponse.status}`);
  const chunk = await chunkResponse.text();
  if (chunk.includes(clientIdField)) clientMarkerCount += 1;
  if (chunk.includes(clientSubmitMarker)) clientSubmitMarkerCount += 1;
  if (chunk.includes(clientNewsletterBlock)) clientNewsletterMarkerCount += 1;
  if (chunk.includes(clientGuidanceSection)) clientGuidanceMarkerCount += 1;
}

if (clientMarkerCount !== 1) {
  throw new Error(`Expected one frozen client ID-field marker; found ${clientMarkerCount}`);
}
if (clientSubmitMarkerCount !== 1) {
  throw new Error(`Expected one frozen client submit marker; found ${clientSubmitMarkerCount}`);
}
if (clientNewsletterMarkerCount !== 1) {
  throw new Error(`Expected one frozen client newsletter marker; found ${clientNewsletterMarkerCount}`);
}
if (clientGuidanceMarkerCount !== 1) {
  throw new Error(`Expected one frozen client guidance marker; found ${clientGuidanceMarkerCount}`);
}

console.log(JSON.stringify({
  origin,
  chunkCount: chunkPaths.length,
  clientMarkerCount,
  clientSubmitMarkerCount,
  clientNewsletterMarkerCount,
  clientGuidanceMarkerCount,
  status: "verified",
}));
Check Legal Updates client bundles
