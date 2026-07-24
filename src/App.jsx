
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Building2, Calculator, Check, ChevronRight, CircleDollarSign,
  Crown, Download, Gauge, Home, LineChart, Moon, Plus, Save, Scale,
  Sparkles, Sun, Target, Trash2, TrendingUp, WalletCards, X, Link2, FileText, AlertTriangle, ThumbsUp, Search
} from "lucide-react";

const PREMIUM_STORAGE_KEY = "renta-v7-premium";
const toNumber = (value) => Number(String(value ?? "").replace(/\s/g, "").replace(",", ".")) || 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const euro = (value, digits = 0) =>
  Number(value || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: digits });
const pct = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const FREE_PROJECT_LIMIT = 3;

const defaultProject = {
  id: "",
  name: "Appartement centre-ville",
  city: "Chilly-Mazarin",
  price: "230000",
  notary: "8",
  works: "10000",
  contribution: "32000",
  rate: "2,89",
  loanYears: "25",
  insurance: "0,30",
  rent: "1250",
  condo: "0",
  propertyTax: "900",
  management: "0",
  vacancy: "5",
  holdingYears: "10",
  resaleValue: "260000",
  resaleFees: "5",
  tmi: "30"
};

function calculate(p) {
  const price = toNumber(p.price);
  const notaryFees = price * toNumber(p.notary) / 100;
  const works = toNumber(p.works);
  const totalCost = price + notaryFees + works;
  const contribution = toNumber(p.contribution);
  const principal = Math.max(0, totalCost - contribution);
  const months = Math.max(12, toNumber(p.loanYears) * 12);
  const monthlyRate = toNumber(p.rate) / 1200;
  const loanPayment = monthlyRate
    ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
    : principal / months;
  const insurance = principal * toNumber(p.insurance) / 100 / 12;
  const monthlyPayment = loanPayment + insurance;

  const yearlyRent = toNumber(p.rent) * 12;
  const vacancyLoss = yearlyRent * toNumber(p.vacancy) / 100;
  const management = yearlyRent * toNumber(p.management) / 100;
  const yearlyCharges = toNumber(p.condo) * 12 + toNumber(p.propertyTax) + vacancyLoss + management;
  const yearlyNetBeforeDebt = yearlyRent - yearlyCharges;
  const grossYield = totalCost ? yearlyRent / totalCost * 100 : 0;
  const netYield = totalCost ? yearlyNetBeforeDebt / totalCost * 100 : 0;
  const monthlyCashflow = yearlyNetBeforeDebt / 12 - monthlyPayment;

  const taxRate = toNumber(p.tmi) / 100 + 0.172;
  const microTax = Math.max(0, yearlyRent * 0.5) * taxRate;
  const yearOneInterest = principal * toNumber(p.rate) / 100;
  const depreciation = (price + works + notaryFees) * 0.85 / 25;
  const realTax = Math.max(0, yearlyRent - yearlyCharges - yearOneInterest - depreciation) * taxRate;
  const taxSaving = Math.max(0, microTax - realTax);
  const cashflowAfterTax = monthlyCashflow - realTax / 12;

  const holdingYears = Math.max(1, Math.round(toNumber(p.holdingYears)));
  const paidMonths = Math.min(months, holdingYears * 12);
  const remainingCapital = monthlyRate
    ? Math.max(0, principal * Math.pow(1 + monthlyRate, paidMonths) -
        loanPayment * ((Math.pow(1 + monthlyRate, paidMonths) - 1) / monthlyRate))
    : Math.max(0, principal - loanPayment * paidMonths);

  const resaleValue = toNumber(p.resaleValue);
  const resaleNet = resaleValue * (1 - toNumber(p.resaleFees) / 100);
  const saleEquity = resaleNet - remainingCapital;
  const accumulatedCashflow = cashflowAfterTax * 12 * holdingYears;
  const netGain = saleEquity + accumulatedCashflow - contribution;
  const finalValue = Math.max(1, saleEquity + accumulatedCashflow);
  const irr = contribution > 0 && finalValue > 0
    ? (Math.pow(finalValue / contribution, 1 / holdingYears) - 1) * 100
    : 0;

  const prudentCashflow =
    ((yearlyRent * 0.95) * (1 - clamp(toNumber(p.vacancy) + 3, 0, 100) / 100)
      - toNumber(p.condo) * 12 - toNumber(p.propertyTax) - management) / 12
      - monthlyPayment;

  const parts = {
    yield: Math.round(clamp(netYield / 7 * 25, 0, 25)),
    cashflow: Math.round(clamp(12.5 + monthlyCashflow / 18, 0, 25)),
    safety: Math.round(clamp(17 + prudentCashflow / 35 - toNumber(p.vacancy) / 4, 0, 25)),
    wealth: Math.round(clamp(12 + Math.max(0, irr) * 1.2, 0, 25))
  };
  const score = Object.values(parts).reduce((a, b) => a + b, 0);

  const projection = Array.from({ length: holdingYears + 1 }, (_, year) => {
    const m = Math.min(months, year * 12);
    const remaining = monthlyRate
      ? Math.max(0, principal * Math.pow(1 + monthlyRate, m) -
          loanPayment * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate))
      : Math.max(0, principal - loanPayment * m);
    const value = price + (resaleValue - price) * year / holdingYears;
    return { year, value, debt: remaining, equity: value - remaining };
  });

  return {
    notaryFees, totalCost, principal, monthlyPayment, yearlyRent, yearlyCharges,
    grossYield, netYield, monthlyCashflow, cashflowAfterTax, microTax, realTax,
    taxSaving, remainingCapital, saleEquity, netGain, irr, prudentCashflow,
    score, parts, projection
  };
}

function NumberField({ label, value, onChange, suffix = "", step = "1" }) {
  const [draft, setDraft] = useState(String(value ?? ""));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ""));
  }, [value, editing]);

  const shown = () => {
    const raw = String(value ?? "");
    const number = toNumber(raw);
    if (!raw || !Number.isFinite(number)) return raw;
    const decimals = String(step).includes(".") ? 2 : 0;
    return number.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
  };

  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-shell">
        <input
          type="text"
          inputMode="decimal"
          value={editing ? draft : shown()}
          onFocus={(event) => {
            setEditing(true);
            setDraft(String(value ?? "").replace(".", ","));
            requestAnimationFrame(() => event.target.select());
          }}
          onChange={(event) => {
            let next = event.target.value.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
            const separators = [...next].reduce((acc, char, index) => {
              if (char === "," || char === ".") acc.push(index);
              return acc;
            }, []);
            if (separators.length > 1) {
              const first = separators[0];
              next = next.slice(0, first + 1) + next.slice(first + 1).replace(/[,.]/g, "");
            }
            setDraft(next);
            if (!["", "-", ",", ".", "-,", "-."].includes(next)) onChange(next);
          }}
          onBlur={() => {
            setEditing(false);
            if (draft.trim()) onChange(draft.replace(".", ","));
          }}
        />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  );
}

function Metric({ icon, label, value, note, tone = "blue" }) {
  return (
    <article className={`metric ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </article>
  );
}

function ScoreRing({ score }) {
  const label = score >= 80 ? "Excellent" : score >= 65 ? "Solide" : score >= 50 ? "À optimiser" : "Risqué";
  return (
    <div className="score-block">
      <div className="score-ring" style={{ "--score": `${score * 3.6}deg` }}>
        <div><strong>{score}</strong><small>/100</small></div>
      </div>
      <div>
        <span>Indice qualité</span>
        <h3>{label}</h3>
        <p>Équilibre rendement, trésorerie, sécurité et création de patrimoine.</p>
      </div>
    </div>
  );
}

function MiniBars({ parts }) {
  const rows = [
    ["Rentabilité", parts.yield],
    ["Cash-flow", parts.cashflow],
    ["Sécurité", parts.safety],
    ["Patrimoine", parts.wealth]
  ];
  return (
    <div className="mini-bars">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <div><i style={{ width: `${value * 4}%` }} /></div>
          <b>{value}/25</b>
        </div>
      ))}
    </div>
  );
}

function ProjectionChart({ data }) {
  const width = 760, height = 270, pad = 34;
  const max = Math.max(...data.flatMap((point) => [point.value, point.debt]), 1);
  const x = (index) => pad + index * (width - pad * 2) / Math.max(1, data.length - 1);
  const y = (value) => height - pad - value / max * (height - pad * 2);
  const path = (key) => data.map((point, index) => `${index ? "L" : "M"} ${x(index)} ${y(point[key])}`).join(" ");
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} aria-label="Projection patrimoniale">
        <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} className="axis" />
        <path d={path("value")} className="value-line" />
        <path d={path("debt")} className="debt-line" />
        {data.filter((_, index) => index === 0 || index === data.length - 1 || index % Math.max(1, Math.floor(data.length / 5)) === 0)
          .map((point) => {
            const index = data.findIndex((item) => item.year === point.year);
            return <text key={point.year} x={x(index)} y={height - 9}>{point.year}a</text>;
          })}
      </svg>
      <div className="legend">
        <span><i className="dot value" /> Valeur du bien</span>
        <span><i className="dot debt" /> Capital restant dû</span>
      </div>
    </div>
  );
}

function Advice({ project, calc }) {
  const negotiation = Math.max(0, Math.round(Math.abs(calc.monthlyCashflow) * 12 / Math.max(calc.netYield / 100, 0.01) / 1000) * 1000);
  const items = [
    calc.monthlyCashflow < 0 && {
      title: "Projet à rééquilibrer",
      text: `Une négociation d’environ ${euro(negotiation)} ou un apport supérieur améliorerait le cash-flow.`
    },
    calc.taxSaving > 300 && {
      title: "Fiscalité optimisable",
      text: `Le régime réel pourrait réduire l’impôt estimé d’environ ${euro(calc.taxSaving)} par an.`
    },
    calc.prudentCashflow < 0 && {
      title: "Prévoir une réserve",
      text: `Le scénario prudent atteint ${euro(calc.prudentCashflow)}/mois. Une épargne de sécurité est recommandée.`
    },
    calc.monthlyCashflow >= 0 && calc.netYield >= 5.5 && {
      title: "Équilibre intéressant",
      text: `Le projet combine ${pct(calc.netYield)} net et ${euro(calc.monthlyCashflow)}/mois avant fiscalité.`
    }
  ].filter(Boolean);

  return (
    <section className="card assistant-card">
      <div className="section-title"><span><Sparkles size={18} /> Assistant Renta</span><em>Analyse automatique</em></div>
      <h2>{project.name}</h2>
      <p className="lead">
        {calc.score >= 80
          ? "Le projet présente un profil très convaincant."
          : calc.score >= 65
          ? "Le projet est solide, avec quelques leviers d’optimisation."
          : "Le projet mérite d’être négocié ou sécurisé avant décision."}
      </p>
      <div className="advice-grid">
        {items.length ? items.slice(0, 3).map((item) => (
          <div key={item.title}><Check size={17} /><p><b>{item.title}</b>{item.text}</p></div>
        )) : <div><Check size={17} /><p><b>Simulation complète</b>Les principaux indicateurs sont cohérents avec les hypothèses saisies.</p></div>}
      </div>
    </section>
  );
}

function Simulator({ project, setProject, calc, onSave }) {
  const update = (key) => (value) => setProject((old) => ({ ...old, [key]: value }));
  return (
    <div className="simulator-layout">
      <aside className="form-card">
        <div className="form-head">
          <div><span>SIMULATION</span><h2>Votre projet</h2></div>
          <Calculator size={22} />
        </div>

        <label className="name-field">
          <span>Nom du projet</span>
          <input value={project.name} onChange={(e) => update("name")(e.target.value)} />
        </label>
        <label className="name-field">
          <span>Ville</span>
          <input value={project.city} onChange={(e) => update("city")(e.target.value)} />
        </label>

        <fieldset>
          <legend>Achat</legend>
          <div className="field-grid">
            <NumberField label="Prix du bien" value={project.price} onChange={update("price")} suffix="€" />
            <NumberField label="Frais de notaire" value={project.notary} onChange={update("notary")} suffix="%" step="0.01" />
            <NumberField label="Travaux" value={project.works} onChange={update("works")} suffix="€" />
            <NumberField label="Apport" value={project.contribution} onChange={update("contribution")} suffix="€" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Financement</legend>
          <div className="field-grid">
            <NumberField label="Taux du prêt" value={project.rate} onChange={update("rate")} suffix="%" step="0.01" />
            <NumberField label="Durée du prêt" value={project.loanYears} onChange={update("loanYears")} suffix="ans" />
            <NumberField label="Assurance" value={project.insurance} onChange={update("insurance")} suffix="%" step="0.01" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Location</legend>
          <div className="field-grid">
            <NumberField label="Loyer mensuel" value={project.rent} onChange={update("rent")} suffix="€" />
            <NumberField label="Charges copro." value={project.condo} onChange={update("condo")} suffix="€/mois" />
            <NumberField label="Taxe foncière" value={project.propertyTax} onChange={update("propertyTax")} suffix="€/an" />
            <NumberField label="Gestion locative" value={project.management} onChange={update("management")} suffix="%" step="0.01" />
            <NumberField label="Vacance locative" value={project.vacancy} onChange={update("vacancy")} suffix="%" step="0.01" />
            <NumberField label="TMI" value={project.tmi} onChange={update("tmi")} suffix="%" step="0.01" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Revente</legend>
          <div className="field-grid">
            <NumberField label="Durée de détention" value={project.holdingYears} onChange={update("holdingYears")} suffix="ans" />
            <NumberField label="Prix de revente" value={project.resaleValue} onChange={update("resaleValue")} suffix="€" />
            <NumberField label="Frais de revente" value={project.resaleFees} onChange={update("resaleFees")} suffix="%" step="0.01" />
          </div>
        </fieldset>

        <button className="primary wide" onClick={onSave}><Save size={17} /> Sauvegarder le projet</button>
      </aside>

      <div className="results">
        <div className="hero-results">
          <ScoreRing score={calc.score} />
          <MiniBars parts={calc.parts} />
        </div>

        <div className="metrics">
          <Metric icon={<TrendingUp />} label="Rentabilité nette" value={pct(calc.netYield)} note={`Brute : ${pct(calc.grossYield)}`} tone="blue" />
          <Metric icon={<WalletCards />} label="Cash-flow mensuel" value={euro(calc.monthlyCashflow)} note={`Après impôt estimé : ${euro(calc.cashflowAfterTax)}`} tone={calc.monthlyCashflow >= 0 ? "green" : "red"} />
          <Metric icon={<CircleDollarSign />} label="Mensualité totale" value={euro(calc.monthlyPayment)} note={`Emprunt : ${euro(calc.principal)}`} tone="purple" />
          <Metric icon={<Gauge />} label="TRI simplifié" value={pct(calc.irr)} note={`Sur ${project.holdingYears} ans`} tone="orange" />
        </div>

        <div className="content-grid">
          <section className="card">
            <div className="section-title"><span><LineChart size={18} /> Projection patrimoniale</span><em>{project.holdingYears} ans</em></div>
            <ProjectionChart data={calc.projection} />
          </section>
          <section className="card summary-card">
            <div className="section-title"><span><BarChart3 size={18} /> Synthèse revente</span></div>
            <dl>
              <div><dt>Capital restant dû</dt><dd>{euro(calc.remainingCapital)}</dd></div>
              <div><dt>Capital récupéré à la vente</dt><dd>{euro(calc.saleEquity)}</dd></div>
              <div><dt>Gain net estimé</dt><dd className={calc.netGain >= 0 ? "positive" : "negative"}>{euro(calc.netGain)}</dd></div>
              <div><dt>Économie fiscale estimée</dt><dd>{euro(calc.taxSaving)}/an</dd></div>
              <div><dt>Scénario prudent</dt><dd className={calc.prudentCashflow >= 0 ? "positive" : "negative"}>{euro(calc.prudentCashflow)}/mois</dd></div>
            </dl>
          </section>
        </div>

        <Advice project={project} calc={calc} />
      </div>
    </div>
  );
}

function Portfolio({ projects, onOpen, onDelete, onNew }) {
  const calculated = projects.map((project) => ({ project, calc: calculate(project) }));
  const totalValue = calculated.reduce((sum, item) => sum + toNumber(item.project.resaleValue), 0);
  const totalDebt = calculated.reduce((sum, item) => sum + item.calc.remainingCapital, 0);
  const totalCashflow = calculated.reduce((sum, item) => sum + item.calc.monthlyCashflow, 0);
  const avgScore = calculated.length ? Math.round(calculated.reduce((sum, item) => sum + item.calc.score, 0) / calculated.length) : 0;

  return (
    <div className="page-section">
      <div className="page-heading">
        <div><span>PORTEFEUILLE</span><h1>Mon patrimoine immobilier</h1><p>Centralisez vos projets et suivez vos principaux indicateurs.</p></div>
        <button className="primary" onClick={onNew}><Plus size={17} /> Nouveau projet</button>
      </div>

      <div className="metrics portfolio-metrics">
        <Metric icon={<Home />} label="Biens enregistrés" value={projects.length} note="Projets et biens suivis" />
        <Metric icon={<Building2 />} label="Valeur estimée" value={euro(totalValue)} note="Valeur totale des biens" tone="green" />
        <Metric icon={<Scale />} label="Patrimoine net" value={euro(totalValue - totalDebt)} note={`Dette : ${euro(totalDebt)}`} tone="purple" />
        <Metric icon={<WalletCards />} label="Cash-flow global" value={euro(totalCashflow)} note={`Score moyen : ${avgScore}/100`} tone={totalCashflow >= 0 ? "orange" : "red"} />
      </div>

      {projects.length ? (
        <div className="property-grid">
          {calculated.map(({ project, calc }) => (
            <article className="property-card" key={project.id}>
              <div className="property-top">
                <span className={`status ${calc.score >= 80 ? "excellent" : calc.score >= 65 ? "solid" : "warning"}`}>{calc.score}/100</span>
                <button className="icon-button" onClick={() => onDelete(project.id)} aria-label="Supprimer"><Trash2 size={16} /></button>
              </div>
              <div className="property-icon"><Building2 /></div>
              <h3>{project.name}</h3>
              <p>{project.city}</p>
              <div className="property-values">
                <div><span>Valeur</span><b>{euro(toNumber(project.resaleValue))}</b></div>
                <div><span>Cash-flow</span><b className={calc.monthlyCashflow >= 0 ? "positive" : "negative"}>{euro(calc.monthlyCashflow)}</b></div>
                <div><span>Patrimoine net</span><b>{euro(toNumber(project.resaleValue) - calc.remainingCapital)}</b></div>
                <div><span>Rendement</span><b>{pct(calc.netYield)}</b></div>
              </div>
              <button className="secondary wide" onClick={() => onOpen(project)}>Ouvrir l’analyse <ChevronRight size={16} /></button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Building2 size={35} />
          <h2>Votre portefeuille est vide</h2>
          <p>Sauvegardez votre première simulation pour suivre son évolution.</p>
          <button className="primary" onClick={onNew}>Créer une simulation</button>
        </div>
      )}
    </div>
  );
}

function Compare({ projects }) {
  const [leftId, setLeftId] = useState(projects[0]?.id || "");
  const [rightId, setRightId] = useState(projects[1]?.id || projects[0]?.id || "");
  const left = projects.find((p) => p.id === leftId);
  const right = projects.find((p) => p.id === rightId);
  const l = left ? calculate(left) : null;
  const r = right ? calculate(right) : null;

  const row = (label, a, b, higher = true) => {
    const leftWins = higher ? a > b : a < b;
    const rightWins = higher ? b > a : b < a;
    return (
      <div className="compare-row">
        <b className={leftWins ? "winner" : ""}>{a}</b>
        <span>{label}</span>
        <b className={rightWins ? "winner" : ""}>{b}</b>
      </div>
    );
  };

  return (
    <div className="page-section">
      <div className="page-heading"><div><span>COMPARATEUR</span><h1>Comparer deux investissements</h1><p>Identifiez le projet le plus équilibré, pas seulement le rendement le plus élevé.</p></div></div>
      {projects.length < 2 ? (
        <div className="empty-state"><Scale size={35} /><h2>Deux projets sont nécessaires</h2><p>Sauvegardez au moins deux simulations pour activer le comparateur.</p></div>
      ) : (
        <div className="compare-card card">
          <div className="compare-selects">
            <select value={leftId} onChange={(e) => setLeftId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <div className="versus">VS</div>
            <select value={rightId} onChange={(e) => setRightId(e.target.value)}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          {left && right && l && r && <>
            <div className="compare-titles"><div><h2>{left.name}</h2><span>{left.city}</span></div><div><h2>{right.name}</h2><span>{right.city}</span></div></div>
            <div className="compare-table">
              {row("Score", `${l.score}/100`, `${r.score}/100`)}
              {row("Cash-flow", euro(l.monthlyCashflow), euro(r.monthlyCashflow))}
              {row("Rentabilité nette", pct(l.netYield), pct(r.netYield))}
              {row("TRI simplifié", pct(l.irr), pct(r.irr))}
              {row("Mensualité", euro(l.monthlyPayment), euro(r.monthlyPayment), false)}
            </div>
            <div className="verdict">
              <Crown size={22} />
              <div><span>Verdict</span><h3>{l.score === r.score ? "Les deux projets sont proches." : `${l.score > r.score ? left.name : right.name} présente le meilleur équilibre global.`}</h3></div>
            </div>
          </>}
        </div>
      )}
    </div>
  );
}

function Goals({ projects, isPremium, onPremiumClick }) {
  const currentValue = projects.reduce((sum, p) => sum + toNumber(p.resaleValue), 0);
  const currentCashflow = projects.reduce((sum, p) => sum + calculate(p).monthlyCashflow, 0);
  const goals = [
    { label: "Patrimoine immobilier", current: currentValue, target: 1000000, formatted: `${euro(currentValue)} / 1 000 000 €` },
    { label: "Cash-flow mensuel", current: currentCashflow, target: 2000, formatted: `${euro(currentCashflow)} / 2 000 €` },
    { label: "Nombre de biens", current: projects.length, target: 5, formatted: `${projects.length} / 5 biens` }
  ];
  return (
    <div className="page-section">
      <div className="page-heading"><div><span>OBJECTIFS</span><h1>Votre trajectoire patrimoniale</h1><p>Visualisez les étapes restantes pour atteindre vos objectifs.</p></div></div>
      <div className="goals-grid">
        {goals.map((goal) => {
          const progress = clamp(goal.current / goal.target * 100, 0, 100);
          return <article className="goal-card card" key={goal.label}>
            <div className="goal-icon"><Target /></div>
            <span>{goal.label}</span>
            <h2>{goal.formatted}</h2>
            <div className="goal-track"><i style={{ width: `${progress}%` }} /></div>
            <small>{Math.round(progress)} % de l’objectif atteint</small>
          </article>;
        })}
      </div>
      <section className={`card premium-panel ${isPremium ? "premium-active-panel" : ""}`}>
        <div>
          <span className="premium-tag"><Crown size={15} /> {isPremium ? "PREMIUM ACTIF" : "PREMIUM"}</span>
          <h2>{isPremium ? "Votre espace Premium est entièrement débloqué." : "Pilotez plusieurs scénarios et objectifs personnalisés."}</h2>
          <p>{isPremium ? "Rapports, historique et analyses avancées sont disponibles sans nouveau paiement." : "Débloquez les rapports détaillés, l’historique illimité et les recommandations avancées."}</p>
        </div>
        {isPremium
          ? <button className="premium-button premium-confirmed"><Check size={17} /> Abonnement actif</button>
          : <button className="premium-button" onClick={onPremiumClick}>Découvrir Premium <ChevronRight size={17} /></button>}
      </section>
    </div>
  );
}




function extractListingFields(text) {
  const normalized = text.replace(/\u00a0/g, " ");

  const priceMatches = [...normalized.matchAll(/(\d{2,3}(?:[\s.]\d{3})+|\d{5,6})\s*€?/g)]
    .map((match) => toNumber(match[1]))
    .filter((value) => value >= 30000 && value <= 2000000);
  const price = priceMatches[0] || 215000;

  const surfaceMatch = normalized.match(/(\d{2,3}(?:[,.]\d+)?)\s*m[²2]/i);
  const surface = surfaceMatch ? toNumber(surfaceMatch[1]) : 48;

  const rentMatch =
    normalized.match(/loyer(?:\s+(?:estimé|mensuel))?\s*[:\-]?\s*(\d{3,5})\s*€/i) ||
    normalized.match(/lou[ée]\s*(\d{3,5})\s*€/i);
  const estimatedRent = rentMatch
    ? toNumber(rentMatch[1])
    : Math.round(Math.max(550, Math.min(2200, surface * 18)));

  const chargesMatch = normalized.match(/charges?\s*[:\-]?\s*(\d{2,5})\s*€(?:\s*\/\s*mois)?/i);
  const monthlyCharges = chargesMatch ? toNumber(chargesMatch[1]) : Math.round(surface * 2.1);

  const taxMatch = normalized.match(/taxe fonci[eè]re\s*[:\-]?\s*(\d{2,5})\s*€/i);
  const propertyTax = taxMatch ? toNumber(taxMatch[1]) : Math.round(surface * 18);

  const roomMatch = normalized.match(/(?:t|f)\s?(\d)/i) || normalized.match(/(\d)\s*pi[eè]ces?/i);
  const rooms = roomMatch ? Number(roomMatch[1]) : surface < 30 ? 1 : surface < 55 ? 2 : 3;

  const cityPatterns = [
    /(?:à|sur la commune de|situ[ée]\s+à)\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ' -]{2,35})/i,
    /([A-ZÀ-Ÿ][A-Za-zÀ-ÿ' -]{2,35})\s+\(\d{5}\)/
  ];
  let city = "Ville à confirmer";
  for (const pattern of cityPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      city = match[1].trim().replace(/\s+(proche|dans|avec|au|en)$/i, "");
      break;
    }
  }

  const hasWorks = /(travaux|à rénover|rafraîchir|rénovation|électricité à refaire|toiture)/i.test(normalized);
  const isRenovated = /(rénové|refait à neuf|aucun travaux|excellent état)/i.test(normalized);
  const hasElevator = /ascenseur/i.test(normalized);
  const hasParking = /(parking|garage|stationnement)/i.test(normalized);
  const hasBalcony = /(balcon|terrasse|jardin)/i.test(normalized);
  const rented = /(vendu loué|locataire en place|actuellement loué)/i.test(normalized);
  const dpeMatch = normalized.match(/dpe\s*[:\-]?\s*([a-g])/i);
  const dpe = dpeMatch ? dpeMatch[1].toUpperCase() : "D";

  return {
    price, surface, estimatedRent, monthlyCharges, propertyTax, rooms, city, dpe,
    hasWorks, isRenovated, hasElevator, hasParking, hasBalcony, rented,
  };
}

// Normalise les champs renvoyés par l'IA (types laxistes, valeurs nulles) vers
// le même format que extractListingFields, pour que le moteur de calcul soit
// identique quelle que soit la source des données.
function normalizeAiFields(raw, fallbackText) {
  const local = extractListingFields(fallbackText);
  return {
    price: Number(raw?.price) > 0 ? Number(raw.price) : local.price,
    surface: Number(raw?.surface) > 0 ? Number(raw.surface) : local.surface,
    estimatedRent: Number(raw?.estimatedRent) > 0 ? Number(raw.estimatedRent) : local.estimatedRent,
    monthlyCharges: Number(raw?.monthlyCharges) >= 0 ? Number(raw.monthlyCharges) : local.monthlyCharges,
    propertyTax: Number(raw?.propertyTax) >= 0 ? Number(raw.propertyTax) : local.propertyTax,
    rooms: Number(raw?.rooms) > 0 ? Number(raw.rooms) : local.rooms,
    city: typeof raw?.city === "string" && raw.city.trim() ? raw.city.trim() : local.city,
    dpe: typeof raw?.dpe === "string" && /^[A-G]$/i.test(raw.dpe) ? raw.dpe.toUpperCase() : local.dpe,
    hasWorks: typeof raw?.hasWorks === "boolean" ? raw.hasWorks : local.hasWorks,
    isRenovated: typeof raw?.isRenovated === "boolean" ? raw.isRenovated : local.isRenovated,
    hasElevator: typeof raw?.hasElevator === "boolean" ? raw.hasElevator : local.hasElevator,
    hasParking: typeof raw?.hasParking === "boolean" ? raw.hasParking : local.hasParking,
    hasBalcony: typeof raw?.hasBalcony === "boolean" ? raw.hasBalcony : local.hasBalcony,
    rented: typeof raw?.rented === "boolean" ? raw.rented : local.rented,
  };
}

function computeListingAnalysis(fields) {
  const { price, surface, estimatedRent, monthlyCharges, propertyTax, rooms, city, dpe,
    hasWorks, isRenovated, hasParking, hasBalcony, rented } = fields;

  const worksEstimate = hasWorks ? Math.round(surface * 650) : isRenovated ? 0 : Math.round(surface * 150);
  const acquisitionCost = price * 1.08 + worksEstimate;
  const yearlyRent = estimatedRent * 12;
  const yearlyCharges = monthlyCharges * 12 + propertyTax + yearlyRent * 0.05;
  const grossYield = acquisitionCost ? yearlyRent / acquisitionCost * 100 : 0;
  const netYield = acquisitionCost ? (yearlyRent - yearlyCharges) / acquisitionCost * 100 : 0;

  const contribution = acquisitionCost * 0.1;
  const principal = acquisitionCost - contribution;
  const monthlyRate = 0.032 / 12;
  const months = 25 * 12;
  const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const cashflow = (yearlyRent - yearlyCharges) / 12 - payment;

  let score = 58;
  score += clamp((grossYield - 5) * 7, -14, 20);
  score += cashflow >= 0 ? 9 : clamp(cashflow / 25, -12, 0);
  score += hasParking ? 4 : 0;
  score += hasBalcony ? 3 : 0;
  score += isRenovated ? 4 : 0;
  score += rented ? 3 : 0;
  score -= hasWorks ? 6 : 0;
  score -= ["F", "G"].includes(dpe) ? 12 : dpe === "E" ? 5 : 0;
  score = Math.round(clamp(score, 28, 94));

  const negotiationRate =
    hasWorks || ["E", "F", "G"].includes(dpe) ? 0.09 :
    grossYield < 5 ? 0.07 :
    0.045;
  const advisedPrice = Math.round(price * (1 - negotiationRate) / 1000) * 1000;

  const strengths = [
    grossYield >= 7 ? "Rendement brut attractif" : grossYield >= 5.5 ? "Rendement cohérent pour le marché" : null,
    hasParking ? "Stationnement ou garage mentionné" : null,
    hasBalcony ? "Extérieur valorisant pour la location" : null,
    isRenovated ? "Bien annoncé comme rénové" : null,
    rented ? "Revenus locatifs déjà en place" : null,
    dpe === "A" || dpe === "B" || dpe === "C" ? `Performance énergétique favorable : DPE ${dpe}` : null
  ].filter(Boolean);

  const weaknesses = [
    cashflow < 0 ? `Effort d’épargne estimé à ${euro(Math.abs(cashflow))}/mois` : null,
    hasWorks ? `Budget travaux probable d’environ ${euro(worksEstimate)}` : null,
    ["F", "G"].includes(dpe) ? `DPE ${dpe} : risque réglementaire et travaux énergétiques` : null,
    dpe === "E" ? "DPE E : anticiper les futures contraintes énergétiques" : null,
    !hasParking ? "Aucun stationnement identifié dans le texte" : null,
    city === "Ville à confirmer" ? "Localisation insuffisamment précise pour juger le marché" : null
  ].filter(Boolean);

  while (strengths.length < 3) strengths.push([
    "Surface adaptée à une demande locative courante",
    "Projet exploitable en location meublée",
    "Structure financière facile à optimiser"
  ][strengths.length]);

  while (weaknesses.length < 3) weaknesses.push([
    "Charges et taxe foncière à confirmer",
    "Loyer de marché à vérifier localement",
    "Procès-verbaux de copropriété à analyser"
  ][weaknesses.length]);

  const verdict = score >= 80 ? "ACHETER" : score >= 62 ? "NÉGOCIER" : "ÉVITER";
  const verdictTone = score >= 80 ? "buy" : score >= 62 ? "negotiate" : "avoid";

  return {
    price, surface, estimatedRent, monthlyCharges, propertyTax, rooms, city, dpe,
    worksEstimate, grossYield, netYield, cashflow, score, advisedPrice,
    strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 4),
    verdict, verdictTone
  };
}

// Analyse locale de repli (aucun appel réseau) — utilisée si l'IA est
// indisponible, mal configurée, ou si l'appel échoue pour toute raison.
function parseAnnouncementLocally(text) {
  return computeListingAnalysis(extractListingFields(text));
}

// Analyse via l'IA (extraction fine du texte), avec repli automatique sur
// le moteur local si l'appel échoue. Le calcul financier reste TOUJOURS
// le même moteur déterministe (computeListingAnalysis), que les données
// viennent de l'IA ou des expressions régulières — seule la qualité de
// l'extraction du texte change.
async function analyzeAnnouncement(text) {
  try {
    const response = await fetch("/api/analyze-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("api-error");
    const data = await response.json();
    if (!data || data.error || !data.fields) throw new Error("api-error");
    const fields = normalizeAiFields(data.fields, text);
    return { analysis: computeListingAnalysis(fields), usedAI: true };
  } catch (err) {
    return { analysis: parseAnnouncementLocally(text), usedAI: false };
  }
}

function isStandaloneUrl(value) {
  return /^https?:\/\/\S+$/i.test(String(value || "").trim());
}

function AnnouncementAnalysis({ onExport }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [usedAI, setUsedAI] = useState(false);
  const [error, setError] = useState("");

  const demoText = `Appartement T2 de 48 m² à Bordeaux, proche tramway.
Prix : 215 000 €. Charges : 105 € / mois. Taxe foncière : 890 €.
Appartement rénové, balcon, parking et ascenseur. DPE C.
Loyer estimé : 1 050 € par mois.`;

  const analyze = async () => {
    const cleanInput = input.trim();

    if (isStandaloneUrl(cleanInput)) {
      setError(
        "La lecture automatique d’une URL arrive prochainement. Pour le moment, ouvrez l’annonce puis copiez son texte complet."
      );
      return;
    }

    if (cleanInput.length < 25) {
      setError("Collez le texte complet d’une annonce pour lancer l’analyse.");
      return;
    }
    setError("");
    setStatus("loading");
    const { analysis, usedAI: aiUsed } = await analyzeAnnouncement(input);
    setResult(analysis);
    setUsedAI(aiUsed);
    setStatus("done");
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setStatus("idle");
    setError("");
  };

  if (status === "loading") {
    return (
      <div className="page-section announcement-loading">
        <div className="ai-orbit"><Sparkles size={27} /></div>
        <span>ANALYSE IA EN COURS</span>
        <h1>Nous décortiquons l’annonce…</h1>
        <p>Prix, rentabilité, risques, travaux et marge de négociation.</p>
        <div className="analysis-progress"><i /></div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page-section announcement-page">
        <div className="announcement-result-header">
          <div>
            <span className="eyebrow">
              <Sparkles size={13} /> {usedAI ? "ANALYSE IA" : "ANALYSE AUTOMATIQUE (MODE SECOURS)"}
            </span>
            <h1>{result.city} · T{result.rooms} · {result.surface} m²</h1>
            <p>
              {usedAI
                ? "Analyse générée par IA à partir du texte de l’annonce, puis calculée selon nos règles financières."
                : "L’IA était indisponible : analyse générée par notre moteur de règles local, à partir du texte de l’annonce."}
            </p>
          </div>
          <div className="result-actions">
            <button className="secondary" onClick={reset}>Nouvelle analyse</button>
            <button className="primary" onClick={onExport}><Download size={16} /> Rapport PDF</button>
          </div>
        </div>

        <section className={`ai-verdict ${result.verdictTone}`}>
          <div>
            <span>VERDICT RENTA IA</span>
            <strong>{result.verdict}</strong>
            <p>
              {result.verdict === "ACHETER"
                ? "Le projet présente un équilibre financier particulièrement intéressant."
                : result.verdict === "NÉGOCIER"
                ? "Le projet est pertinent, mais le prix affiché doit être retravaillé."
                : "Le rendement et les risques identifiés ne compensent pas le prix demandé."}
            </p>
          </div>
          <div className="ai-score-ring">
            <strong>{result.score}</strong><small>/100</small>
          </div>
        </section>

        <div className="analysis-metrics">
          <Metric label="Prix affiché" value={euro(result.price)} note={`${euro(result.price / result.surface)}/m²`} icon={<Building2 />} />
          <Metric label="Loyer estimé" value={euro(result.estimatedRent)} note="Estimation mensuelle" icon={<WalletCards />} tone="green" />
          <Metric label="Rendement brut" value={pct(result.grossYield)} note={`Net estimé : ${pct(result.netYield)}`} icon={<TrendingUp />} tone="purple" />
          <Metric label="Cash-flow estimé" value={euro(result.cashflow)} note="Financement 25 ans, apport 10 %" icon={<CircleDollarSign />} tone={result.cashflow >= 0 ? "green" : "red"} />
        </div>

        <div className="analysis-layout">
          <section className="card negotiation-card">
            <div className="section-title"><span><Target size={18} /> Prix de négociation conseillé</span></div>
            <div className="price-comparison">
              <div><span>Prix affiché</span><b>{euro(result.price)}</b></div>
              <ChevronRight />
              <div className="recommended-price"><span>Offre conseillée</span><b>{euro(result.advisedPrice)}</b></div>
            </div>
            <p>Économie potentielle : <strong>{euro(result.price - result.advisedPrice)}</strong></p>
          </section>

          <section className="card extracted-card">
            <div className="section-title"><span><Search size={18} /> Données détectées</span></div>
            <div className="extracted-grid">
              <div><span>Surface</span><b>{result.surface} m²</b></div>
              <div><span>Pièces</span><b>T{result.rooms}</b></div>
              <div><span>DPE</span><b>{result.dpe}</b></div>
              <div><span>Travaux</span><b>{euro(result.worksEstimate)}</b></div>
              <div><span>Charges</span><b>{euro(result.monthlyCharges)}/mois</b></div>
              <div><span>Taxe foncière</span><b>{euro(result.propertyTax)}</b></div>
            </div>
          </section>
        </div>

        <div className="analysis-layout">
          <section className="card insight-card positive">
            <div className="section-title"><span><ThumbsUp size={18} /> Points forts</span></div>
            {result.strengths.map((item) => <div className="insight-line" key={item}><Check size={15} /><span>{item}</span></div>)}
          </section>
          <section className="card insight-card warning">
            <div className="section-title"><span><AlertTriangle size={18} /> Points de vigilance</span></div>
            {result.weaknesses.map((item) => <div className="insight-line" key={item}><AlertTriangle size={15} /><span>{item}</span></div>)}
          </section>
        </div>

        <section className="card ai-advice-card">
          <div className="ai-advice-icon"><Sparkles size={22} /></div>
          <div>
            <span>CONSEIL RENTA IA</span>
            <p>
              À {euro(result.price)}, le projet affiche un rendement brut estimé à {pct(result.grossYield)}.
              Une offre proche de {euro(result.advisedPrice)} améliorerait la sécurité financière et le cash-flow.
              Vérifiez impérativement le loyer de marché, les trois derniers procès-verbaux de copropriété,
              le montant réel des charges et les éventuels travaux votés avant toute décision.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-section announcement-page">
      <section className="announcement-hero">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> OUTIL PREMIUM</span>
          <h1>Analysez une annonce en quelques secondes.</h1>
          <p>Collez le texte de l’annonce pour obtenir une première analyse financière et stratégique. L’import direct depuis une URL sera bientôt disponible.</p>
        </div>
        <div className="announcement-hero-icon"><FileText size={42} /></div>
      </section>

      <section className="card announcement-input-card">
        <div className="announcement-input-head">
          <div className="announcement-input-title">
            <FileText size={17} />
            <span>Collez le texte de l’annonce</span>
          </div>
          <div className="url-soon-badge" title="La lecture automatique d’une URL sera ajoutée prochainement.">
            <Link2 size={13} />
            <span>URL bientôt</span>
          </div>
        </div>

        <textarea
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            if (error) setError("");
          }}
          placeholder="Prix, surface, ville, charges, DPE, description, loyer éventuel…"
        />

        {isStandaloneUrl(input) && (
          <div className="url-help-message">
            <AlertTriangle size={15} />
            <span>Vous avez collé un lien seul. Copiez également le texte de l’annonce pour lancer l’analyse.</span>
          </div>
        )}

        {error && <p className="announcement-error">{error}</p>}

        <div className="announcement-input-footer">
          <button
            className="secondary"
            onClick={() => {
              setInput(demoText);
              setError("");
            }}
          >
            Charger un exemple
          </button>
          <button
            className="primary analyze-button"
            onClick={analyze}
            disabled={isStandaloneUrl(input)}
          >
            <Sparkles size={17} /> Analyser cette annonce
          </button>
        </div>
      </section>

      <div className="analysis-promises">
        <div><Search /><b>Extraction automatique</b><span>Prix, surface, DPE, charges et loyer.</span></div>
        <div><BarChart3 /><b>Analyse financière</b><span>Rendement, cash-flow et estimation des travaux.</span></div>
        <div><Target /><b>Aide à la négociation</b><span>Score, verdict et prix d’offre conseillé.</span></div>
      </div>

      <p className="analysis-disclaimer">
        Cette version réalise une analyse indicative à partir du texte collé. Elle ne remplace ni une étude de marché locale,
        ni un diagnostic technique, fiscal ou juridique.
      </p>
    </div>
  );
}

function PremiumGate({ title, description, features, onUnlock, preview }) {
  return (
    <div className="page-section premium-gate-page">
      <section className="premium-gate">
        <div className="premium-gate-icon"><Crown size={28} /></div>
        <span className="premium-gate-tag">FONCTION PREMIUM</span>
        <h1>{title}</h1>
        <p>{description}</p>

        {preview && <div className="premium-preview">{preview}</div>}

        <div className="premium-feature-list">
          {features.map((feature) => (
            <div key={feature}><Check size={16} /><span>{feature}</span></div>
          ))}
        </div>

        <button className="primary premium-unlock" onClick={onUnlock}>
          Débloquer Premium — 4,99 €/mois <ChevronRight size={17} />
        </button>
        <small>Paiement simulé dans cette version de démonstration.</small>
      </section>
    </div>
  );
}

function PremiumCheckout({ open, onClose, onSuccess }) {
  const [step, setStep] = useState("form");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/30");
  const [cvc, setCvc] = useState("123");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setStep("form");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const pay = async (event) => {
    event.preventDefault();
    if (!email.includes("@")) {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }
    if (card.replace(/\s/g, "").length < 16 || expiry.length < 5 || cvc.length < 3) {
      setError("Complétez les informations de paiement de test.");
      return;
    }
    setError("");
    setStep("processing");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify({
      active: true,
      email,
      activatedAt: new Date().toISOString(),
      plan: "Premium mensuel",
      mode: "test"
    }));
    setStep("success");
    setTimeout(() => onSuccess(email), 1100);
  };

  const formatCard = (value) =>
    value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="checkout-overlay" role="dialog" aria-modal="true">
      <div className="checkout-modal">
        <button className="checkout-close" onClick={onClose} aria-label="Fermer"><X size={18} /></button>

        {step === "form" && (
          <>
            <div className="checkout-brand checkout-brand-logo"><img src="/logo-renta-locative.png" alt="Renta Locative" /></div>
            <span className="test-badge">MODE TEST — AUCUN DÉBIT</span>
            <h2>Débloquez Renta Premium</h2>
            <p className="checkout-intro">Accédez immédiatement aux rapports, comparaisons et analyses avancées.</p>

            <div className="checkout-order">
              <div><Crown size={19} /><span><b>Premium mensuel</b><small>Résiliable à tout moment</small></span></div>
              <strong>4,99 €<small>/mois</small></strong>
            </div>

            <form onSubmit={pay}>
              <label>
                <span>Adresse e-mail</span>
                <input
                  type="email"
                  placeholder="vous@exemple.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </label>
              <label>
                <span>Numéro de carte de test</span>
                <input
                  inputMode="numeric"
                  value={card}
                  onChange={(e) => setCard(formatCard(e.target.value))}
                />
              </label>
              <div className="checkout-fields">
                <label><span>Expiration</span><input value={expiry} onChange={(e) => setExpiry(e.target.value.slice(0, 5))} /></label>
                <label><span>CVC</span><input inputMode="numeric" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))} /></label>
              </div>
              {error && <p className="checkout-error">{error}</p>}
              <button className="checkout-pay" type="submit">Payer 4,99 €</button>
              <p className="checkout-secure">🔒 Paiement simulé pour tester l’expérience complète.</p>
            </form>
          </>
        )}

        {step === "processing" && (
          <div className="checkout-state">
            <div className="checkout-spinner" />
            <h2>Validation du paiement…</h2>
            <p>Activation de votre espace Premium.</p>
          </div>
        )}

        {step === "success" && (
          <div className="checkout-state success">
            <div className="success-check"><Check size={34} /></div>
            <span className="test-badge">PAIEMENT TEST ACCEPTÉ</span>
            <h2>Bienvenue dans Premium !</h2>
            <p>Vos fonctionnalités avancées sont maintenant débloquées.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(false);
  const [project, setProject] = useState(defaultProject);
  const [projects, setProjects] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumEmail, setPremiumEmail] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [premiumNotice, setPremiumNotice] = useState(false);
  const [limitNotice, setLimitNotice] = useState(false);

  const calc = useMemo(() => calculate(project), [project]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("renta-v6-projects") || "[]");
    setProjects(stored);
    setDark(localStorage.getItem("renta-v6-dark") === "1");

    try {
      const premium = JSON.parse(localStorage.getItem(PREMIUM_STORAGE_KEY) || "null");
      if (premium?.active) {
        setIsPremium(true);
        setPremiumEmail(premium.email || "");
      }
    } catch {}

    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "success" || params.get("checkout") === "success" || params.has("session_id")) {
      const premium = {
        active: true,
        email: params.get("email") || "",
        activatedAt: new Date().toISOString(),
        plan: "Premium mensuel",
        mode: "test"
      };
      localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(premium));
      setIsPremium(true);
      setPremiumEmail(premium.email);
      setPremiumNotice(true);
      window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("renta-v6-dark", dark ? "1" : "0");
  }, [dark]);

  const saveProject = () => {
    const isNewProject = !project.id;
    if (!isPremium && isNewProject && projects.length >= FREE_PROJECT_LIMIT) {
      setLimitNotice(true);
      setTimeout(() => setLimitNotice(false), 5000);
      setCheckoutOpen(true);
      return;
    }

    const saved = { ...project, id: project.id || uid(), updatedAt: new Date().toISOString() };
    const next = [...projects.filter((p) => p.id !== saved.id), saved];
    setProject(saved);
    setProjects(next);
    localStorage.setItem("renta-v6-projects", JSON.stringify(next));
  };

  const openProject = (selected) => {
    setProject(selected);
    setPage("simulator");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProject = (id) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    localStorage.setItem("renta-v6-projects", JSON.stringify(next));
  };

  const newProject = () => {
    if (!isPremium && projects.length >= FREE_PROJECT_LIMIT) {
      setLimitNotice(true);
      setTimeout(() => setLimitNotice(false), 5000);
      setCheckoutOpen(true);
      return;
    }
    setProject({ ...defaultProject, id: "", name: "Nouveau projet" });
    setPage("simulator");
  };

  const activatePremium = (email) => {
    setIsPremium(true);
    setPremiumEmail(email);
    setCheckoutOpen(false);
    setPremiumNotice(true);
    setTimeout(() => setPremiumNotice(false), 5000);
  };

  const resetPremiumTest = () => {
    localStorage.removeItem(PREMIUM_STORAGE_KEY);
    setIsPremium(false);
    setPremiumEmail("");
    setPremiumNotice(false);
  };

  const exportPdf = () => {
    if (!isPremium) {
      setCheckoutOpen(true);
      return;
    }
    window.print();
  };

  const nav = [
    ["dashboard", "Tableau de bord", <Home size={18} />],
    ["simulator", "Simulateur", <Calculator size={18} />],
    ["portfolio", "Mes biens", <Building2 size={18} />],
    ["announcement", "Analyse annonce", <Sparkles size={18} />],
    ["compare", "Comparer", <Scale size={18} />],
    ["goals", "Objectifs", <Target size={18} />]
  ];

  const portfolioValue = projects.reduce((sum, p) => sum + toNumber(p.resaleValue), 0);
  const portfolioCashflow = projects.reduce((sum, p) => sum + calculate(p).monthlyCashflow, 0);
  const portfolioDebt = projects.reduce((sum, p) => sum + calculate(p).remainingCapital, 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="logo logo-image-button" onClick={() => setPage("dashboard")} aria-label="Accueil Renta Locative">
          <img src="/logo-renta-locative.png" alt="Renta Locative" />
        </button>
        <nav>
          {nav.map(([id, label, icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
              {icon}<span>{label}</span>
              {id === "portfolio" && <em>{projects.length}</em>}
              {!isPremium && ["announcement", "compare", "goals"].includes(id) && <Crown className="nav-premium-icon" size={13} />}
            </button>
          ))}
        </nav>
        <div className={`sidebar-premium ${isPremium ? "is-active" : ""}`}>
          {isPremium ? <Check size={19} /> : <Crown size={19} />}
          <b>{isPremium ? "Premium actif" : "Passez à Premium"}</b>
          <p>{isPremium ? "Toutes les fonctions sont débloquées." : "Rapports, historique et analyses avancées."}</p>
          {isPremium
            ? <button onClick={resetPremiumTest}>Réinitialiser le test</button>
            : <button onClick={() => setCheckoutOpen(true)}>Découvrir</button>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span>RENTA LOCATIVE V7</span>
            <h2>{page === "dashboard" ? "Bienvenue sur Renta Locative 👋" : nav.find((item) => item[0] === page)?.[1]}</h2>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            {isPremium
              ? <button className="premium-status" title={premiumEmail || "Premium actif"}><Crown size={15} /> Premium actif</button>
              : <button className="free-status" onClick={() => setCheckoutOpen(true)}>Offre gratuite · {projects.length}/{FREE_PROJECT_LIMIT} projets</button>}
            <button className="secondary" onClick={exportPdf}><Download size={16} /> Export PDF</button>
            <button className="primary" onClick={newProject}><Plus size={16} /> Nouveau projet</button>
          </div>
        </header>

        {page === "dashboard" && (
          <div className="page-section">
            <section className="dashboard-hero">
              <div>
                <span className="eyebrow">COPILOTE IMMOBILIER</span>
                <h1>Pilotez vos investissements avec une vision claire.</h1>
                <p>Analysez, comparez et suivez chaque projet depuis un seul tableau de bord.</p>
                <div className="hero-buttons">
                  <button className="primary" onClick={() => setPage("simulator")}>Lancer une simulation <ChevronRight size={17} /></button>
                  <button className="secondary" onClick={() => setPage("portfolio")}>Voir mon portefeuille</button>
                </div>
              </div>
              <div className="dashboard-score">
                <span>Score du projet actif</span>
                <strong>{calc.score}<small>/100</small></strong>
                <b>{calc.score >= 80 ? "Excellent investissement" : calc.score >= 65 ? "Projet solide" : "À optimiser"}</b>
                <div className="progress"><i style={{ width: `${calc.score}%` }} /></div>
              </div>
            </section>

            <div className="metrics dashboard-metrics">
              <Metric icon={<Building2 />} label="Valeur du portefeuille" value={euro(portfolioValue)} note={`${projects.length} bien(s) enregistré(s)`} />
              <Metric icon={<Scale />} label="Patrimoine net" value={euro(portfolioValue - portfolioDebt)} note={`Dette estimée : ${euro(portfolioDebt)}`} tone="green" />
              <Metric icon={<WalletCards />} label="Cash-flow global" value={euro(portfolioCashflow)} note="Avant fiscalité définitive" tone={portfolioCashflow >= 0 ? "purple" : "red"} />
              <Metric icon={<Gauge />} label="Projet actif" value={`${calc.score}/100`} note={project.name} tone="orange" />
            </div>

            <div className="dashboard-grid">
              <section className="card">
                <div className="section-title"><span><LineChart size={18} /> Projection du projet actif</span><button onClick={() => setPage("simulator")}>Modifier</button></div>
                <ProjectionChart data={calc.projection} />
              </section>
              <Advice project={project} calc={calc} />
            </div>

            <div className="quick-grid">
              <button onClick={() => setPage("simulator")}><Calculator /><b>Analyser un bien</b><span>Calculez rendement, cash-flow et TRI.</span></button>
              <button className="quick-premium featured-ai" onClick={() => setPage("announcement")}><Sparkles /><b>Analyser une annonce <Crown size={13} /></b><span>Obtenez un score, un verdict et un prix conseillé.</span></button>
              <button className={!isPremium ? "quick-premium" : ""} onClick={() => setPage("compare")}><Scale /><b>Comparer deux projets {!isPremium && <Crown size={13} />}</b><span>Repérez le meilleur équilibre global.</span></button>
              <button className={!isPremium ? "quick-premium" : ""} onClick={() => setPage("goals")}><Target /><b>Suivre vos objectifs {!isPremium && <Crown size={13} />}</b><span>Visualisez votre progression patrimoniale.</span></button>
            </div>
          </div>
        )}

        {page === "simulator" && <Simulator project={project} setProject={setProject} calc={calc} onSave={saveProject} />}
        {page === "portfolio" && <Portfolio projects={projects} onOpen={openProject} onDelete={deleteProject} onNew={newProject} />}
        {page === "announcement" && (
          isPremium
            ? <AnnouncementAnalysis onExport={exportPdf} />
            : <PremiumGate
                title="Analysez automatiquement une annonce"
                description="Collez une annonce et obtenez immédiatement un score, une estimation financière, les risques détectés et un prix de négociation conseillé."
                features={[
                  "Extraction du prix, de la surface, des charges et du DPE",
                  "Estimation du loyer, du rendement et du cash-flow",
                  "Score d’opportunité et verdict Acheter / Négocier / Éviter",
                  "Prix d’offre conseillé et rapport PDF"
                ]}
                preview={
                  <div className="announcement-gate-preview">
                    <div className="mini-score"><strong>82</strong><small>/100</small></div>
                    <div><b>Verdict : NÉGOCIER</b><span>Prix conseillé : 198 000 €</span></div>
                  </div>
                }
                onUnlock={() => setCheckoutOpen(true)}
              />
        )}
        {page === "compare" && (
          isPremium
            ? <Compare projects={projects} />
            : <PremiumGate
                title="Comparez vos investissements en détail"
                description="Classez vos projets selon leur rendement, leur cash-flow, leur risque et leur potentiel patrimonial."
                features={[
                  "Comparaison côte à côte de tous vos projets",
                  "Classement automatique du meilleur investissement",
                  "Analyse des écarts de rentabilité et de risque",
                  "Nombre de comparaisons illimité"
                ]}
                preview={
                  <div className="blurred-comparison">
                    <div><b>Projet A</b><strong>8,2 %</strong><span>+146 €/mois</span></div>
                    <div className="preview-versus">VS</div>
                    <div><b>Projet B</b><strong>6,7 %</strong><span>+42 €/mois</span></div>
                  </div>
                }
                onUnlock={() => setCheckoutOpen(true)}
              />
        )}
        {page === "goals" && (
          isPremium
            ? <Goals projects={projects} isPremium={isPremium} onPremiumClick={() => setCheckoutOpen(true)} />
            : <PremiumGate
                title="Pilotez vos objectifs patrimoniaux"
                description="Fixez un objectif de patrimoine ou de cash-flow et mesurez précisément votre progression."
                features={[
                  "Objectifs de patrimoine et de revenus",
                  "Projection de votre progression dans le temps",
                  "Scénarios personnalisés et recommandations",
                  "Historique illimité de vos objectifs"
                ]}
                preview={
                  <div className="goal-preview">
                    <span>Objectif patrimoine</span>
                    <b>1 000 000 €</b>
                    <div><i style={{ width: "38%" }} /></div>
                    <small>38 % atteints</small>
                  </div>
                }
                onUnlock={() => setCheckoutOpen(true)}
              />
        )}
      </main>

      {limitNotice && (
        <div className="premium-toast limit-toast">
          <div><Crown size={19} /></div>
          <span><b>Limite de l’offre gratuite atteinte</b>Vous pouvez enregistrer jusqu’à {FREE_PROJECT_LIMIT} projets sans abonnement.</span>
          <button onClick={() => setLimitNotice(false)}><X size={15} /></button>
        </div>
      )}

      {premiumNotice && (
        <div className="premium-toast">
          <div><Check size={19} /></div>
          <span><b>Premium activé</b>Votre accès est mémorisé sur cet appareil.</span>
          <button onClick={() => setPremiumNotice(false)}><X size={15} /></button>
        </div>
      )}

      <PremiumCheckout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={activatePremium}
      />
    </div>
  );
}
