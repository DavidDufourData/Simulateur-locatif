import React, { useState, useMemo } from "react";

// ---- Design tokens ----
// Ink navy ledger aesthetic, brass accent, warm paper neutrals, mono figures.
const COLORS = {
  ink: "#10243E",
  inkSoft: "#1B3A5C",
  brass: "#C9A227",
  brassSoft: "#E4C766",
  paper: "#F7F5F0",
  card: "#EFEADE",
  cardAlt: "#E8E2D4",
  green: "#2E7D5B",
  red: "#A33B2E",
  line: "#D8D0BC",
};

function euros(n) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}
function pct(n) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " %";
}

function Field({ label, value, onChange, suffix, step = 1, min = 0, mono = true }) {
  // value/onChange here work with raw strings so the user can freely clear
  // the field (including the leading 0) before typing a new number.
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            if (e.target.value === "" || isNaN(parseFloat(e.target.value))) onChange("0");
          }}
          style={{ fontFamily: mono ? "'IBM Plex Mono', monospace" : "inherit" }}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

export default function App() {
  // Acquisition
  const [prixAchat, setPrixAchat] = useState("180000");
  const [fraisNotaire, setFraisNotaire] = useState("8");
  const [travaux, setTravaux] = useState("8000");
  const [apport, setApport] = useState("20000");

  // Crédit
  const [tauxCredit, setTauxCredit] = useState("3.6");
  const [dureeCredit, setDureeCredit] = useState("20");
  const [assuranceCredit, setAssuranceCredit] = useState("0.34");

  // Exploitation
  const [loyerMensuel, setLoyerMensuel] = useState("750");
  const [chargesCopro, setChargesCopro] = useState("80");
  const [taxeFonciere, setTaxeFonciere] = useState("1100");
  const [gestionLocative, setGestionLocative] = useState("0");
  const [vacanceLocative, setVacanceLocative] = useState("5");
  const [premium, setPremium] = useState(false);

  const calc = useMemo(() => {
    const prixAchatN = Number(prixAchat) || 0;
    const fraisNotaireN = Number(fraisNotaire) || 0;
    const travauxN = Number(travaux) || 0;
    const apportN = Number(apport) || 0;
    const tauxCreditN = Number(tauxCredit) || 0;
    const dureeCreditN = Number(dureeCredit) || 0;
    const assuranceCreditN = Number(assuranceCredit) || 0;
    const loyerMensuelN = Number(loyerMensuel) || 0;
    const chargesCoproN = Number(chargesCopro) || 0;
    const taxeFonciereN = Number(taxeFonciere) || 0;
    const gestionLocativeN = Number(gestionLocative) || 0;
    const vacanceLocativeN = Number(vacanceLocative) || 0;

    const coutTotal = prixAchatN * (1 + fraisNotaireN / 100) + travauxN;
    const montantEmprunte = Math.max(coutTotal - apportN, 0);

    const tauxMensuel = tauxCreditN / 100 / 12;
    const nMois = Math.max(dureeCreditN * 12, 1);
    const mensualiteCredit =
      tauxMensuel > 0
        ? (montantEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nMois))
        : montantEmprunte / nMois;
    const assuranceMensuelle = (montantEmprunte * (assuranceCreditN / 100)) / 12;
    const mensualiteTotale = mensualiteCredit + assuranceMensuelle;

    const loyerAnnuelBrut = loyerMensuelN * 12;
    const perteVacance = loyerAnnuelBrut * (vacanceLocativeN / 100);
    const fraisGestionAn = loyerAnnuelBrut * (gestionLocativeN / 100);
    const chargesAnnuelles =
      chargesCoproN * 12 + taxeFonciereN + fraisGestionAn + perteVacance;

    const loyerAnnuelNet = loyerAnnuelBrut - chargesAnnuelles;
    const rentabiliteBrute = coutTotal > 0 ? (loyerAnnuelBrut / coutTotal) * 100 : 0;
    const rentabiliteNette = coutTotal > 0 ? (loyerAnnuelNet / coutTotal) * 100 : 0;

    const cashflowMensuel =
      loyerMensuelN * (1 - vacanceLocativeN / 100) -
      chargesCoproN -
      fraisGestionAn / 12 -
      taxeFonciereN / 12 -
      mensualiteTotale;
    const cashflowAnnuel = cashflowMensuel * 12;

    return {
      coutTotal,
      montantEmprunte,
      mensualiteTotale,
      loyerAnnuelBrut,
      chargesAnnuelles,
      rentabiliteBrute,
      rentabiliteNette,
      cashflowMensuel,
      cashflowAnnuel,
    };
  }, [
    prixAchat, fraisNotaire, travaux, apport,
    tauxCredit, dureeCredit, assuranceCredit,
    loyerMensuel, chargesCopro, taxeFonciere, gestionLocative, vacanceLocative,
  ]);

  const statut = calc.cashflowMensuel >= 0 ? "AUTOFINANCÉ" : "EFFORT D'ÉPARGNE";
  const statutColor = calc.cashflowMensuel >= 0 ? COLORS.green : COLORS.red;

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: COLORS.paper, minHeight: "100vh", color: COLORS.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .field { display:flex; flex-direction:column; gap:6px; margin-bottom:16px; }
        .field-label { font-size:12px; letter-spacing:0.04em; text-transform:uppercase; color:${COLORS.inkSoft}; opacity:0.75; }
        .field-input { display:flex; align-items:center; border-bottom:1.5px solid ${COLORS.line}; transition: border-color 0.15s; }
        .field-input:focus-within { border-color: ${COLORS.brass}; }
        .field-input input { border:none; background:transparent; outline:none; font-size:17px; padding:6px 2px; width:100%; color:${COLORS.ink}; }
        .field-suffix { font-size:13px; color:${COLORS.inkSoft}; opacity:0.6; white-space:nowrap; padding-left:6px; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
        .ledger-row { display:flex; justify-content:space-between; align-items:baseline; padding:10px 0; border-bottom:1px dashed ${COLORS.line}; }
        .ledger-row:last-child { border-bottom:none; }
        .ledger-label { font-size:13px; color:${COLORS.inkSoft}; opacity:0.85; }
        .ledger-value { font-family:'IBM Plex Mono', monospace; font-size:15px; font-weight:500; }
        .section-title { font-family:'Newsreader', serif; font-style:italic; font-size:15px; color:${COLORS.brass}; letter-spacing:0.02em; margin: 0 0 14px 0; }
        .stamp { display:inline-block; border:2px solid; border-radius:3px; padding:6px 14px; font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; letter-spacing:0.08em; transform: rotate(-2deg); }
        .main-grid { display:grid; grid-template-columns: 1.2fr 1fr; gap:20px; }
        .sub-grid { display:grid; grid-template-columns: 1fr 1fr; gap:0 20px; }
        .premium-card { background:${COLORS.ink}; border-radius:10px; padding:20px; color:${COLORS.paper}; }
        .premium-lock-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
        .premium-badge { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.06em; background:rgba(255,255,255,0.08); color:${COLORS.brassSoft}; padding:4px 10px; border-radius:20px; }
        @media (max-width: 720px) {
          .main-grid { grid-template-columns: 1fr; }
          .hero-pad { padding: 36px 16px 48px !important; }
          .body-pad { padding: 0 16px !important; margin-top: -24px !important; }
          .card-pad { padding: 22px 18px 6px !important; }
        }
        @media (max-width: 420px) {
          .sub-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* HERO */}
      <header className="hero-pad" style={{ background: COLORS.ink, color: COLORS.paper, padding: "48px 24px 64px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.12em", color: COLORS.brassSoft, marginBottom: 10 }}>
            SIMULATEUR — RENTABILITÉ LOCATIVE
          </div>
          <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: "clamp(28px,7vw,52px)", margin: "0 0 8px 0", lineHeight: 1.1 }}>
            Votre cash-flow, au centime près.
          </h1>
          <p style={{ maxWidth: 560, color: "#B9C4D2", fontSize: 15, lineHeight: 1.5 }}>
            Renseignez votre projet d'investissement locatif et obtenez instantanément votre rentabilité brute, nette et l'effort d'épargne mensuel réel.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(26px,8vw,40px)", color: statutColor === COLORS.green ? "#7FD9AE" : "#E8998A" }}>
                {euros(calc.cashflowMensuel)}
              </div>
              <div style={{ fontSize: 12, color: "#8EA0B3", letterSpacing: "0.04em" }}>CASH-FLOW MENSUEL</div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(26px,8vw,40px)" }}>{pct(calc.rentabiliteNette)}</div>
              <div style={{ fontSize: 12, color: "#8EA0B3", letterSpacing: "0.04em" }}>RENDEMENT NET</div>
            </div>
            <div style={{ alignSelf: "center" }}>
              <span className="stamp" style={{ borderColor: statutColor, color: statutColor === COLORS.green ? "#7FD9AE" : "#E8998A" }}>
                {statut}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="main-grid body-pad" style={{ maxWidth: 980, margin: "-32px auto 60px", padding: "0 24px" }}>
        {/* Inputs */}
        <div className="card-pad" style={{ background: "#fff", borderRadius: 10, padding: "28px 28px 8px", boxShadow: "0 12px 32px rgba(16,36,62,0.10)" }}>
          <p className="section-title">Acquisition</p>
          <Field label="Prix d'achat" value={prixAchat} onChange={setPrixAchat} suffix="€" step={1000} />
          <Field label="Frais de notaire" value={fraisNotaire} onChange={setFraisNotaire} suffix="%" step={0.1} />
          <Field label="Travaux" value={travaux} onChange={setTravaux} suffix="€" step={500} />
          <Field label="Apport personnel" value={apport} onChange={setApport} suffix="€" step={1000} />

          <p className="section-title" style={{ marginTop: 24 }}>Crédit</p>
          <div className="sub-grid">
            <Field label="Taux d'intérêt" value={tauxCredit} onChange={setTauxCredit} suffix="%" step={0.05} />
            <Field label="Durée" value={dureeCredit} onChange={setDureeCredit} suffix="ans" step={1} />
          </div>
          <Field label="Assurance emprunteur" value={assuranceCredit} onChange={setAssuranceCredit} suffix="% / an" step={0.01} />

          <p className="section-title" style={{ marginTop: 24 }}>Exploitation</p>
          <Field label="Loyer mensuel (hors charges)" value={loyerMensuel} onChange={setLoyerMensuel} suffix="€" step={10} />
          <div className="sub-grid">
            <Field label="Charges copropriété" value={chargesCopro} onChange={setChargesCopro} suffix="€/mois" step={5} />
            <Field label="Taxe foncière" value={taxeFonciere} onChange={setTaxeFonciere} suffix="€/an" step={50} />
          </div>
          <div className="sub-grid">
            <Field label="Vacance locative" value={vacanceLocative} onChange={setVacanceLocative} suffix="%" step={1} />
            <Field label="Frais de gestion" value={gestionLocative} onChange={setGestionLocative} suffix="%" step={1} />
          </div>
        </div>

        {/* Ledger results */}
        <div>
          <div style={{ background: COLORS.cardAlt, borderRadius: 10, padding: "24px 24px 8px", marginBottom: 16 }}>
            <p className="section-title" style={{ color: COLORS.inkSoft }}>Grand livre</p>
            <div className="ledger-row"><span className="ledger-label">Coût total projet</span><span className="ledger-value">{euros(calc.coutTotal)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Montant emprunté</span><span className="ledger-value">{euros(calc.montantEmprunte)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Mensualité (crédit + assurance)</span><span className="ledger-value">{euros(calc.mensualiteTotale)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Loyer annuel brut</span><span className="ledger-value">{euros(calc.loyerAnnuelBrut)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Charges annuelles totales</span><span className="ledger-value">{euros(calc.chargesAnnuelles)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Rentabilité brute</span><span className="ledger-value" style={{color: COLORS.brass}}>{pct(calc.rentabiliteBrute)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Rentabilité nette</span><span className="ledger-value" style={{color: COLORS.brass}}>{pct(calc.rentabiliteNette)}</span></div>
            <div className="ledger-row"><span className="ledger-label">Cash-flow annuel</span><span className="ledger-value" style={{color: statutColor}}>{euros(calc.cashflowAnnuel)}</span></div>
          </div>

          {/* Premium teaser — this is where a subscription paywall would live */}
          <div className="premium-card">
            <div className="premium-lock-row">
              <span className="premium-badge">{premium ? "✓ DÉBLOQUÉ" : "🔒 PREMIUM"}</span>
            </div>
            <p className="section-title" style={{ margin: "0 0 8px 0" }}>Module fiscal</p>
            {premium ? (
              <p style={{ fontSize: 13, color: "#D9E0E8", lineHeight: 1.6, margin: "0 0 14px 0" }}>
                Comparatif LMNP réel vs micro-BIC : économie d'impôt estimée, amortissement du bien sur 20 ans, et impact sur l'IFI. (Contenu de démonstration.)
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#8EA0B3", lineHeight: 1.6, margin: "0 0 14px 0" }}>
                Comparatif LMNP réel vs micro-BIC, impact IFI, et amortissement du bien sur 20 ans.
              </p>
            )}
            <button
              onClick={() => setPremium(!premium)}
              style={{ background: COLORS.brass, color: COLORS.ink, border: "none", borderRadius: 6, padding: "8px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {premium ? "Verrouiller (démo)" : "Débloquer (démo)"}
            </button>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "0 24px 40px", fontSize: 12, color: COLORS.inkSoft, opacity: 0.55 }}>
        Simulation indicative — ne remplace pas un conseil professionnel.
      </footer>
    </div>
  );
}
