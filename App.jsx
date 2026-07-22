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

// Remplacez cette valeur par votre vrai lien Stripe (Payment Link) une fois créé.
// Voir /api/verify-session.js pour la vérification serveur du paiement.
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/REMPLACER_PAR_VOTRE_LIEN";

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
  const [tmi, setTmi] = useState("30");
  const [tauxAppreciation, setTauxAppreciation] = useState("1.5");
  const [anneeRevente, setAnneeRevente] = useState("10");
  const [premium, setPremium] = useState(false);

  // Check on load whether this browser already unlocked premium
  // (set after a verified Stripe payment — see /api/verify-session.js)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("premium_unlocked");
    if (stored === "true") setPremium(true);

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.paid) {
            window.localStorage.setItem("premium_unlocked", "true");
            setPremium(true);
          }
          // Clean the URL so a refresh doesn't re-trigger the check
          window.history.replaceState({}, "", window.location.pathname);
        })
        .catch(() => {
          window.history.replaceState({}, "", window.location.pathname);
        });
    }
  }, []);

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

    // --- Module fiscal : LMNP réel vs micro-BIC ---
    const tmiN = Number(tmi) || 0;
    const tauxImposition = tmiN / 100 + 0.172; // TMI + prélèvements sociaux

    // Micro-BIC : abattement forfaitaire de 50 %
    const baseMicroBic = loyerAnnuelBrut * 0.5;
    const impotMicroBic = baseMicroBic * tauxImposition;

    // Régime réel : charges réelles + intérêts d'emprunt + amortissement
    // Amortissement estimé sur la valeur du bien hors terrain (~85 %) sur 25 ans
    const interetsAnnuelsApprox = montantEmprunte * (tauxCreditN / 100);
    const amortissementAnnuel = (coutTotal * 0.85) / 25;
    const baseReel = Math.max(
      0,
      loyerAnnuelBrut - chargesAnnuelles - interetsAnnuelsApprox - amortissementAnnuel
    );
    const impotReel = baseReel * tauxImposition;
    const economieAnnuelle = impotMicroBic - impotReel;

    // --- Tableau d'amortissement du prêt (solde restant dû en fin d'année) ---
    const tauxAppreciationN = Number(tauxAppreciation) || 0;
    const anneeReventeN = Math.max(Number(anneeRevente) || 0, 1);

    const amortSchedule = [];
    let solde = montantEmprunte;
    let interetsCumulesAnnee = 0;
    let capitalCumuleAnnee = 0;
    for (let m = 1; m <= nMois; m++) {
      const interet = solde * tauxMensuel;
      const capitalRembourse = mensualiteCredit - interet;
      solde = Math.max(solde - capitalRembourse, 0);
      interetsCumulesAnnee += interet;
      capitalCumuleAnnee += capitalRembourse;
      if (m % 12 === 0) {
        amortSchedule.push({
          annee: m / 12,
          interets: interetsCumulesAnnee,
          capital: capitalCumuleAnnee,
          soldeRestant: solde,
        });
        interetsCumulesAnnee = 0;
        capitalCumuleAnnee = 0;
      }
    }
    const soldeAlAnnee = (annee) => {
      if (annee <= 0) return montantEmprunte;
      if (annee >= amortSchedule.length) return 0;
      return amortSchedule[Math.floor(annee) - 1]?.soldeRestant ?? 0;
    };

    // --- Projection patrimoniale sur 20 ans (points tous les 5 ans) ---
    const projection = [0, 5, 10, 15, 20].map((annee) => {
      const valeurBien = coutTotal * Math.pow(1 + tauxAppreciationN / 100, annee);
      const capitalRestantDu = soldeAlAnnee(annee);
      const cashflowCumule = cashflowAnnuel * annee;
      const patrimoineNet = valeurBien - capitalRestantDu + cashflowCumule - apportN;
      return { annee, valeurBien, capitalRestantDu, cashflowCumule, patrimoineNet };
    });

    // --- Simulateur de revente (plus-value) ---
    const prixVenteEstime = coutTotal * Math.pow(1 + tauxAppreciationN / 100, anneeReventeN);
    const plusValueBrute = Math.max(0, prixVenteEstime - coutTotal);
    // Abattements pour durée de détention (résidence non principale, régime simplifié)
    const abattementIR = (() => {
      if (anneeReventeN <= 5) return 0;
      if (anneeReventeN <= 21) return (anneeReventeN - 5) * 6;
      return 100;
    })();
    const abattementPS = (() => {
      if (anneeReventeN <= 5) return 0;
      if (anneeReventeN <= 21) return (anneeReventeN - 5) * 1.65;
      if (anneeReventeN <= 22) return 16 * 1.65 + 1.6;
      if (anneeReventeN < 30) return 16 * 1.65 + 1.6 + (anneeReventeN - 22) * 9;
      return 100;
    })();
    const plusValueImposableIR = plusValueBrute * (1 - Math.min(abattementIR, 100) / 100);
    const plusValueImposablePS = plusValueBrute * (1 - Math.min(abattementPS, 100) / 100);
    const impotPlusValue = plusValueImposableIR * 0.19 + plusValueImposablePS * 0.172;
    const capitalRestantALaRevente = soldeAlAnnee(anneeReventeN);
    const produitNetRevente = prixVenteEstime - impotPlusValue - capitalRestantALaRevente;

    // --- Scénarios optimiste / pessimiste (cash-flow mensuel) ---
    const cashflowScenario = (loyerAjuste, vacanceAjustee) => {
      const loyerAnnuelAj = loyerAjuste * 12;
      const fraisGestionAnAj = loyerAnnuelAj * (gestionLocativeN / 100);
      return (
        loyerAjuste * (1 - vacanceAjustee / 100) -
        chargesCoproN -
        fraisGestionAnAj / 12 -
        taxeFonciereN / 12 -
        mensualiteTotale
      );
    };
    const cashflowPessimiste = cashflowScenario(
      loyerMensuelN * 0.95,
      Math.min(vacanceLocativeN + 8, 100)
    );
    const cashflowOptimiste = cashflowScenario(
      loyerMensuelN * 1.05,
      Math.max(vacanceLocativeN - 3, 0)
    );

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
      impotMicroBic,
      impotReel,
      economieAnnuelle,
      amortissementAnnuel,
      amortSchedule,
      projection,
      anneeReventeN,
      prixVenteEstime,
      plusValueBrute,
      abattementIR: Math.min(abattementIR, 100),
      abattementPS: Math.min(abattementPS, 100),
      impotPlusValue,
      capitalRestantALaRevente,
      produitNetRevente,
      cashflowPessimiste,
      cashflowOptimiste,
    };
  }, [
    prixAchat, fraisNotaire, travaux, apport,
    tauxCredit, dureeCredit, assuranceCredit,
    loyerMensuel, chargesCopro, taxeFonciere, gestionLocative, vacanceLocative,
    tmi, tauxAppreciation, anneeRevente,
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
        .mini-table { width:100%; border-collapse:collapse; font-size:12px; margin-top:6px; }
        .mini-table th { text-align:right; font-weight:500; color:#8EA0B3; padding:4px 6px; font-size:11px; }
        .mini-table th:first-child, .mini-table td:first-child { text-align:left; }
        .mini-table td { text-align:right; padding:4px 6px; font-family:'IBM Plex Mono', monospace; color:${COLORS.paper}; border-top:1px dashed rgba(255,255,255,0.12); }
        .scenario-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed rgba(255,255,255,0.15); }
        @media print {
          .no-print { display:none !important; }
          body { background:#fff !important; }
          .premium-card { break-inside: avoid; background:#fff !important; color:#10243E !important; border:1px solid #ccc; }
          .premium-card .ledger-label, .premium-card td, .premium-card th { color:#10243E !important; }
          .main-grid { grid-template-columns: 1fr !important; }
        }
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

          <p className="section-title" style={{ marginTop: 24 }}>Fiscalité</p>
          <label className="field">
            <span className="field-label">Tranche marginale d'imposition</span>
            <div className="field-input">
              <select
                value={tmi}
                onChange={(e) => setTmi(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", fontSize: 16, padding: "6px 2px", width: "100%", color: COLORS.ink, fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <option value="0">0 %</option>
                <option value="11">11 %</option>
                <option value="30">30 %</option>
                <option value="41">41 %</option>
                <option value="45">45 %</option>
              </select>
            </div>
          </label>
          <div className="sub-grid">
            <Field label="Appréciation du bien" value={tauxAppreciation} onChange={setTauxAppreciation} suffix="%/an" step={0.1} />
            <Field label="Année de revente simulée" value={anneeRevente} onChange={setAnneeRevente} suffix="ans" step={1} />
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

          {/* Premium — module fiscal LMNP réel vs micro-BIC */}
          <div className="premium-card">
            <div className="premium-lock-row">
              <span className="premium-badge">{premium ? "✓ DÉBLOQUÉ" : "🔒 PREMIUM"}</span>
            </div>
            <p className="section-title" style={{ margin: "0 0 8px 0" }}>Module fiscal — LMNP réel vs micro-BIC</p>

            {premium ? (
              <>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Impôt estimé — micro-BIC</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.impotMicroBic)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Impôt estimé — régime réel</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.impotReel)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Amortissement annuel estimé</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.amortissementAnnuel)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "none" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Économie d'impôt annuelle (réel vs micro-BIC)</span>
                  <span className="ledger-value" style={{ color: calc.economieAnnuelle >= 0 ? "#7FD9AE" : "#E8998A" }}>
                    {euros(calc.economieAnnuelle)}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "#8EA0B3", lineHeight: 1.5, marginTop: 14 }}>
                  Estimation indicative (amortissement linéaire simplifié, hors IFI). Ne remplace pas l'avis d'un comptable.
                </p>

                {/* Projection patrimoniale */}
                <p className="section-title" style={{ marginTop: 22 }}>Projection patrimoniale</p>
                <table className="mini-table">
                  <thead>
                    <tr><th>Année</th><th>Valeur du bien</th><th>Capital restant dû</th><th>Patrimoine net</th></tr>
                  </thead>
                  <tbody>
                    {calc.projection.map((p) => (
                      <tr key={p.annee}>
                        <td>{p.annee === 0 ? "Achat" : `An ${p.annee}`}</td>
                        <td>{euros(p.valeurBien)}</td>
                        <td>{euros(p.capitalRestantDu)}</td>
                        <td style={{ color: COLORS.brassSoft }}>{euros(p.patrimoineNet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 11, color: "#8EA0B3", lineHeight: 1.5, marginTop: 8 }}>
                  Patrimoine net = valeur estimée du bien − capital restant dû + cash-flow cumulé − apport initial. Cash-flow supposé constant (hors évolution des loyers).
                </p>

                {/* Simulateur de revente */}
                <p className="section-title" style={{ marginTop: 22 }}>Simulation de revente — année {calc.anneeReventeN}</p>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Prix de vente estimé</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.prixVenteEstime)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Plus-value brute</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.plusValueBrute)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Abattements détention (IR / PS)</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{pct(calc.abattementIR)} / {pct(calc.abattementPS)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Impôt sur la plus-value</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.impotPlusValue)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Capital restant dû à la revente</span>
                  <span className="ledger-value" style={{ color: COLORS.paper }}>{euros(calc.capitalRestantALaRevente)}</span>
                </div>
                <div className="ledger-row" style={{ borderBottom: "none" }}>
                  <span className="ledger-label" style={{ color: "#B9C4D2" }}>Produit net de la revente</span>
                  <span className="ledger-value" style={{ color: "#7FD9AE" }}>{euros(calc.produitNetRevente)}</span>
                </div>
                <p style={{ fontSize: 11, color: "#8EA0B3", lineHeight: 1.5, marginTop: 8 }}>
                  Abattements pour durée de détention (régime simplifié, hors résidence principale). Frais d'agence à la revente non déduits.
                </p>

                {/* Tableau d'amortissement du prêt */}
                <p className="section-title" style={{ marginTop: 22 }}>Amortissement du prêt</p>
                <table className="mini-table">
                  <thead>
                    <tr><th>Année</th><th>Intérêts</th><th>Capital</th><th>Solde restant dû</th></tr>
                  </thead>
                  <tbody>
                    {calc.amortSchedule
                      .filter((r) => r.annee % 5 === 0 || r.annee === 1 || r.annee === calc.amortSchedule.length)
                      .map((r) => (
                        <tr key={r.annee}>
                          <td>An {r.annee}</td>
                          <td>{euros(r.interets)}</td>
                          <td>{euros(r.capital)}</td>
                          <td>{euros(r.soldeRestant)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Scénarios optimiste / pessimiste */}
                <p className="section-title" style={{ marginTop: 22 }}>Scénarios</p>
                <div className="scenario-row">
                  <span className="ledger-label" style={{ color: "#E8998A" }}>Pessimiste (loyer −5 %, vacance +8 pts)</span>
                  <span className="ledger-value" style={{ color: "#E8998A" }}>{euros(calc.cashflowPessimiste)}</span>
                </div>
                <div className="scenario-row" style={{ borderBottom: "none" }}>
                  <span className="ledger-label" style={{ color: "#7FD9AE" }}>Optimiste (loyer +5 %, vacance −3 pts)</span>
                  <span className="ledger-value" style={{ color: "#7FD9AE" }}>{euros(calc.cashflowOptimiste)}</span>
                </div>

                <button
                  onClick={() => window.print()}
                  className="no-print"
                  style={{ marginTop: 18, background: "transparent", color: COLORS.brassSoft, border: `1px solid ${COLORS.brassSoft}`, borderRadius: 6, padding: "8px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Exporter le rapport en PDF
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#8EA0B3", lineHeight: 1.6, margin: "0 0 14px 0" }}>
                  Comparez votre impôt réel entre le micro-BIC et le régime réel (charges + intérêts + amortissement), et voyez l'économie potentielle selon votre tranche d'imposition.
                </p>
                <a
                  href={STRIPE_PAYMENT_LINK}
                  style={{ display: "inline-block", background: COLORS.brass, color: COLORS.ink, borderRadius: 6, padding: "10px 18px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                >
                  Débloquer — 4,99 € / mois
                </a>
              </>
            )}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "0 24px 40px", fontSize: 12, color: COLORS.inkSoft, opacity: 0.55 }}>
        Simulation indicative — ne remplace pas un conseil professionnel.
      </footer>
    </div>
  );
}
