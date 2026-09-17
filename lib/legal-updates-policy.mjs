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
const gridSelector = "div.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-8";
const smallClaimsPath = "/news/small-claims-court-limit-2026";

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
}
@media (min-width: 768px) {
  ${pageScope} ${gridSelector} {
    grid-template-columns: repeat(2,minmax(0,1fr)) !important;
    max-width: 72rem;
    margin-left: auto;
    margin-right: auto;
  }
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
  var GRID_SELECTOR=${JSON.stringify(gridSelector)};
  var SOURCE_PATH="/news/consumer-protection-opt-out-2025";
  var ARTICLE_PATH=${JSON.stringify(smallClaimsPath)};
  var ARTICLE_TITLE="Small Claims Court Limit Increased to R30 000";
  var ARTICLE_CATEGORY="Civil Claims";
  var ARTICLE_DATE="17 September 2026";
  var ARTICLE_BYLINE="Legal Wellness";
  var ARTICLE_SUMMARY="The Small Claims Court limit increased to R30 000 on 1 August 2026, giving more everyday civil disputes access to the simpler process.";
  var queued=false;
  function cleanText(node){return (node&&node.textContent||"").replace(/\\s+/g," ").trim();}
  function replaceTrailingText(node,value){
    Array.from(node.childNodes).forEach(function(child){if(child.nodeType===3) child.remove();});
    node.appendChild(document.createTextNode(value));
  }
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
  function findCardContract(){
    if(!location||location.pathname!=="/news") return null;
    var grids=Array.from(document.querySelectorAll(GRID_SELECTOR));
    var heroes=Array.from(document.querySelectorAll('img[alt="Legal Updates"]'));
    if(grids.length!==1||heroes.length!==1) return null;
    var grid=grids[0];
    var anchors=Array.from(grid.querySelectorAll('a[href="'+SOURCE_PATH+'"]'));
    if(anchors.length!==1) return null;
    var anchor=anchors[0];
    var card=anchor.closest(CARD_SELECTOR);
    if(!card||card.parentElement!==grid||cleanText(anchor)!=="New Consumer Protection Rules: The 2025 Direct Marketing Opt-Out Registry") return null;
    var images=Array.from(card.querySelectorAll("img")).filter(function(image){
      var source=image.getAttribute("src")||"";
      try{source=decodeURIComponent(source);}catch{}
      return image.getAttribute("alt")==="New Consumer Protection Rules: The 2025 Direct Marketing Opt-Out Registry"&&source.includes("/assets/news/consumer.png");
    });
    var categories=Array.from(card.querySelectorAll("div.absolute.top-4.left-4")).filter(function(node){return cleanText(node)==="Consumer Law";});
    var dates=Array.from(card.querySelectorAll("span")).filter(function(node){return cleanText(node)==="February 1, 2026";});
    var authors=Array.from(card.querySelectorAll("span")).filter(function(node){return cleanText(node)==="Ilse Marlow";});
    var summaries=Array.from(card.querySelectorAll("p")).filter(function(node){return cleanText(node)==="The NCC is establishing a strict new opt-out registry for direct marketing. Discover how this protects your privacy and what it means for businesses.";});
    if(images.length!==1||categories.length!==1||dates.length!==1||authors.length!==1||summaries.length!==1) return null;
    var retained=grid.querySelector('a[href="/news/wills-estate-matters"]');
    var retainedCard=retained&&retained.closest(CARD_SELECTOR);
    if(!retainedCard||retainedCard.parentElement!==grid) return null;
    return {grid:grid,hero:heroes[0],sourceCard:card,retainedCard:retainedCard};
  }
  function installSmallClaimsCard(){
    if(!location||location.pathname!=="/news") return;
    var existing=document.querySelectorAll('[data-lw-small-claims-card="true"]');
    if(existing.length===1) return;
    if(existing.length>1){Array.from(existing).slice(1).forEach(function(node){node.remove();});return;}
    var contract=findCardContract();
    if(!contract) return;
    var card=contract.sourceCard.cloneNode(true);
    card.setAttribute("data-lw-small-claims-card","true");
    card.removeAttribute("hidden");
    card.removeAttribute("aria-hidden");
    card.removeAttribute("style");
    var anchor=card.querySelector('a[href="'+SOURCE_PATH+'"]');
    var image=card.querySelector('img[alt="New Consumer Protection Rules: The 2025 Direct Marketing Opt-Out Registry"]');
    var category=Array.from(card.querySelectorAll("div.absolute.top-4.left-4")).find(function(node){return cleanText(node)==="Consumer Law";});
    var date=Array.from(card.querySelectorAll("span")).find(function(node){return cleanText(node)==="February 1, 2026";});
    var author=Array.from(card.querySelectorAll("span")).find(function(node){return cleanText(node)==="Ilse Marlow";});
    var summary=Array.from(card.querySelectorAll("p")).find(function(node){return cleanText(node)==="The NCC is establishing a strict new opt-out registry for direct marketing. Discover how this protects your privacy and what it means for businesses.";});
    if(!anchor||!image||!category||!date||!author||!summary) return;
    ["src","srcset","sizes"].forEach(function(name){
      var value=contract.hero.getAttribute(name);
      if(value) image.setAttribute(name,value); else image.removeAttribute(name);
    });
    image.setAttribute("alt","Small Claims Court entrance and access to justice");
    category.textContent=ARTICLE_CATEGORY;
    replaceTrailingText(date,ARTICLE_DATE);
    replaceTrailingText(author,ARTICLE_BYLINE);
    anchor.setAttribute("href",ARTICLE_PATH);
    anchor.setAttribute("data-lw-full-navigation","true");
    replaceTrailingText(anchor,ARTICLE_TITLE);
    summary.textContent=ARTICLE_SUMMARY;
    anchor.addEventListener("click",function(event){
      if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){
        event.preventDefault();
        location.assign(ARTICLE_PATH);
      }
    });
    contract.grid.insertBefore(card,contract.retainedCard.nextSibling);
  }
  function applyPolicy(){
    installStyle();
    if(!(globalThis.CSS&&CSS.supports("selector(:has(*))"))) applyFallback();
    installSmallClaimsCard();
  }
  function queuePolicy(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(function(){queued=false;applyPolicy();});
  }
  function afterLoad(){
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        installStyle();
        if(!(globalThis.CSS&&CSS.supports("selector(:has(*))"))) applyFallback();
        setTimeout(function(){
          installSmallClaimsCard();
          var observer=new MutationObserver(queuePolicy);
          observer.observe(document.documentElement,{childList:true,subtree:true});
        },750);
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
