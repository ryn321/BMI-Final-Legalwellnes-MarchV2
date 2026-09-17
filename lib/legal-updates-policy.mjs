export const HIDDEN_ARTICLE_PATHS = Object.freeze([
  "/news/consumer-protection-opt-out-2025",
  "/news/wills-estates-amendment-bill",
  "/news/raf-amendment-2025",
  "/news/rental-housing-act-2025",
  "/news/family-law-mediation-rules",
  "/news/labor-law-dismissal-code",
]);

export const RETAINED_ARTICLE_PATHS = Object.freeze([
  "/news/labour-procedures",
  "/news/divorce-procedures",
  "/news/wills-estate-matters",
]);

const hiddenArticlePaths = new Set(HIDDEN_ARTICLE_PATHS);
const pageScope = 'body:has(img[alt="Legal Updates"])';
const newsletterSelector = `${pageScope} section.container.mx-auto.px-6.pt-12.text-center:has(> h3 + a[href="mailto:client@legalwellness.co.za"])`;
const cardSelector = "div.group.relative.bg-foreground\\/5.border.border-border.rounded-2xl";

export function isHiddenArticlePath(pathname) {
  return hiddenArticlePaths.has(pathname);
}

const hiddenCardRules = HIDDEN_ARTICLE_PATHS.map((path) => (
  `${pageScope} ${cardSelector}:has(a[href="${path}"])`
)).join(",\n");

export const LEGAL_UPDATES_STYLE = `${newsletterSelector},
${hiddenCardRules} {
  display: none !important;
}
${newsletterSelector} + section.container.mx-auto.px-6.pt-4.pb-12 {
  padding-top: 3rem !important;
}`;

const styleId = "lw-legal-updates-policy";
const bootstrapId = "lw-legal-updates-bootstrap";
const styleText = JSON.stringify(LEGAL_UPDATES_STYLE);
const hiddenPaths = JSON.stringify(HIDDEN_ARTICLE_PATHS);

export const LEGAL_UPDATES_BOOTSTRAP = `(function(){
  "use strict";
  var STYLE_ID=${JSON.stringify(styleId)};
  var STYLE_TEXT=${styleText};
  var HIDDEN_PATHS=${hiddenPaths};
  var CARD_SELECTOR=${JSON.stringify(cardSelector)};
  var queued=false;
  function installStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=STYLE_TEXT;
    document.head.appendChild(style);
  }
  function hide(element){
    if(!element) return;
    element.hidden=true;
    element.setAttribute("aria-hidden","true");
    if(element.style) element.style.display="none";
  }
  function applyFallback(){
    if(!location || location.pathname!=="/news") return;
    var headings=Array.from(document.querySelectorAll("h3"));
    var heading=headings.find(function(node){return (node.textContent||"").trim()==="Click on Newsletter";});
    var section=heading&&heading.closest("section.container.mx-auto.px-6.pt-12.text-center");
    var link=heading&&heading.nextElementSibling;
    if(section&&heading.parentElement===section&&link&&link.tagName==="A"&&link.getAttribute("href")==="mailto:client@legalwellness.co.za"&&(link.textContent||"").trim()==="Click here for more information"){
      hide(section);
      var guidance=section.nextElementSibling;
      if(guidance&&guidance.matches("section.container.mx-auto.px-6.pt-4.pb-12")&&guidance.textContent.includes("Legal Updates give you practical guidance to:")){
        guidance.style.paddingTop="3rem";
      }
    }
    HIDDEN_PATHS.forEach(function(path){
      Array.from(document.querySelectorAll('a[href="'+path+'"]')).forEach(function(anchor){
        hide(anchor.closest(CARD_SELECTOR));
      });
    });
  }
  function queueFallback(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(function(){queued=false;applyFallback();});
  }
  function afterLoad(){
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        installStyle();
        if(!(globalThis.CSS&&CSS.supports("selector(:has(*))"))){
          applyFallback();
          var observer=new MutationObserver(queueFallback);
          observer.observe(document.documentElement,{childList:true,subtree:true});
        }
      });
    });
  }
  if(document.readyState==="complete") afterLoad();
  else addEventListener("load",afterLoad,{once:true});
})();`;

export const LEGAL_UPDATES_STYLE_MARKUP = `<style id="${styleId}">${LEGAL_UPDATES_STYLE}</style>`;
export const LEGAL_UPDATES_BOOTSTRAP_MARKUP = `<script id="${bootstrapId}">${LEGAL_UPDATES_BOOTSTRAP}</script>`;

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

export function injectLegalUpdatesPolicy(html) {
  const styleMarkers = countMatches(html, /<style\b[^>]*\bid=["']lw-legal-updates-policy["'][^>]*>/gi);
  const bootstrapMarkers = countMatches(html, /<script\b[^>]*\bid=["']lw-legal-updates-bootstrap["'][^>]*>/gi);
  if (styleMarkers === 1 && bootstrapMarkers === 1) {
    return { html, modified: false, reason: "already-injected" };
  }
  if (styleMarkers !== 0 || bootstrapMarkers !== 0) {
    return { html, modified: false, reason: "inconsistent-policy-markers" };
  }

  const headAnchors = countMatches(html, /<\/head\s*>/gi);
  const bodyAnchors = countMatches(html, /<\/body\s*>/gi);
  if (headAnchors !== 1) {
    return { html, modified: false, reason: `head-anchor-count:${headAnchors}` };
  }
  if (bodyAnchors !== 1) {
    return { html, modified: false, reason: `body-anchor-count:${bodyAnchors}` };
  }

  const withStyle = html.replace(/<\/head\s*>/i, `${LEGAL_UPDATES_STYLE_MARKUP}$&`);
  const transformed = withStyle.replace(/<\/body\s*>/i, `${LEGAL_UPDATES_BOOTSTRAP_MARKUP}$&`);
  return { html: transformed, modified: true, reason: "injected" };
}
