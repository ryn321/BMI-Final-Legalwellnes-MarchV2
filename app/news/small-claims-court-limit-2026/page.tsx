import type { CSSProperties } from "react";

export const metadata = {
  title: "Small Claims Court Limit Increased to R30 000 | Legal Wellness",
  description: "A sourced overview of South Africa's R30 000 Small Claims Court limit, effective 1 August 2026.",
};

const colours = {
  background: "#061037",
  panel: "#0d1b4f",
  border: "#25376d",
  gold: "#d4af37",
  text: "#f8fafc",
  muted: "#cbd5e1",
};

const pageStyle: CSSProperties = {
  background: colours.background,
  color: colours.text,
  fontFamily: "Arial, Helvetica, sans-serif",
  lineHeight: 1.7,
  minHeight: "100vh",
};

const linkStyle: CSSProperties = {
  color: colours.gold,
  fontWeight: 700,
};

const headingStyle: CSSProperties = {
  color: colours.gold,
  lineHeight: 1.2,
};

const panelStyle: CSSProperties = {
  background: colours.panel,
  border: `1px solid ${colours.border}`,
  borderRadius: 18,
  padding: "clamp(22px, 4vw, 44px)",
};

export default function SmallClaimsCourtArticle() {
  return (
    <div style={pageStyle}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a:focus-visible { outline: 3px solid #d4af37; outline-offset: 4px; border-radius: 4px; }
        .lw-nav { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; }
        .lw-article h2 { margin-top: 34px; }
        .lw-article li { margin-bottom: 9px; }
        @media (max-width: 640px) {
          .lw-header-inner { align-items: flex-start !important; flex-direction: column; }
          .lw-nav { gap: 12px; }
        }
      `}</style>

      <header style={{ borderBottom: `1px solid ${colours.border}`, background: "#081443" }}>
        <div className="lw-header-inner" style={{ margin: "0 auto", maxWidth: 1120, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 22 }}>
          <a href="/" aria-label="Legal Wellness home" style={{ display: "inline-flex", alignItems: "center", gap: 14, color: colours.text, textDecoration: "none", fontWeight: 800 }}>
            <img src="/assets/LW_LOGO_FINAL_02_v2.png" alt="Legal Wellness logo" width="72" height="72" style={{ objectFit: "contain" }} />
            <span>Legal Wellness</span>
          </a>
          <nav className="lw-nav" aria-label="Main navigation">
            <a href="/" style={linkStyle}>Home</a>
            <a href="/services" style={linkStyle}>Services</a>
            <a href="/news" style={linkStyle}>Legal Updates</a>
            <a href="/contact" style={linkStyle}>Contact</a>
          </nav>
        </div>
      </header>

      <main data-lw-local-article="small-claims-2026" style={{ margin: "0 auto", maxWidth: 920, padding: "clamp(36px, 7vw, 84px) 20px" }}>
        <article className="lw-article" style={panelStyle}>
          <a href="/news" style={linkStyle}>← Back to Legal Updates</a>
          <p style={{ color: colours.gold, fontWeight: 800, letterSpacing: "0.08em", marginTop: 30, textTransform: "uppercase" }}>Civil Claims</p>
          <h1 style={{ ...headingStyle, fontSize: "clamp(2rem, 5vw, 3.5rem)", marginBottom: 18 }}>Small Claims Court Limit Increased to R30 000</h1>
          <p style={{ color: colours.muted }}><strong>Published and reviewed:</strong> 17 September 2026 · <strong>By:</strong> Legal Wellness</p>

          <p>
            South Africa&apos;s Small Claims Court monetary limit increased from R20 000 to <strong>R30 000</strong> with effect from <strong>1 August 2026</strong>. The change allows more qualifying everyday civil disputes to use the Small Claims Court process.
          </p>

          <h2 style={headingStyle}>What the Small Claims Court is for</h2>
          <p>
            Small Claims Courts provide a simpler forum for certain civil disputes. Depending on the facts and the Small Claims Courts Act, examples may include unpaid loans or debts, faulty goods, incomplete services, certain vehicle-related damages and qualifying claims arising from credit agreements.
          </p>
          <p>
            Representation by an attorney or advocate is not allowed at the hearing. You may obtain legal advice beforehand at your own cost, and Small Claims Court clerks assist members of the public free of charge.
          </p>

          <h2 style={headingStyle}>The basic process</h2>
          <ol>
            <li>Contact the person or organisation involved and ask them to settle the dispute.</li>
            <li>If the matter is not resolved, send a written letter of demand setting out the facts and the amount claimed.</li>
            <li>The official Justice guidance allows <strong>14 days</strong> after receipt of the demand for the claim to be settled.</li>
            <li>If it remains unpaid, approach the Small Claims Court clerk at the nearest Magistrate&apos;s Court with the demand, proof that it was delivered, supporting agreements or documents, and the other party&apos;s contact details.</li>
          </ol>

          <h2 style={headingStyle}>Who may claim and important exclusions</h2>
          <ul>
            <li>Individuals may institute claims; juristic persons such as companies, close corporations and associations may not institute a claim.</li>
            <li>A person under 18 must be assisted by a parent or legal guardian.</li>
            <li>Claims cannot be instituted against the State or municipalities/local government in the Small Claims Court.</li>
            <li>Excluded matters include specified defamation-related damages, dissolution of marriage, validity of a will, certain personal-status matters and some claims for specific performance.</li>
          </ul>
          <p>
            The official guidance says that where a claim exceeds R30 000, a claimant may institute a claim for a lesser amount. Ask the clerk or obtain advice before deciding how to proceed in your circumstances.
          </p>

          <aside style={{ marginTop: 34, padding: 22, borderLeft: `4px solid ${colours.gold}`, background: "#091746" }}>
            <strong>General information:</strong> This article was reviewed on 17 September 2026. It provides general information and is not legal advice. Rules, forms and individual circumstances may affect whether a matter can proceed in the Small Claims Court.
          </aside>

          <h2 style={headingStyle}>Official sources</h2>
          <ul>
            <li><a href="https://justice.gov.za/scc/scc.htm" target="_blank" rel="noopener noreferrer" style={linkStyle}>Official Small Claims Court guidance</a></li>
            <li><a href="https://justice.gov.za/legislation/notices/2026/20260720-gg55038gon7717-SCC-Amount-Increase-R30000.pdf" target="_blank" rel="noopener noreferrer" style={linkStyle}>Government Gazette 55038, Notice 7717</a></li>
            <li><a href="https://www.justice.gov.za/m_statements/2026/20260722-SCC-Monetary-Jurisdiction-R30000.html" target="_blank" rel="noopener noreferrer" style={linkStyle}>Justice Ministry announcement</a></li>
            <li><a href="https://justice.gov.za/scc/scc_info.htm" target="_blank" rel="noopener noreferrer" style={linkStyle}>Small Claims Court FAQ</a></li>
          </ul>

          <p style={{ marginTop: 36, color: colours.muted }}>
            For assistance with a possible claim, contact the clerk at your nearest Magistrate&apos;s Court or contact Legal Wellness at <a href="mailto:client@legalwellness.co.za" style={linkStyle}>client@legalwellness.co.za</a> or <a href="tel:0871140387" style={linkStyle}>087 114 0387</a>.
          </p>
        </article>
      </main>

      <footer style={{ borderTop: `1px solid ${colours.border}`, color: colours.muted, padding: "28px 20px", textAlign: "center" }}>
        © 2026 Legal Wellness. Dignity, Integrity, and Excellence.
      </footer>
    </div>
  );
}
