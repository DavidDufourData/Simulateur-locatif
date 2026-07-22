import React, { useEffect, useMemo, useState } from "react";

const COLORS = {
  ink: "#10243E",
  inkSoft: "#1B3A5C",
  brass: "#C9A227",
  brassSoft: "#E4C766",
  paper: "#F7F5F0",
  cardAlt: "#E8E2D4",
  green: "#2E7D5B",
  red: "#A33B2E",
  line: "#D8D0BC",
};

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/REMPLACER_PAR_VOTRE_LIEN";

const number = (value) => Number(value) || 0;

function euros(value, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} €`;
}

function pct(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

function Field({ label, value, onChange, suffix, step = 1, min = 0 }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            if (event.target.value === "" || Number.isNaN(Number(event.target.value))) {
              onChange("0");
            }
          }}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
    </label>
  );
}

function ResultRow({ label, value, accent, dark = false, strong = false }) {
  return (
    <div className={`ledger-row${strong ? " ledger-row-strong" : ""}`}>
      <span className="ledger-label" style={dark ? { color: "#C6D0DC" } : undefined}>
        {label}
      </span>
      <span className="ledger-value" style={{ color: accent || (dark ? COLORS.paper : COLORS.ink) }}>
        {value}
      </span>
    </div>
  );
}

function PremiumFeature({ icon, title, text }) {
  return (
    <div className="premium-feature">
      <span className="premium-feature-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [prixAchat, setPrixAchat] = useState("180000");
  const [fraisNotaire, setFraisNotaire] = useState("8");
  const [travaux, setTravaux] = useState("8000");
  const [apport, setApport] = useState("20000");

  const [tauxCredit, setTauxCredit] = useState("3.6");
  const [dureeCredit, setDureeCredit] = useState("20");
  const [assuranceCredit, setAssuranceCredit] = useState("0.34");

  const [loyerMensuel, setLoyerMensuel] = useState("750");
  const [chargesCopro, setChargesCopro] = useState("80");
  const [taxeFonciere, setTaxeFonciere] = useState("1100");
  const [gestionLocative, setGestionLocative] = useState("0");
  const [vacanceLocative, setVacanceLocative] = useState("5");
  const [tmi, setTmi] = useState("30");
  const [premium, setPremium] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.localStorage.getItem("premium_unlocked") === "true") {
      setPremium(true);
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Vérification impossible");
        return response.json();
      })
      .then((data) => {
        if (data?.paid) {
          window.localStorage.setItem("premium_unlocked", "true");
          setPremium(true);
          setPaymentError("");
        } else {
          setPaymentError("Le paiement n’a pas pu être confirmé.");
        }
      })
      .catch(() => setPaymentError("Le paiement n’a pas pu être vérifié. Réessayez dans quelques instants."))
      .finally(() => window.history.replaceState({}, "", window.location.pathname));
  }, []);

  const calc = useMemo(() => {
    const prix = number(prixAchat);
    const notaire = number(fraisNotaire);
    const travauxN = number(travaux);
    const apportN = number(apport);
    const taux = number(tauxCredit);
    const duree = number(dureeCredit);
    const assurance = number(assuranceCredit);
    const loyer = number(loyerMensuel);
    const copro = number(chargesCopro);
    const foncier = number(taxeFonciere);
    const gestion = number(gestionLocative);
    const vacance = number(vacanceLocative);
    const tmiN = number(tmi);

    const fraisNotaireEuros = prix * (notaire / 100);
    const coutTotal = prix + fraisNotaireEuros + travauxN;
    const montantEmprunte = Math.max(coutTotal - apportN, 0);

    const tauxMensuel = taux / 100 / 12;
    const nombreMois = Math.max(duree * 12, 1);
    const mensualiteHorsAssurance = tauxMensuel > 0
      ? (montantEmprunte * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMois))
      : montantEmprunte / nombreMois;
    const assuranceMensuelle = (montantEmprunte * (assurance / 100)) / 12;
    const mensualiteTotale = mensualiteHorsAssurance + assuranceMensuelle;

    const loyerAnnuelBrut = loyer * 12;
    const perteVacance = loyerAnnuelBrut * (vacance / 100);
    const fraisGestionAn = loyerAnnuelBrut * (gestion / 100);
    const chargesAnnuelles = copro * 12 + foncier + fraisGestionAn + perteVacance;
    const revenuNetAvantCredit = loyerAnnuelBrut - chargesAnnuelles;

    const rentabiliteBrute = coutTotal > 0 ? (loyerAnnuelBrut / coutTotal) * 100 : 0;
    const rentabiliteNette = coutTotal > 0 ? (revenuNetAvantCredit / coutTotal) * 100 : 0;
    const cashflowMensuel = revenuNetAvantCredit / 12 - mensualiteTotale;
    const cashflowAnnuel = cashflowMensuel * 12;

    const tauxFiscal = tmiN / 100 + 0.172;
    const baseMicroBic = loyerAnnuelBrut * 0.5;
    const impotMicroBic = baseMicroBic * tauxFiscal;

    const interetsPremiereAnneeApprox = montantEmprunte * (taux / 100);
    const valeurAmortissable = (prix + travauxN + fraisNotaireEuros) * 0.85;
    const amortissementAnnuel = valeurAmortissable / 25;
    const baseReel = Math.max(
      0,
      loyerAnnuelBrut - chargesAnnuelles - interetsPremiereAnneeApprox - amortissementAnnuel
    );
    const impotReel = baseReel * tauxFiscal;
    const economieAnnuelle = impotMicroBic - impotReel;

    const cashflowApresImpotMicro = cashflowMensuel - impotMicroBic / 12;
    const cashflowApresImpotReel = cashflowMensuel - impotReel / 12;

    const loyerPrudent = loyer * 0.95;
    const vacancePrudente = Math.min(vacance + 2, 100);
    const revenuPrudent =
      loyerPrudent * 12 * (1 - vacancePrudente / 100)
      - copro * 12
      - foncier
      - loyerPrudent * 12 * (gestion / 100);
    const cashflowPrudent = revenuPrudent / 12 - mensualiteTotale;

    const interetsTotauxApprox = Math.max(mensualiteHorsAssurance * nombreMois - montantEmprunte, 0);
    const coutAssuranceTotal = assuranceMensuelle * nombreMois;

    return {
      fraisNotaireEuros,
      coutTotal,
      montantEmprunte,
      mensualiteHorsAssurance,
      assuranceMensuelle,
      mensualiteTotale,
      loyerAnnuelBrut,
      chargesAnnuelles,
      rentabiliteBrute,
      rentabiliteNette,
      cashflowMensuel,
      cashflowAnnuel,
      impotMicroBic,
      impotReel,
      economieAnnuelle,
      amortissementAnnuel,
      cashflowApresImpotMicro,
      cashflowApresImpotReel,
      cashflowPrudent,
      interetsTotauxApprox,
      coutAssuranceTotal,
    };
  }, [
    prixAchat, fraisNotaire, travaux, apport,
    tauxCredit, dureeCredit, assuranceCredit,
    loyerMensuel, chargesCopro, taxeFonciere, gestionLocative, vacanceLocative, tmi,
  ]);

  const autofinance = calc.cashflowMensuel >= 0;
  const statut = autofinance ? "AUTOFINANCÉ" : "EFFORT D’ÉPARGNE";
  const statutColor = autofinance ? COLORS.green : COLORS.red;
  const statutLight = autofinance ? "#7FD9AE" : "#E8998A";
  const stripeConfigured = !STRIPE_PAYMENT_LINK.includes("REMPLACER");

  const recommendation = calc.cashflowApresImpotReel >= 0
    ? "Le projet reste autofinancé après l’estimation fiscale au régime réel."
    : calc.cashflowMensuel >= 0
      ? "Le projet est autofinancé avant impôt, mais une marge de sécurité supplémentaire est conseillée."
      : "Le projet demande un effort d’épargne mensuel : testez un prix d’achat ou un apport différent.";

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        :root { color-scheme: light; }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: ${COLORS.paper}; }
        button, input, select { font: inherit; }
        .app-shell { min-height: 100vh; background: ${COLORS.paper}; color: ${COLORS.ink}; font-family: 'IBM Plex Sans', sans-serif; }
        .hero { background: ${COLORS.ink}; color: ${COLORS.paper}; padding: 48px 24px 72px; }
        .container { width: min(980px, 100%); margin: 0 auto; }
        .eyebrow { font-family:'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .12em; color: ${COLORS.brassSoft}; margin-bottom: 10px; }
        .hero h1 { font-family:'Newsreader', serif; font-weight:500; font-size:clamp(32px,7vw,54px); margin:0 0 10px; line-height:1.04; }
        .hero-copy { max-width: 620px; color:#B9C4D2; font-size:15px; line-height:1.6; margin:0; }
        .hero-results { margin-top:30px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; align-items:end; }
        .hero-result { min-width:0; }
        .hero-number { font-family:'IBM Plex Mono',monospace; font-size:clamp(27px,6vw,40px); line-height:1.15; overflow-wrap:anywhere; }
        .hero-label { margin-top:4px; font-size:11px; color:#8EA0B3; letter-spacing:.05em; }
        .stamp { display:inline-block; border:2px solid; border-radius:4px; padding:7px 12px; font-family:'IBM Plex Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.07em; transform:rotate(-2deg); }
        .main-grid { width:min(980px,100%); margin:-36px auto 60px; padding:0 24px; display:grid; grid-template-columns:minmax(0,1.18fr) minmax(320px,1fr); gap:20px; align-items:start; }
        .form-card, .results-card { border-radius:12px; box-shadow:0 12px 32px rgba(16,36,62,.10); }
        .form-card { background:#fff; padding:28px 28px 10px; }
        .results-card { background:${COLORS.cardAlt}; padding:24px 24px 10px; margin-bottom:16px; }
        .section-title { font-family:'Newsreader',serif; font-style:italic; font-size:16px; color:${COLORS.brass}; letter-spacing:.02em; margin:0 0 15px; }
        .field { display:flex; flex-direction:column; gap:6px; margin-bottom:17px; }
        .field-label { font-size:11px; letter-spacing:.055em; text-transform:uppercase; color:${COLORS.inkSoft}; opacity:.78; }
        .field-input { min-height:39px; display:flex; align-items:center; border-bottom:1.5px solid ${COLORS.line}; transition:border-color .15s, background .15s; }
        .field-input:focus-within { border-color:${COLORS.brass}; background:#FCFAF5; }
        .field-input input, .field-input select { min-width:0; width:100%; border:0; background:transparent; outline:0; color:${COLORS.ink}; font-family:'IBM Plex Mono',monospace; font-size:16px; padding:7px 2px; }
        .field-suffix { flex:none; padding-left:7px; color:${COLORS.inkSoft}; opacity:.62; font-size:12px; white-space:nowrap; }
        .sub-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 20px; }
        .ledger-row { display:flex; justify-content:space-between; gap:18px; align-items:baseline; padding:11px 0; border-bottom:1px dashed ${COLORS.line}; }
        .ledger-row:last-child { border-bottom:0; }
        .ledger-row-strong { padding-top:14px; }
        .ledger-label { min-width:0; color:${COLORS.inkSoft}; opacity:.88; font-size:13px; line-height:1.35; }
        .ledger-value { flex:none; font-family:'IBM Plex Mono',monospace; font-size:14px; font-weight:600; text-align:right; }
        .premium-card { position:relative; overflow:hidden; border-radius:12px; padding:22px; color:${COLORS.paper}; background:linear-gradient(145deg,${COLORS.ink} 0%,#183958 100%); box-shadow:0 12px 28px rgba(16,36,62,.16); }
        .premium-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:10px; }
        .premium-badge { display:inline-flex; align-items:center; min-height:25px; border-radius:999px; padding:4px 10px; background:rgba(255,255,255,.09); color:${COLORS.brassSoft}; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.07em; white-space:nowrap; }
        .premium-card h2 { margin:0; max-width:500px; font-family:'Newsreader',serif; font-size:clamp(24px,5vw,32px); line-height:1.08; font-weight:500; }
        .premium-lead { margin:10px 0 16px; color:#C6D0DC; font-size:13px; line-height:1.55; }
        .saving-box { margin:15px 0; border:1px solid rgba(228,199,102,.45); border-radius:9px; padding:14px; background:rgba(201,162,39,.08); }
        .saving-label { display:block; color:#C6D0DC; font-size:11px; letter-spacing:.04em; text-transform:uppercase; }
        .saving-value { display:block; margin-top:4px; color:#7FD9AE; font-family:'IBM Plex Mono',monospace; font-size:clamp(24px,7vw,34px); font-weight:600; }
        .premium-features { display:grid; gap:10px; margin:17px 0; }
        .premium-feature { display:grid; grid-template-columns:26px 1fr; gap:9px; align-items:start; }
        .premium-feature-icon { display:grid; place-items:center; width:24px; height:24px; border-radius:50%; background:rgba(201,162,39,.14); color:${COLORS.brassSoft}; font-size:12px; }
        .premium-feature strong { display:block; font-size:13px; font-weight:600; }
        .premium-feature span { display:block; margin-top:2px; color:#AEBBC9; font-size:11px; line-height:1.45; }
        .locked-preview { position:relative; margin:16px 0 14px; border-radius:9px; padding:5px 14px; background:rgba(255,255,255,.055); }
        .locked-preview .ledger-value { filter:blur(5px); user-select:none; }
        .locked-overlay { position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; }
        .locked-overlay span { padding:7px 11px; border:1px solid rgba(255,255,255,.16); border-radius:999px; background:rgba(16,36,62,.94); color:${COLORS.brassSoft}; font-family:'IBM Plex Mono',monospace; font-size:10px; }
        .cta { width:100%; display:flex; justify-content:center; align-items:center; min-height:47px; border:0; border-radius:8px; padding:12px 16px; background:${COLORS.brass}; color:${COLORS.ink}; font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:700; text-align:center; text-decoration:none; cursor:pointer; transition:transform .15s, filter .15s; }
        .cta:hover { transform:translateY(-1px); filter:brightness(1.05); }
        .cta-disabled { opacity:.65; cursor:not-allowed; }
        .premium-note { margin:10px 0 0; text-align:center; color:#92A3B5; font-size:10px; line-height:1.45; }
        .premium-results-title { margin:18px 0 4px; color:${COLORS.brassSoft}; font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.06em; }
        .recommendation { margin-top:14px; padding:13px; border-left:3px solid ${COLORS.brass}; background:rgba(255,255,255,.06); color:#D6DEE7; font-size:12px; line-height:1.55; }
        .alert { margin:0 0 14px; border-radius:7px; padding:10px 12px; background:#FDECEA; color:${COLORS.red}; font-size:12px; }
        .footer { padding:0 24px 42px; text-align:center; color:${COLORS.inkSoft}; opacity:.62; font-size:11px; line-height:1.55; }
        @media (max-width:760px) {
          .hero { padding:36px 16px 60px; }
          .hero-results { grid-template-columns:1fr 1fr; gap:18px 12px; }
          .hero-status { grid-column:1 / -1; }
          .main-grid { margin-top:-28px; padding:0 14px; grid-template-columns:1fr; gap:16px; }
          .form-card { padding:22px 18px 8px; }
          .results-card { padding:21px 18px 8px; }
          .premium-card { padding:20px 17px; }
          .premium-top { flex-direction:column-reverse; }
        }
        @media (max-width:430px) {
          .sub-grid { grid-template-columns:1fr; }
          .hero-number { font-size:26px; }
          .ledger-row { gap:10px; }
          .ledger-label { font-size:12px; }
          .ledger-value { font-size:13px; }
        }
      `}</style>

      <header className="hero">
        <div className="container">
          <div className="eyebrow">SIMULATEUR — RENTABILITÉ LOCATIVE</div>
          <h1>Votre projet est-il vraiment rentable&nbsp;?</h1>
          <p className="hero-copy">
            Calculez immédiatement votre rendement, votre mensualité et votre cash-flow réel. Ajustez chaque hypothèse pour tester votre investissement avant de vous engager.
          </p>

          <div className="hero-results" aria-live="polite">
            <div className="hero-result">
              <div className="hero-number" style={{ color: statutLight }}>{euros(calc.cashflowMensuel)}</div>
              <div className="hero-label">CASH-FLOW MENSUEL</div>
            </div>
            <div className="hero-result">
              <div className="hero-number">{pct(calc.rentabiliteNette)}</div>
              <div className="hero-label">RENDEMENT NET</div>
            </div>
            <div className="hero-status">
              <span className="stamp" style={{ borderColor: statutColor, color: statutLight }}>{statut}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-grid">
        <section className="form-card" aria-label="Paramètres de la simulation">
          <p className="section-title">Acquisition</p>
          <Field label="Prix d’achat" value={prixAchat} onChange={setPrixAchat} suffix="€" step={1000} />
          <Field label="Frais de notaire" value={fraisNotaire} onChange={setFraisNotaire} suffix="%" step={0.1} />
          <Field label="Travaux" value={travaux} onChange={setTravaux} suffix="€" step={500} />
          <Field label="Apport personnel" value={apport} onChange={setApport} suffix="€" step={1000} />

          <p className="section-title" style={{ marginTop:24 }}>Crédit</p>
          <div className="sub-grid">
            <Field label="Taux d’intérêt" value={tauxCredit} onChange={setTauxCredit} suffix="%" step={0.05} />
            <Field label="Durée" value={dureeCredit} onChange={setDureeCredit} suffix="ans" step={1} />
          </div>
          <Field label="Assurance emprunteur" value={assuranceCredit} onChange={setAssuranceCredit} suffix="% / an" step={0.01} />

          <p className="section-title" style={{ marginTop:24 }}>Exploitation</p>
          <Field label="Loyer mensuel hors charges" value={loyerMensuel} onChange={setLoyerMensuel} suffix="€" step={10} />
          <div className="sub-grid">
            <Field label="Charges de copropriété" value={chargesCopro} onChange={setChargesCopro} suffix="€/mois" step={5} />
            <Field label="Taxe foncière" value={taxeFonciere} onChange={setTaxeFonciere} suffix="€/an" step={50} />
          </div>
          <div className="sub-grid">
            <Field label="Vacance locative" value={vacanceLocative} onChange={setVacanceLocative} suffix="%" step={1} />
            <Field label="Gestion locative" value={gestionLocative} onChange={setGestionLocative} suffix="%" step={1} />
          </div>

          <p className="section-title" style={{ marginTop:24 }}>Fiscalité</p>
          <label className="field">
            <span className="field-label">Tranche marginale d’imposition</span>
            <div className="field-input">
              <select value={tmi} onChange={(event) => setTmi(event.target.value)}>
                <option value="0">0 %</option>
                <option value="11">11 %</option>
                <option value="30">30 %</option>
                <option value="41">41 %</option>
                <option value="45">45 %</option>
              </select>
            </div>
          </label>
        </section>

        <aside>
          <section className="results-card" aria-label="Résultats principaux">
            <p className="section-title" style={{ color:COLORS.inkSoft }}>Synthèse du projet</p>
            <ResultRow label="Coût total du projet" value={euros(calc.coutTotal)} />
            <ResultRow label="Montant emprunté" value={euros(calc.montantEmprunte)} />
            <ResultRow label="Mensualité crédit + assurance" value={euros(calc.mensualiteTotale)} />
            <ResultRow label="Loyers annuels bruts" value={euros(calc.loyerAnnuelBrut)} />
            <ResultRow label="Charges annuelles estimées" value={euros(calc.chargesAnnuelles)} />
            <ResultRow label="Rentabilité brute" value={pct(calc.rentabiliteBrute)} accent={COLORS.brass} />
            <ResultRow label="Rentabilité nette" value={pct(calc.rentabiliteNette)} accent={COLORS.brass} />
            <ResultRow label="Cash-flow annuel" value={euros(calc.cashflowAnnuel)} accent={statutColor} strong />
          </section>

          {paymentError && <div className="alert" role="alert">{paymentError}</div>}

          <section className="premium-card" id="premium" aria-label="Analyse premium">
            <div className="premium-top">
              <h2>{premium ? "Votre analyse complète" : "Découvrez la rentabilité après impôts"}</h2>
              <span className="premium-badge">{premium ? "✓ ACCÈS DÉBLOQUÉ" : "🔒 ANALYSE PREMIUM"}</span>
            </div>

            {premium ? (
              <>
                <p className="premium-lead">Les chiffres ci-dessous complètent la simulation de base et mettent en évidence les principaux risques du projet.</p>
                <div className="premium-results-title">COMPARAISON FISCALE ESTIMATIVE</div>
                <ResultRow dark label="Impôt annuel au micro-BIC" value={euros(calc.impotMicroBic)} />
                <ResultRow dark label="Impôt annuel au régime réel" value={euros(calc.impotReel)} />
                <ResultRow dark label="Amortissement annuel estimé" value={euros(calc.amortissementAnnuel)} />
                <ResultRow dark strong label="Économie fiscale potentielle" value={euros(calc.economieAnnuelle)} accent={calc.economieAnnuelle >= 0 ? "#7FD9AE" : "#E8998A"} />

                <div className="premium-results-title">CASH-FLOW APRÈS IMPÔTS</div>
                <ResultRow dark label="Avec le micro-BIC" value={euros(calc.cashflowApresImpotMicro)} accent={calc.cashflowApresImpotMicro >= 0 ? "#7FD9AE" : "#E8998A"} />
                <ResultRow dark label="Avec le régime réel" value={euros(calc.cashflowApresImpotReel)} accent={calc.cashflowApresImpotReel >= 0 ? "#7FD9AE" : "#E8998A"} />

                <div className="premium-results-title">RISQUE ET FINANCEMENT</div>
                <ResultRow dark label="Scénario prudent : loyer −5 %, vacance +2 pts" value={euros(calc.cashflowPrudent)} accent={calc.cashflowPrudent >= 0 ? "#7FD9AE" : "#E8998A"} />
                <ResultRow dark label="Intérêts totaux approximatifs" value={euros(calc.interetsTotauxApprox)} />
                <ResultRow dark label="Coût total approximatif de l’assurance" value={euros(calc.coutAssuranceTotal)} />

                <div className="recommendation"><strong>Lecture du résultat :</strong> {recommendation}</div>
                <p className="premium-note">Estimation simplifiée, notamment pour les intérêts et amortissements. Elle ne remplace pas une étude comptable, fiscale ou bancaire personnalisée.</p>
              </>
            ) : (
              <>
                <p className="premium-lead">
                  La rentabilité brute ne suffit pas. Débloquez les résultats qui montrent ce que le projet peut réellement vous laisser après fiscalité et en cas d’imprévu.
                </p>

                <div className="saving-box">
                  <span className="saving-label">Économie fiscale potentielle estimée</span>
                  <span className="saving-value">{euros(Math.max(calc.economieAnnuelle, 0))} / an</span>
                </div>

                <div className="premium-features">
                  <PremiumFeature icon="€" title="Comparaison micro-BIC / régime réel" text="Visualisez l’impôt estimé dans les deux régimes." />
                  <PremiumFeature icon="↗" title="Cash-flow après impôts" text="Découvrez ce qu’il vous reste réellement chaque mois." />
                  <PremiumFeature icon="◫" title="Scénario prudent" text="Testez automatiquement une baisse de loyer et davantage de vacance." />
                  <PremiumFeature icon="%" title="Coût du financement" text="Estimez les intérêts et l’assurance sur toute la durée du prêt." />
                  <PremiumFeature icon="✓" title="Lecture personnalisée" text="Obtenez une conclusion immédiate sur l’équilibre du projet." />
                </div>

                <div className="locked-preview" aria-hidden="true">
                  <ResultRow dark label="Cash-flow après impôts" value={euros(calc.cashflowApresImpotReel)} />
                  <ResultRow dark label="Scénario prudent" value={euros(calc.cashflowPrudent)} />
                  <div className="locked-overlay"><span>🔒 Résultats masqués</span></div>
                </div>

                {stripeConfigured ? (
                  <a className="cta" href={STRIPE_PAYMENT_LINK}>Débloquer l’analyse complète — 4,99 € / mois</a>
                ) : (
                  <button className="cta cta-disabled" type="button" disabled>Configurer le lien Stripe pour activer le paiement</button>
                )}
                <p className="premium-note">Accès mémorisé sur cet appareil après confirmation du paiement.</p>
              </>
            )}
          </section>
        </aside>
      </main>

      <footer className="footer">
        Simulation indicative fondée sur les informations saisies. Les règles fiscales et la situation de chaque investisseur peuvent modifier les résultats.
      </footer>
    </div>
  );
}
