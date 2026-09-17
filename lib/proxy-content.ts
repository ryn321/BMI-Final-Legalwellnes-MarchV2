const consentNotice = "By selecting Submit Request, you acknowledge that your required ID number and legal enquiry will be processed by Legal Wellness (Bornman Marlow Inc.), Netlify and Resend for client identification, assessment and follow-up. If you do not provide the required details, this consultation request cannot be submitted. Read the";

const serverSubmitMarker = ">Submit Request</button></form>";
const serverSubmitWithConsent = `>Submit Request</button><p class="text-xs text-muted-foreground text-center mt-3">${consentNotice} <a href="/privacy" target="_blank" rel="noopener noreferrer" class="underline">Privacy Notice</a>.</p></form>`;
const clientSubmitMarker = '"Submit Request"})]})]})';
const clientSubmitWithConsent = `"Submit Request"}),(0,A.jsxs)("p",{className:"text-xs text-muted-foreground text-center mt-3",children:["${consentNotice} ",(0,A.jsx)("a",{href:"/privacy",target:"_blank",rel:"noopener noreferrer",className:"underline",children:"Privacy Notice"}),"."]})]})]})`;

const serverNewsletterBlock = '<section class="container mx-auto px-6 pt-12 text-center"><h3 class="text-2xl font-bold text-foreground mb-4">Click on Newsletter</h3><a href="mailto:client@legalwellness.co.za" class="text-accent hover:underline font-bold text-lg mb-8 inline-block rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Click here for more information</a></section>';
const serverGuidanceSection = '<section class="container mx-auto px-6 pt-4 pb-12">';
const serverGuidanceSectionSpaced = '<section class="container mx-auto px-6 pt-12 pb-12">';

const clientNewsletterBlock = '(0,t.jsxs)("section",{className:"container mx-auto px-6 pt-12 text-center",children:[(0,t.jsx)("h3",{className:"text-2xl font-bold text-foreground mb-4",children:"Click on Newsletter"}),(0,t.jsx)("a",{href:"mailto:client@legalwellness.co.za",className:"text-accent hover:underline font-bold text-lg mb-8 inline-block rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",children:"Click here for more information"})]})';
const clientGuidanceSection = 'className:"container mx-auto px-6 pt-4 pb-12"';
const clientGuidanceSectionSpaced = 'className:"container mx-auto px-6 pt-12 pb-12"';

const temporarilyUnpublishedArticleSlugs = new Set([
  "consumer-protection-opt-out-2025",
  "wills-estates-amendment-bill",
  "raf-amendment-2025",
  "rental-housing-act-2025",
  "family-law-mediation-rules",
  "labor-law-dismissal-code",
]);

const hiddenArticleSelectors = [...temporarilyUnpublishedArticleSlugs]
  .map((slug) => `.group:has(a[href="/news/${slug}"])`)
  .join(",");
const hiddenArticleStyle = `<style id="legal-wellness-hidden-articles">${hiddenArticleSelectors}{display:none!important}</style>`;

export function isTemporarilyUnpublishedArticlePath(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const prefix = "/news/";
  return normalizedPath.startsWith(prefix)
    && temporarilyUnpublishedArticleSlugs.has(normalizedPath.slice(prefix.length));
}

export function transformApprovedOriginContent(source: string, contentType: string): string {
  const normalizedType = contentType.toLowerCase();

  if (normalizedType.includes("text/html")) {
    let transformed = source.replace(serverSubmitMarker, serverSubmitWithConsent);
    if (!transformed.includes('id="legal-wellness-hidden-articles"')) {
      transformed = transformed.replace("</head>", `${hiddenArticleStyle}</head>`);
    }
    const withoutNewsletter = transformed.replace(serverNewsletterBlock, "");
    if (withoutNewsletter !== transformed) {
      transformed = withoutNewsletter.replace(serverGuidanceSection, serverGuidanceSectionSpaced);
    }
    return transformed;
  }

  if (normalizedType.includes("javascript")) {
    let transformed = source.replace(clientSubmitMarker, clientSubmitWithConsent);
    const withoutNewsletter = transformed.replace(clientNewsletterBlock, "");
    if (withoutNewsletter !== transformed) {
      transformed = withoutNewsletter.replace(clientGuidanceSection, clientGuidanceSectionSpaced);
    }
    return transformed;
  }

  return source;
}
