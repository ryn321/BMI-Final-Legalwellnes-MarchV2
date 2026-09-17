const origin = "https://legal-wellness-master-final.netlify.app";
const serverIdField = '<input id="consultation-idNumber" type="text" placeholder="SA ID Number…" required=""';
const clientIdField = 'id:"consultation-idNumber",name:"id-number",type:"text",placeholder:"SA ID Number…",required:!0,value:n.idNumber,onChange:e=>i({...n,idNumber:e.target.value})';
const serverSubmitMarker = ">Submit Request</button></form>";
const clientSubmitMarker = '"Submit Request"})]})]})';

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

const chunkPaths = [...new Set(html.match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js/g) ?? [])];
let clientMarkerCount = 0;
let clientSubmitMarkerCount = 0;
for (const chunkPath of chunkPaths) {
  const chunkResponse = await fetch(new URL(chunkPath, origin));
  if (!chunkResponse.ok) throw new Error(`Chunk ${chunkPath} returned HTTP ${chunkResponse.status}`);
  const chunk = await chunkResponse.text();
  if (chunk.includes(clientIdField)) clientMarkerCount += 1;
  if (chunk.includes(clientSubmitMarker)) clientSubmitMarkerCount += 1;
}

if (clientMarkerCount !== 1) {
  throw new Error(`Expected one frozen client ID-field marker; found ${clientMarkerCount}`);
}
if (clientSubmitMarkerCount !== 1) {
  throw new Error(`Expected one frozen client submit marker; found ${clientSubmitMarkerCount}`);
}

console.log(JSON.stringify({
  origin,
  chunkCount: chunkPaths.length,
  clientMarkerCount,
  clientSubmitMarkerCount,
  status: "verified",
}));
