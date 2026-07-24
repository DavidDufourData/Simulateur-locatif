
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Building2, Calculator, Check, ChevronRight, CircleDollarSign,
  Crown, Download, Gauge, Home, LineChart, Moon, Plus, Save, Scale,
  Sparkles, Sun, Target, Trash2, TrendingUp, WalletCards, X, Link2, FileText, AlertTriangle, ThumbsUp, Search,
  Newspaper, BookOpen, Landmark, RefreshCw, ShieldCheck, Clock3, ExternalLink, Activity, MapPin, UserRound, Settings, FolderOpen, SlidersHorizontal, CheckCircle2
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
  const normalized = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const isHouse = /\b(maison|pavillon|villa|long[eè]re|corps de ferme|maison de ville|mitoyenne)\b/i.test(normalized);
  const isApartment = /\b(appartement|studio|duplex|loft|t[1-9]|f[1-9])\b/i.test(normalized);
  const propertyType = isHouse ? "house" : isApartment ? "apartment" : "unknown";
  const ambiguities = [];

  const contextAround = (index, radius = 70) => normalized.slice(Math.max(0, index - radius), index + radius);
  const uniqueNumbers = (values) => [...new Set(values.filter(Boolean))];

  // Prix : on classe les montants selon leur contexte afin de ne pas confondre
  // prix de vente, honoraires, charges, mensualité ou revenu locatif.
  const priceCandidates = [...normalized.matchAll(/(\d{2,3}(?:[\s.]\d{3})+|\d{5,7})\s*€?/g)]
    .map((match) => {
      const value = toNumber(match[1]);
      const context = contextAround(match.index, 95).toLocaleLowerCase("fr-FR");
      let score = 0;
      if (/prix(?: de vente)?|honoraires inclus|fai|hai|vente|propos[eé] au prix/.test(context)) score += 8;
      if (/prix au m[²2]|\/m[²2]|par m[²2]/.test(context)) score -= 10;
      if (/charges|taxe|loyer|mensualit[eé]|revenu|budget travaux|honoraires.*(?:charge|agence)/.test(context)) score -= 7;
      if (/t[eé]l[eé]phone|r[eé]f[eé]rence|mandat|code postal/.test(context)) score -= 6;
      if (value >= 30000 && value <= 3000000) score += 2;
      return { value, score, index: match.index, context };
    })
    .filter((item) => item.value >= 30000 && item.value <= 3000000)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const price = priceCandidates[0]?.value || 0;
  const distinctPrices = uniqueNumbers(priceCandidates.filter((item) => item.score >= 2).map((item) => item.value));
  if (distinctPrices.length > 1 && Math.abs(distinctPrices[0] - distinctPrices[1]) > 1000) {
    ambiguities.push({ field: "price", label: "Prix", candidates: distinctPrices.slice(0, 3), selected: price });
  }

  // Surface : priorité à la surface habitable / Carrez, pénalité pour terrain,
  // balcon, cave, garage et dépendances.
  const surfaceCandidates = [...normalized.matchAll(/(\d{1,5}(?:[,.]\d+)?)\s*m[²2]/gi)]
    .map((match) => {
      const value = toNumber(match[1]);
      const context = contextAround(match.index, 65).toLocaleLowerCase("fr-FR");
      let score = 0;
      if (/surface habitable|habitables?|loi carrez|carrez|surface privative/.test(context)) score += 10;
      if (/appartement|maison|studio|t[1-9]|f[1-9]/.test(context)) score += 3;
      if (/terrain|parcelle|jardin|balcon|terrasse|cave|garage|box|d[eé]pendance|cour/.test(context)) score -= 9;
      if (value >= 9 && value <= 400) score += 2;
      return { value, score, index: match.index };
    })
    .filter((item) => item.value >= 9 && item.value <= 10000)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const surface = surfaceCandidates.find((item) => item.value <= 400)?.value || 0;
  const plausibleSurfaces = uniqueNumbers(surfaceCandidates.filter((item) => item.score >= 2 && item.value <= 400).map((item) => item.value));
  if (plausibleSurfaces.length > 1 && Math.abs(plausibleSurfaces[0] - plausibleSurfaces[1]) >= 5) {
    ambiguities.push({ field: "surface", label: "Surface", candidates: plausibleSurfaces.slice(0, 3), selected: surface });
  }

  const landMatch =
    normalized.match(/(?:terrain|parcelle|jardin)\s*(?:de|:)?\s*(\d{2,5}(?:[,.]\d+)?)\s*m[²2]/i) ||
    normalized.match(/(\d{2,5}(?:[,.]\d+)?)\s*m[²2]\s+de\s+(?:terrain|parcelle|jardin)/i);
  const landSurface = landMatch ? toNumber(landMatch[1]) : 0;

  const rentMatch =
    normalized.match(/loyer(?:\s+(?:estimé|mensuel|actuel|hors charges|charges comprises))?\s*[:\-]?\s*(\d{3,5})\s*€/i) ||
    normalized.match(/lou[ée]\s*(?:à)?\s*(\d{3,5})\s*€/i);
  const estimatedRent = rentMatch ? toNumber(rentMatch[1]) : 0;

  const chargesMatch =
    normalized.match(/charges?\s+(?:de copropriété|copropri[eé]t[eé])\s*[:\-]?\s*(\d{1,5})\s*€(?:\s*\/\s*mois)?/i) ||
    normalized.match(/charges?\s*[:\-]?\s*(\d{1,5})\s*€(?:\s*\/\s*mois)?/i);
  let monthlyCharges = chargesMatch ? toNumber(chargesMatch[1]) : 0;
  if (chargesMatch && /(?:par an|annuel|an)\b/i.test(chargesMatch[0])) monthlyCharges = Math.round(monthlyCharges / 12);

  const taxMatch = normalized.match(/taxe fonci[eè]re\s*[:\-]?\s*(\d{2,5})\s*€/i);
  const propertyTax = taxMatch ? toNumber(taxMatch[1]) : 0;

  const roomMatch = normalized.match(/(?:t|f)\s?(\d{1,2})\b/i) || normalized.match(/(\d{1,2})\s*pi[eè]ces?\b/i);
  const rooms = roomMatch ? Number(roomMatch[1]) : 0;
  const bedroomMatch = normalized.match(/(\d{1,2})\s*chambres?\b/i);
  const bedrooms = bedroomMatch ? Number(bedroomMatch[1]) : 0;

  const cityCandidates = [];
  const addCity = (value, score) => {
    const city = String(value || "").trim().replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "");
    if (!city || city.length < 2 || city.length > 45) return;
    if (/^(france|agence|immobilier|exclusivit[eé]|secteur|centre|ville|proche)$/i.test(city)) return;
    cityCandidates.push({ value: city, score });
  };
  for (const match of normalized.matchAll(/\b\d{5}\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ' -]{1,40})/g)) addCity(match[1].split(/\n|\.|,/)[0], 10);
  for (const match of normalized.matchAll(/(?:situ[ée]e?\s+à|sur la commune de|bien situ[ée]\s+à|à)\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ' -]{2,40})/gi)) {
    addCity(match[1].split(/\n|\.|,|\s+(?:proche|dans|avec|au|en)\b/i)[0], 5);
  }
  cityCandidates.sort((a, b) => b.score - a.score);
  const city = cityCandidates[0]?.value || "Ville à confirmer";
  const distinctCities = [...new Set(cityCandidates.map((item) => item.value.toLocaleLowerCase("fr-FR")))];
  if (distinctCities.length > 1) {
    ambiguities.push({ field: "city", label: "Ville", candidates: cityCandidates.slice(0, 3).map((item) => item.value), selected: city });
  }

  const hasWorks = /(travaux|à rénover|rafraîchir|rénovation|électricité à refaire|toiture à refaire|assainissement à refaire)/i.test(normalized);
  const isRenovated = /(rénové|refait à neuf|aucun travaux|excellent état)/i.test(normalized);
  const hasElevator = /ascenseur/i.test(normalized);
  const hasParking = /(parking|garage|stationnement|carport)/i.test(normalized);
  const hasOutdoor = /(balcon|terrasse|jardin|cour|terrain)/i.test(normalized);
  const rented = /(vendu loué|locataire en place|actuellement loué)/i.test(normalized);
  const dpeMatch = normalized.match(/dpe\s*[:\-]?\s*([a-g])/i);
  const dpe = dpeMatch ? dpeMatch[1].toUpperCase() : "NC";
  const hasCopro = /(copropri[eé]t[eé]|syndic|charges de copro|lotissement avec charges)/i.test(normalized);
  const roofMentioned = /(toiture|couverture|charpente)/i.test(normalized);
  const roofConcern = /(toiture à refaire|toiture ancienne|charpente à reprendre|infiltration)/i.test(normalized);
  const heatingMentioned = /(chauffage|chaudi[eè]re|pompe à chaleur|radiateurs?|po[eê]le)/i.test(normalized);
  const sanitationMentioned = /(tout[- ]à[- ]l['’]égout|assainissement|fosse septique|fosse toutes eaux)/i.test(normalized);
  const septicTank = /(fosse septique|fosse toutes eaux|assainissement individuel)/i.test(normalized);
  const facadeConcern = /(fissure|façade à refaire|ravalement à prévoir|humidité|remontées capillaires)/i.test(normalized);
  const isDetached = /(individuelle|indépendante|sans mitoyenneté|non mitoyenne)/i.test(normalized);
  const isSemiDetached = /(mitoyenne|mitoyenneté)/i.test(normalized);
  const hasOutbuilding = /(dépendance|grange|atelier|abri|cave|grenier|combles aménageables)/i.test(normalized);

  const missing = [];
  if (!price) missing.push("prix");
  if (!surface) missing.push("surface habitable");
  if (!estimatedRent) missing.push("loyer estimé ou actuel");
  if (!propertyTax) missing.push("taxe foncière");
  if (dpe === "NC") missing.push("DPE");
  if (propertyType === "unknown") missing.push("type de bien");

  return {
    propertyType, price, surface, landSurface, estimatedRent, monthlyCharges, propertyTax,
    rooms, bedrooms, city, dpe, hasWorks, isRenovated, hasElevator, hasParking,
    hasOutdoor, rented, hasCopro, roofMentioned, roofConcern, heatingMentioned,
    sanitationMentioned, septicTank, facadeConcern, isDetached, isSemiDetached,
    hasOutbuilding, missing, ambiguities,
    rentDetected: Boolean(rentMatch), chargesDetected: Boolean(chargesMatch),
    propertyTaxDetected: Boolean(taxMatch), dpeDetected: Boolean(dpeMatch), worksDetected: hasWorks
  };
}

function normalizeAiFields(raw, fallbackText) {
  const local = extractListingFields(fallbackText);
  const type = ["house", "apartment"].includes(raw?.propertyType) ? raw.propertyType : local.propertyType;
  const bool = (key) => typeof raw?.[key] === "boolean" ? raw[key] : local[key];
  const numeric = (key, min, max) => {
    const value = toNumber(raw?.[key]);
    return value >= min && value <= max ? value : local[key];
  };
  const aiCity = typeof raw?.city === "string" && raw.city.trim().length >= 2 ? raw.city.trim() : "";
  const aiDpe = /^[A-G]$/i.test(String(raw?.dpe || "")) ? String(raw.dpe).toUpperCase() : "";

  return {
    propertyType: type,
    price: numeric("price", 30000, 3000000),
    surface: numeric("surface", 9, 400),
    landSurface: numeric("landSurface", 0, 100000),
    estimatedRent: numeric("estimatedRent", 0, 20000),
    monthlyCharges: numeric("monthlyCharges", 0, 10000),
    propertyTax: numeric("propertyTax", 0, 50000),
    rooms: numeric("rooms", 0, 30), bedrooms: numeric("bedrooms", 0, 30),
    city: aiCity || local.city, dpe: aiDpe || local.dpe,
    hasWorks: bool("hasWorks"), isRenovated: bool("isRenovated"), hasElevator: bool("hasElevator"),
    hasParking: bool("hasParking"), hasOutdoor: bool("hasOutdoor"), rented: bool("rented"),
    hasCopro: bool("hasCopro"), roofMentioned: bool("roofMentioned"), roofConcern: bool("roofConcern"),
    heatingMentioned: bool("heatingMentioned"), sanitationMentioned: bool("sanitationMentioned"),
    septicTank: bool("septicTank"), facadeConcern: bool("facadeConcern"), isDetached: bool("isDetached"),
    isSemiDetached: bool("isSemiDetached"), hasOutbuilding: bool("hasOutbuilding"),
    missing: local.missing, ambiguities: local.ambiguities,
    rentDetected: Boolean(raw?.rentDetected ?? local.rentDetected),
    chargesDetected: Boolean(raw?.chargesDetected ?? local.chargesDetected),
    propertyTaxDetected: Boolean(raw?.propertyTaxDetected ?? local.propertyTaxDetected),
    dpeDetected: Boolean(aiDpe || local.dpeDetected), worksDetected: bool("hasWorks")
  };
}

function computeListingAnalysis(fields) {
  const {
    propertyType, price, surface, landSurface, estimatedRent, monthlyCharges, propertyTax,
    rooms, bedrooms, city, dpe, hasWorks, isRenovated, hasParking, hasOutdoor, rented,
    hasCopro, roofMentioned, roofConcern, heatingMentioned, sanitationMentioned,
    septicTank, facadeConcern, isDetached, isSemiDetached, hasOutbuilding, missing,
    rentDetected, chargesDetected, propertyTaxDetected, dpeDetected, worksDetected, ambiguities = []
  } = fields;

  const isHouse = propertyType === "house";
  const isApartment = propertyType === "apartment";
  const usableFinancialData = price > 0 && surface > 0 && rentDetected && estimatedRent > 0;
  const financialReady =
    usableFinancialData &&
    propertyTaxDetected &&
    (isHouse || chargesDetected);

  const heavyWorksPerM2 = isHouse ? 850 : 650;
  let worksEstimate = null;
  if (worksDetected && surface > 0) {
    worksEstimate = Math.round(surface * heavyWorksPerM2);
    if (isHouse && roofConcern) worksEstimate += Math.max(18000, Math.round(surface * 180));
    if (isHouse && facadeConcern) worksEstimate += Math.max(8000, Math.round(surface * 80));
    if (isHouse && septicTank) worksEstimate += 9000;
  }

  const acquisitionCost = price > 0 ? price * 1.08 + (worksEstimate || 0) : 0;
  const yearlyRent = estimatedRent * 12;
  const vacancyRate = isHouse ? 0.06 : 0.05;
  const maintenanceRate = isHouse ? 0.06 : 0.035;
  const yearlyCharges =
    (chargesDetected ? monthlyCharges * 12 : 0) +
    (propertyTaxDetected ? propertyTax : 0) +
    yearlyRent * vacancyRate +
    yearlyRent * maintenanceRate;

  const grossYield = financialReady && acquisitionCost ? yearlyRent / acquisitionCost * 100 : null;
  const netYield = financialReady && acquisitionCost ? (yearlyRent - yearlyCharges) / acquisitionCost * 100 : null;

  const contribution = acquisitionCost * 0.1;
  const principal = Math.max(0, acquisitionCost - contribution);
  const monthlyRate = 0.032 / 12;
  const months = 25 * 12;
  const payment = principal > 0 ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)) : 0;
  const cashflow = financialReady ? (yearlyRent - yearlyCharges) / 12 - payment : null;

  let score = financialReady ? 56 : null;
  if (financialReady) {
    score += clamp((grossYield - 5) * 7, -14, 20);
    score += cashflow >= 0 ? 9 : clamp(cashflow / 25, -12, 0);
  }
  if (score !== null) {
    score += hasParking ? 3 : 0;
    score += hasOutdoor ? (isHouse ? 2 : 3) : 0;
    score += isRenovated ? 4 : 0;
    score += rented ? 3 : 0;
    score += isHouse && isDetached ? 2 : 0;
    score += isHouse && hasOutbuilding ? 2 : 0;
    score -= hasWorks ? 6 : 0;
    score -= roofConcern ? 7 : 0;
    score -= facadeConcern ? 5 : 0;
    score -= septicTank ? 2 : 0;
    score -= dpeDetected && ["F", "G"].includes(dpe) ? 12 : dpeDetected && dpe === "E" ? 5 : 0;
    score = Math.round(clamp(score, 20, 94));
  }

  const negotiationRate =
    roofConcern || facadeConcern || ["F", "G"].includes(dpe) ? 0.11 :
    hasWorks || dpe === "E" ? 0.09 :
    usableFinancialData && grossYield < 5 ? 0.07 :
    0.045;
  const advisedPrice = financialReady && price > 0
    ? Math.round(price * (1 - negotiationRate) / 1000) * 1000
    : null;

  const strengths = [
    financialReady && grossYield >= 7 ? "Rendement brut attractif" : financialReady && grossYield >= 5.5 ? "Rendement cohérent" : null,
    hasParking ? (isHouse ? "Garage ou stationnement identifié" : "Stationnement identifié") : null,
    hasOutdoor ? (isHouse ? "Terrain, jardin ou cour valorisant le bien" : "Extérieur valorisant pour la location") : null,
    isRenovated ? "Bien annoncé comme rénové" : null,
    rented ? "Revenus locatifs déjà en place" : null,
    isHouse && isDetached ? "Maison individuelle sans mitoyenneté mentionnée" : null,
    isHouse && hasOutbuilding ? "Dépendance ou espace annexe identifié" : null,
    ["A", "B", "C"].includes(dpe) ? `Performance énergétique favorable : DPE ${dpe}` : null
  ].filter(Boolean);

  const weaknesses = [
    !usableFinancialData ? "Données insuffisantes pour fiabiliser le rendement et le cash-flow" : null,
    financialReady && cashflow < 0 ? `Effort d’épargne estimé à ${euro(Math.abs(cashflow))}/mois` : null,
    worksDetected && worksEstimate ? `Travaux mentionnés : budget indicatif d’environ ${euro(worksEstimate)}` : null,
    ["F", "G"].includes(dpe) ? `DPE ${dpe} : risque réglementaire et travaux énergétiques` : null,
    dpe === "E" ? "DPE E : anticiper les futures contraintes énergétiques" : null,
    dpe === "NC" ? "DPE non détecté dans l’annonce" : null,
    isHouse && !roofMentioned ? "État de la toiture et de la charpente à contrôler" : null,
    isHouse && !heatingMentioned ? "Système et coût du chauffage à vérifier" : null,
    isHouse && !sanitationMentioned ? "Assainissement ou raccordement au tout-à-l’égout à confirmer" : null,
    isHouse && roofConcern ? "Travaux de toiture signalés ou suspectés" : null,
    isHouse && facadeConcern ? "Façade, fissures ou humidité à expertiser" : null,
    isApartment && !hasCopro ? "Charges, syndic et documents de copropriété non identifiés" : null,
    city === "Ville à confirmer" ? "Localisation insuffisamment précise pour juger le marché" : null
  ].filter(Boolean);

  const houseFallbackStrengths = [
    "Configuration familiale potentiellement adaptée à une location longue durée",
    landSurface > 0 ? `Terrain détecté : ${landSurface} m²` : "Extérieurs et limites de parcelle à vérifier",
    "Potentiel à confirmer avec les loyers de maisons comparables"
  ];
  const apartmentFallbackStrengths = [
    "Surface adaptée à une demande locative courante",
    "Projet potentiellement exploitable en location meublée",
    "Structure financière à préciser avec les données manquantes"
  ];

  while (strengths.length < 3) strengths.push((isHouse ? houseFallbackStrengths : apartmentFallbackStrengths)[strengths.length]);

  const houseFallbackWeaknesses = [
    "Taxe foncière et coût d’entretien extérieur à confirmer",
    "Loyer d’une maison comparable à vérifier localement",
    "Toiture, chauffage, humidité et assainissement à contrôler"
  ];
  const apartmentFallbackWeaknesses = [
    "Charges et taxe foncière à confirmer",
    "Loyer de marché à vérifier localement",
    "Procès-verbaux de copropriété à analyser"
  ];
  while (weaknesses.length < 3) weaknesses.push((isHouse ? houseFallbackWeaknesses : apartmentFallbackWeaknesses)[weaknesses.length]);

  const factualCount = [
    price > 0, surface > 0, rooms > 0, city !== "Ville à confirmer",
    rentDetected, propertyTaxDetected, dpeDetected,
    isHouse ? true : chargesDetected
  ].filter(Boolean).length;
  const confidence = financialReady && factualCount >= 7 ? "élevée" : factualCount >= 4 ? "moyenne" : "faible";
  const verdict =
    !financialReady ? "À COMPLÉTER" :
    score >= 80 ? "ACHETER" :
    score >= 62 ? "NÉGOCIER" :
    "ÉVITER";
  const verdictTone = !financialReady ? "incomplete" : score >= 80 ? "buy" : score >= 62 ? "negotiate" : "avoid";

  return {
    propertyType, propertyLabel: isHouse ? "Maison" : isApartment ? "Appartement" : "Bien immobilier",
    price, surface, landSurface, estimatedRent, monthlyCharges, propertyTax, rooms, bedrooms,
    city, dpe, worksEstimate, grossYield, netYield, cashflow, score, advisedPrice,
    strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5),
    verdict, verdictTone, confidence, missing, usableFinancialData, financialReady,
    rentDetected, chargesDetected, propertyTaxDetected, dpeDetected, worksDetected, ambiguities,
    hasParking, hasOutdoor, hasCopro, isRenovated
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


function estimateRentFromSector(result, sectorRentPerM2) {
  const base = toNumber(sectorRentPerM2);
  if (!result || !result.surface || !base) return null;

  let adjustment = 0;
  const factors = [];

  if (result.isRenovated) {
    adjustment += 0.06;
    factors.push({ label: "Bien rénové", impact: "+6 %" });
  }
  if (result.hasParking) {
    adjustment += result.propertyType === "house" ? 0.025 : 0.04;
    factors.push({ label: "Parking ou garage", impact: result.propertyType === "house" ? "+2,5 %" : "+4 %" });
  }
  if (result.hasOutdoor) {
    adjustment += result.propertyType === "house" ? 0.035 : 0.04;
    factors.push({ label: result.propertyType === "house" ? "Jardin, terrain ou cour" : "Balcon ou terrasse", impact: result.propertyType === "house" ? "+3,5 %" : "+4 %" });
  }
  if (result.dpeDetected && ["A", "B", "C"].includes(result.dpe)) {
    adjustment += 0.025;
    factors.push({ label: `DPE ${result.dpe}`, impact: "+2,5 %" });
  }
  if (result.dpeDetected && ["F", "G"].includes(result.dpe)) {
    adjustment -= 0.06;
    factors.push({ label: `DPE ${result.dpe}`, impact: "-6 %" });
  }
  if (result.worksDetected) {
    adjustment -= 0.08;
    factors.push({ label: "Travaux signalés", impact: "-8 %" });
  }
  if (result.propertyType === "apartment" && result.hasCopro) {
    factors.push({ label: "Copropriété identifiée", impact: "neutre" });
  }

  // Effet de volume : le prix au m² baisse généralement sur les grandes surfaces.
  if (result.surface >= 90) {
    adjustment -= 0.08;
    factors.push({ label: "Grande surface", impact: "-8 % sur le €/m²" });
  } else if (result.surface >= 70) {
    adjustment -= 0.045;
    factors.push({ label: "Surface familiale", impact: "-4,5 % sur le €/m²" });
  } else if (result.surface <= 30) {
    adjustment += 0.08;
    factors.push({ label: "Petite surface", impact: "+8 % sur le €/m²" });
  }

  adjustment = clamp(adjustment, -0.18, 0.18);
  const central = Math.round(result.surface * base * (1 + adjustment) / 10) * 10;
  const low = Math.round(central * 0.94 / 10) * 10;
  const high = Math.round(central * 1.06 / 10) * 10;
  const confidence =
    result.city !== "Ville à confirmer" && result.surface && result.propertyType !== "unknown"
      ? (factors.length >= 3 ? "moyenne" : "prudente")
      : "faible";

  return { base, adjustment, central, low, high, confidence, factors };
}


function recalculateFinancialAnalysis(result, overrides) {
  if (!result) return null;

  const hasRent = String(overrides.rent ?? "").trim() !== "";
  const hasCharges = String(overrides.charges ?? "").trim() !== "";
  const hasPropertyTax = String(overrides.propertyTax ?? "").trim() !== "";
  const rent = toNumber(overrides.rent);
  const charges = toNumber(overrides.charges);
  const propertyTax = toNumber(overrides.propertyTax);
  const contributionRate = clamp(toNumber(overrides.contributionRate) || 10, 0, 100) / 100;
  const interestRate = Math.max(0, toNumber(overrides.interestRate) || 3.2) / 100;
  const durationYears = clamp(toNumber(overrides.durationYears) || 25, 5, 30);
  const insuranceRate = Math.max(0, toNumber(overrides.insuranceRate) || 0.30) / 100;

  const rentReady = hasRent && rent > 0;
  const chargesReady = result.propertyType === "house" || hasCharges;
  const taxReady = hasPropertyTax && propertyTax > 0;
  const financialReady = result.price > 0 && result.surface > 0 && rentReady && chargesReady && taxReady;

  const works = result.worksEstimate || 0;
  const acquisitionCost = result.price > 0 ? result.price * 1.08 + works : 0;
  const yearlyRent = rent * 12;
  const vacancyRate = result.propertyType === "house" ? 0.06 : 0.05;
  const maintenanceRate = result.propertyType === "house" ? 0.06 : 0.035;
  const yearlyCharges =
    (result.propertyType === "house" ? 0 : charges * 12) +
    propertyTax +
    yearlyRent * vacancyRate +
    yearlyRent * maintenanceRate;

  const grossYield = financialReady && acquisitionCost ? yearlyRent / acquisitionCost * 100 : null;
  const netYield = financialReady && acquisitionCost ? (yearlyRent - yearlyCharges) / acquisitionCost * 100 : null;

  const contribution = acquisitionCost * contributionRate;
  const principal = Math.max(0, acquisitionCost - contribution);
  const months = durationYears * 12;
  const monthlyRate = interestRate / 12;
  const loanPayment = principal > 0
    ? monthlyRate > 0
      ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
      : principal / months
    : 0;
  const insurancePayment = principal * insuranceRate / 12;
  const payment = loanPayment + insurancePayment;
  const cashflow = financialReady ? (yearlyRent - yearlyCharges) / 12 - payment : null;

  let score = null;
  if (financialReady) {
    score = 54;
    score += grossYield >= 7 ? 18 : grossYield >= 5.5 ? 10 : grossYield >= 4.5 ? 4 : -8;
    score += netYield >= 5 ? 12 : netYield >= 3.5 ? 6 : -5;
    score += cashflow >= 0 ? 10 : cashflow >= -150 ? 3 : -7;
    score += result.hasParking ? 3 : 0;
    score += result.hasOutdoor ? 3 : 0;
    score += result.isRenovated ? 4 : 0;
    score -= result.worksDetected ? 6 : 0;
    score = Math.round(clamp(score, 20, 94));
  }

  const negotiationRate = score === null ? null : score >= 80 ? 0.02 : score >= 62 ? 0.06 : 0.1;
  const advisedPrice = negotiationRate !== null
    ? Math.round(result.price * (1 - negotiationRate) / 1000) * 1000
    : null;
  const verdict = score === null ? "À COMPLÉTER" : score >= 80 ? "ACHETER" : score >= 62 ? "NÉGOCIER" : "ÉVITER";
  const verdictTone = score === null ? "incomplete" : score >= 80 ? "buy" : score >= 62 ? "negotiate" : "avoid";

  return {
    ...result,
    estimatedRent: rent,
    monthlyCharges: charges,
    propertyTax,
    financialReady,
    grossYield,
    netYield,
    cashflow,
    payment, loanPayment, insurancePayment,
    score,
    advisedPrice,
    verdict,
    verdictTone,
    contributionRate: contributionRate * 100,
    interestRate: interestRate * 100,
    durationYears, insuranceRate: insuranceRate * 100
  };
}

function AnnouncementAnalysis({ onExport }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [usedAI, setUsedAI] = useState(false);
  const [error, setError] = useState("");
  const [sectorRentPerM2, setSectorRentPerM2] = useState("");
  const [rentSource, setRentSource] = useState(null);
  const [rentSourceStatus, setRentSourceStatus] = useState("idle");
  const [rentSourceError, setRentSourceError] = useState("");
  const [rentCity, setRentCity] = useState("");
  const [validatedRent, setValidatedRent] = useState("");
  const [financialInputs, setFinancialInputs] = useState({
    charges: "",
    propertyTax: "",
    contributionRate: "10",
    interestRate: "3,2",
    durationYears: "25",
    insuranceRate: "0,30"
  });
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [checkedActions, setCheckedActions] = useState({});
  const [openPriorityAction, setOpenPriorityAction] = useState(null);

  const apartmentDemo = `Appartement T2 de 48 m² à Bordeaux, proche tramway.
Prix : 215 000 €. Charges de copropriété : 105 € / mois. Taxe foncière : 890 €.
Appartement rénové, balcon, parking et ascenseur. DPE C.
Loyer estimé : 1 050 € par mois.`;

  const houseDemo = `Maison de ville T4 de 92 m² habitables à Chilly-Mazarin, 3 chambres.
Prix : 285 000 €. Terrain de 180 m² avec cour et garage. Taxe foncière : 1 450 €.
Chauffage au gaz, raccordée au tout-à-l’égout, toiture révisée. DPE D.
Loyer estimé : 1 650 € par mois.`;

  const loadOfficialRentReference = async (analysis, cityOverride = "") => {
    const requestedCity = String(cityOverride || analysis?.city || "").trim();
    if (!analysis || !requestedCity || requestedCity === "Ville à confirmer" || analysis.propertyType === "unknown") {
      setRentSourceStatus("idle");
      return;
    }

    setRentSourceStatus("loading");
    setRentSourceError("");
    try {
      const response = await fetch("/api/rent-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: requestedCity,
          propertyType: analysis.propertyType,
          rooms: analysis.rooms || 0
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.rentPerM2) throw new Error(data?.error || "Référence indisponible");

      setSectorRentPerM2(String(data.rentPerM2).replace(".", ","));
      setRentSource(data);
      setRentSourceStatus("done");
    } catch (err) {
      setRentSource(null);
      setRentSourceStatus("error");
      setRentSourceError(err?.message || "Source officielle temporairement indisponible");
    }
  };

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
    setValidatedRent(analysis.rentDetected ? String(analysis.estimatedRent) : "");
    setFinancialInputs({
      charges: analysis.chargesDetected ? String(analysis.monthlyCharges) : "",
      propertyTax: analysis.propertyTaxDetected ? String(analysis.propertyTax) : "",
      contributionRate: "10",
      interestRate: "3,2",
      durationYears: "25",
      insuranceRate: "0,30"
    });
    setStatus("done");
    const detectedCity = analysis.city === "Ville à confirmer" ? "" : analysis.city;
    setRentCity(detectedCity);
    if (detectedCity) loadOfficialRentReference(analysis, detectedCity);
  };

  const reset = () => {
    setInput("");
    setResult(null);
    setStatus("idle");
    setError("");
    setSectorRentPerM2("");
    setRentSource(null);
    setRentSourceStatus("idle");
    setRentSourceError("");
    setRentCity("");
    setValidatedRent("");
    setFinancialInputs({
      charges: "",
      propertyTax: "",
      contributionRate: "10",
      interestRate: "3,2",
      durationYears: "25",
      insuranceRate: "0,30"
    });
    setShowAdvancedDetails(false);
    setCheckedActions({});
    setOpenPriorityAction(null);
  };

  const marketRentEstimate = result
    ? estimateRentFromSector(result, sectorRentPerM2)
    : null;

  const liveResult = result
    ? recalculateFinancialAnalysis(result, {
        rent: validatedRent,
        charges: financialInputs.charges,
        propertyTax: financialInputs.propertyTax,
        contributionRate: financialInputs.contributionRate,
        interestRate: financialInputs.interestRate,
        durationYears: financialInputs.durationYears,
        insuranceRate: financialInputs.insuranceRate
      })
    : null;

  const applyAmbiguityChoice = (ambiguity, choice) => {
    setResult((current) => {
      if (!current) return current;
      const next = {
        ...current,
        [ambiguity.field]: ambiguity.field === "city" ? String(choice) : toNumber(choice),
        ambiguities: (current.ambiguities || []).filter((item) => item.field !== ambiguity.field)
      };
      return next;
    });
    if (ambiguity.field === "city") {
      setRentCity(String(choice));
      setRentSource(null);
      setRentSourceStatus("idle");
      setSectorRentPerM2("");
    }
  };

  const completedSteps = result ? [
    Boolean(result.price && result.surface),
    Boolean(marketRentEstimate),
    toNumber(validatedRent) > 0,
    result.propertyType === "house" || String(financialInputs.charges).trim() !== "",
    toNumber(financialInputs.propertyTax) > 0,
    toNumber(financialInputs.interestRate) >= 0 && toNumber(financialInputs.durationYears) > 0
  ].filter(Boolean).length : 0;
  const completionPercent = Math.round(completedSteps / 6 * 100);

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
    const missingActions = [
      !marketRentEstimate ? "Estimer le loyer du secteur" : null,
      toNumber(validatedRent) <= 0 ? "Valider le loyer retenu" : null,
      result.propertyType !== "house" && String(financialInputs.charges).trim() === "" ? "Renseigner les charges" : null,
      toNumber(financialInputs.propertyTax) <= 0 ? "Renseigner la taxe foncière" : null
    ].filter(Boolean);

    const automaticNextStep = !marketRentEstimate
      ? "Rechercher automatiquement le loyer du secteur"
      : toNumber(validatedRent) <= 0
      ? "Utiliser le loyer estimé"
      : !liveResult.financialReady
      ? "Compléter les informations manquantes"
      : "Consulter le résultat final";

    const handleAutomaticCompletion = () => {
      if (!marketRentEstimate) {
        if (rentCity.trim()) loadOfficialRentReference(result, rentCity);
        return;
      }
      if (toNumber(validatedRent) <= 0) {
        setValidatedRent(String(marketRentEstimate.central));
        return;
      }
      setShowAdvancedDetails(true);
    };

    const priorityActions = result.propertyType === "house"
      ? [
          {
            id: "structure",
            title: "Vérifier la toiture, l’humidité et l’assainissement",
            impact: "Élevé",
            impactTone: "high",
            why: [
              "Une toiture ou un problème d’humidité peut représenter plusieurs dizaines de milliers d’euros.",
              "Un assainissement non conforme peut entraîner des travaux obligatoires.",
              "Ces risques peuvent justifier une forte négociation ou l’abandon du projet."
            ],
            how: [
              "Demander les factures et diagnostics disponibles.",
              "Observer les combles, plafonds, murs bas et odeurs d’humidité.",
              "Faire intervenir un professionnel en cas de doute."
            ]
          },
          {
            id: "rent",
            title: "Confirmer le loyer de marché",
            impact: "Élevé",
            impactTone: "high",
            why: [
              "Le loyer détermine directement le rendement et le cash-flow.",
              "Une estimation trop optimiste peut rendre un projet artificiellement rentable.",
              "Les maisons se comparent difficilement sans tenir compte du terrain et de l’état."
            ],
            how: [
              "Comparer au moins trois maisons similaires dans la même commune.",
              "Vérifier la surface, le terrain, le nombre de chambres et l’état.",
              "Retenir une fourchette prudente plutôt que l’annonce la plus chère."
            ]
          },
          {
            id: "costs",
            title: "Vérifier la taxe foncière et les coûts réels",
            impact: "Moyen",
            impactTone: "medium",
            why: [
              "La taxe foncière réduit directement la rentabilité nette.",
              "L’entretien d’une maison est souvent plus coûteux qu’un appartement.",
              "Des dépenses sous-estimées peuvent créer un cash-flow négatif."
            ],
            how: [
              "Demander le dernier avis de taxe foncière.",
              "Prévoir une réserve annuelle pour l’entretien courant.",
              "Vérifier les coûts de chauffage et d’assurance."
            ]
          }
        ]
      : [
          {
            id: "copro",
            title: "Lire les trois derniers procès-verbaux de copropriété",
            impact: "Élevé",
            impactTone: "high",
            why: [
              "Ils révèlent les travaux votés ou envisagés : ravalement, toiture, ascenseur, chauffage.",
              "Ils permettent d’identifier les impayés, litiges et tensions dans la copropriété.",
              "Un appel de fonds important peut fortement modifier le coût réel d’acquisition."
            ],
            how: [
              "Demander les trois derniers PV au vendeur ou à l’agent immobilier.",
              "Rechercher les résolutions concernant les travaux et appels de fonds.",
              "Vérifier si les travaux votés restent à la charge du vendeur ou de l’acheteur."
            ]
          },
          {
            id: "rent",
            title: "Confirmer le loyer de marché",
            impact: "Élevé",
            impactTone: "high",
            why: [
              "Le loyer détermine directement le rendement et le cash-flow.",
              "Une estimation trop élevée peut donner une fausse impression de rentabilité.",
              "Le marché peut varier fortement entre deux quartiers d’une même commune."
            ],
            how: [
              "Comparer au moins trois annonces similaires et récentes.",
              "Retenir la même surface, le même nombre de pièces et des prestations proches.",
              "Vérifier que les annonces restent peu de temps en ligne."
            ]
          },
          {
            id: "costs",
            title: "Vérifier la taxe foncière et les charges réelles",
            impact: "Moyen",
            impactTone: "medium",
            why: [
              "Elles réduisent directement la rentabilité nette.",
              "Des charges élevées peuvent rendre le logement moins attractif pour un locataire.",
              "Une taxe foncière importante peut transformer un bon projet en investissement moyen."
            ],
            how: [
              "Demander le dernier avis de taxe foncière.",
              "Demander le dernier relevé annuel de charges.",
              "Distinguer les charges récupérables sur le locataire des charges restant au propriétaire."
            ]
          }
        ];

    const verifiedActionsCount = priorityActions.filter((action) => checkedActions[action.id]).length;
    const acquisitionProgress = Math.round(verifiedActionsCount / priorityActions.length * 100);
    const acquisitionReady = verifiedActionsCount === priorityActions.length && liveResult.financialReady;

    return (
      <div className="page-section announcement-page novice-analysis-page">
        <div className="announcement-result-header simplified-header">
          <div>
            <span className="eyebrow"><Sparkles size={13} /> ANALYSE DE L’ANNONCE</span>
            <h1>
              {result.city} · {result.propertyLabel}
              {result.rooms ? ` ${result.rooms} pièces` : ""}
              {result.surface ? ` · ${result.surface} m²` : ""}
            </h1>
            <p>Voici l’essentiel. Les calculs avancés restent accessibles plus bas.</p>
          </div>
          <div className="result-actions">
            <button className="secondary" onClick={reset}>Nouvelle annonce</button>
          </div>
        </div>

        {result.ambiguities?.length > 0 && (
          <section className="card extraction-check-card">
            <AlertTriangle size={19} />
            <div className="extraction-check-content">
              <strong>Vérification rapide</strong>
              <span>L’annonce contient plusieurs valeurs possibles. Touchez simplement la bonne.</span>
              <div className="ambiguity-list">
                {result.ambiguities.map((ambiguity) => (
                  <div className="ambiguity-row" key={ambiguity.field}>
                    <b>{ambiguity.label}</b>
                    <div>
                      {ambiguity.candidates.map((candidate) => (
                        <button
                          type="button"
                          key={String(candidate)}
                          className={String(candidate) === String(ambiguity.selected) ? "selected" : ""}
                          onClick={() => applyAmbiguityChoice(ambiguity, candidate)}
                        >
                          {ambiguity.field === "price" ? euro(candidate) : ambiguity.field === "surface" ? `${candidate} m²` : candidate}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={`novice-verdict-card ${liveResult.verdictTone}`}>
          <div className="novice-verdict-copy">
            <span>VERDICT ACTUEL</span>
            <strong>{liveResult.verdict === "À COMPLÉTER" ? "Analyse incomplète" : liveResult.verdict}</strong>
            <p>
              {liveResult.financialReady
                ? liveResult.verdict === "ACHETER"
                  ? "Le projet paraît intéressant avec les hypothèses retenues."
                  : liveResult.verdict === "NÉGOCIER"
                  ? "Le bien peut être intéressant, mais le prix mérite d’être négocié."
                  : "Le niveau de rendement ne compense pas suffisamment les risques."
                : `Il reste ${missingActions.length} étape${missingActions.length > 1 ? "s" : ""} pour obtenir une analyse financière fiable.`}
            </p>
          </div>
          <div className="novice-score">
            <strong>{liveResult.score ?? completionPercent}</strong>
            <small>{liveResult.score !== null ? "/100" : "% complet"}</small>
          </div>
        </section>

        <section className="card novice-next-step-card">
          <div className="novice-next-step-icon"><Sparkles size={23} /></div>
          <div className="novice-next-step-copy">
            <span>PROCHAINE ÉTAPE CONSEILLÉE</span>
            <strong>{automaticNextStep}</strong>
            <p>
              {missingActions.length
                ? `À faire : ${missingActions.join(" · ")}.`
                : "Toutes les données essentielles sont présentes. Vous pouvez consulter le résultat détaillé."}
            </p>
          </div>
          <button className="primary novice-auto-button" onClick={handleAutomaticCompletion}>
            <Sparkles size={16} />
            {marketRentEstimate && toNumber(validatedRent) <= 0 ? "Utiliser le loyer estimé" : "Compléter automatiquement"}
          </button>
        </section>

        <section className="card novice-progress-card">
          <div className="novice-progress-title">
            <strong>Analyse {completionPercent} % complétée</strong>
            <span>{liveResult.financialReady ? "Prête" : "En cours"}</span>
          </div>
          <div className="analysis-progress-track"><i style={{ width: `${completionPercent}%` }} /></div>
          <div className="novice-checklist">
            <span className={result.price && result.surface ? "done" : ""}>Annonce analysée</span>
            <span className={marketRentEstimate ? "done" : ""}>Loyer estimé</span>
            <span className={toNumber(validatedRent) > 0 ? "done" : ""}>Loyer validé</span>
            <span className={result.propertyType === "house" || String(financialInputs.charges).trim() !== "" ? "done" : ""}>Charges</span>
            <span className={toNumber(financialInputs.propertyTax) > 0 ? "done" : ""}>Taxe foncière</span>
          </div>
        </section>

        {marketRentEstimate && (
          <section className="card novice-rent-card">
            <div>
              <span>LOYER DE MARCHÉ ESTIMÉ</span>
              <strong>{euro(marketRentEstimate.central)}/mois</strong>
              <p>Fourchette : {euro(marketRentEstimate.low)} à {euro(marketRentEstimate.high)}/mois</p>
            </div>
            <button
              className={toNumber(validatedRent) === marketRentEstimate.central ? "validated" : ""}
              onClick={() => setValidatedRent(String(marketRentEstimate.central))}
            >
              <Check size={15} />
              {toNumber(validatedRent) === marketRentEstimate.central ? "Loyer retenu" : "Retenir ce loyer"}
            </button>
          </section>
        )}

        {liveResult.financialReady && (
          <section className="novice-result-grid">
            <div><span>Rendement brut</span><strong>{pct(liveResult.grossYield)}</strong></div>
            <div><span>Rendement net</span><strong>{pct(liveResult.netYield)}</strong></div>
            <div className="monthly-payment-kpi"><span>Mensualité estimée</span><strong>{euro(liveResult.payment)}/mois</strong><small>Crédit + assurance</small></div>
            <div><span>Cash-flow</span><strong>{euro(liveResult.cashflow)}/mois</strong></div>
            <div><span>Prix conseillé</span><strong>{liveResult.advisedPrice ? euro(liveResult.advisedPrice) : "—"}</strong></div>
          </section>
        )}

        <section className="card acquisition-assistant-card">
          <div className="acquisition-assistant-head">
            <div>
              <span>ASSISTANT D’ACQUISITION</span>
              <strong>Contrôles avant achat</strong>
              <p>{verifiedActionsCount} vérification{verifiedActionsCount > 1 ? "s" : ""} sur {priorityActions.length} réalisée{verifiedActionsCount > 1 ? "s" : ""}</p>
            </div>
            <div className={`acquisition-progress-badge ${acquisitionReady ? "ready" : ""}`}>
              <strong>{acquisitionProgress} %</strong>
              <span>{acquisitionReady ? "Prêt pour une offre" : "À vérifier"}</span>
            </div>
          </div>

          <div className="analysis-progress-track acquisition-track">
            <i style={{ width: `${acquisitionProgress}%` }} />
          </div>

          <div className="priority-action-list">
            {priorityActions.map((action) => {
              const isOpen = openPriorityAction === action.id;
              const isChecked = Boolean(checkedActions[action.id]);
              return (
                <article className={`priority-action ${isChecked ? "checked" : ""}`} key={action.id}>
                  <div className="priority-action-main">
                    <button
                      type="button"
                      className={`priority-check ${isChecked ? "checked" : ""}`}
                      onClick={() => setCheckedActions({
                        ...checkedActions,
                        [action.id]: !isChecked
                      })}
                      aria-label={isChecked ? "Marquer comme non vérifié" : "Marquer comme vérifié"}
                    >
                      {isChecked ? <Check size={16} /> : null}
                    </button>

                    <div className="priority-action-title">
                      <div>
                        <strong>{action.title}</strong>
                        <span className={`impact-badge ${action.impactTone}`}>Impact {action.impact.toLowerCase()}</span>
                      </div>
                      <button
                        type="button"
                        className="priority-why-button"
                        onClick={() => setOpenPriorityAction(isOpen ? null : action.id)}
                      >
                        Pourquoi et comment ?
                        <ChevronRight className={isOpen ? "rotated" : ""} size={15} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="priority-action-details">
                      <div>
                        <b>Pourquoi c’est important</b>
                        <ul>{action.why.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                      <div>
                        <b>Comment vérifier</b>
                        <ul>{action.how.map((item) => <li key={item}>{item}</li>)}</ul>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`verified-action-button ${isChecked ? "checked" : ""}`}
                    onClick={() => setCheckedActions({
                      ...checkedActions,
                      [action.id]: !isChecked
                    })}
                  >
                    {isChecked ? <><CheckCircle2 size={16} /> Vérification effectuée</> : "J’ai vérifié"}
                  </button>
                </article>
              );
            })}
          </div>

          {acquisitionReady && (
            <div className="acquisition-ready-banner">
              <CheckCircle2 size={20} />
              <div>
                <strong>Dossier prêt pour une offre</strong>
                <span>Les contrôles prioritaires et les données financières essentielles sont complétés.</span>
              </div>
              <button className="primary" onClick={onExport}><Download size={15} /> Générer le rapport</button>
            </div>
          )}
        </section>

        <button
          className="advanced-details-toggle"
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
        >
          {showAdvancedDetails ? "Masquer les détails avancés" : "Voir le détail du calcul"}
          <ChevronRight className={showAdvancedDetails ? "rotated" : ""} size={17} />
        </button>

        {showAdvancedDetails && (
          <div className="advanced-analysis-details">
            <section className="card rent-market-card">
              <div className="section-title"><span><MapPin size={18} /> Estimation du loyer</span></div>
              <div className="rent-city-search">
                <label>
                  Commune du bien
                  <span>
                    <input value={rentCity} onChange={(e) => setRentCity(e.target.value)} placeholder="Ex. Épinay-sur-Orge" />
                    <button onClick={() => loadOfficialRentReference(result, rentCity)} disabled={!rentCity.trim() || rentSourceStatus === "loading"}>Rechercher</button>
                  </span>
                </label>
              </div>
              <div className={`official-rent-source source-${rentSourceStatus}`}>
                {rentSourceStatus === "loading" && <><RefreshCw className="source-spinner" size={18} /><div><b>Recherche de la référence officielle…</b></div></>}
                {rentSourceStatus === "done" && rentSource && <>
                  <ShieldCheck size={19} />
                  <div><b>{rentSource.rentPerM2} €/m²/mois CC</b><span>{rentSource.typologyLabel} · données {rentSource.year}</span><small>{rentSource.sourceLabel}</small></div>
                  <a href={rentSource.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Source</a>
                </>}
                {rentSourceStatus === "error" && <><AlertTriangle size={18} /><div><b>Référence indisponible</b><span>{rentSourceError}</span></div></>}
              </div>
            </section>

            <section className="card financial-editor-card">
              <div className="section-title"><span><SlidersHorizontal size={18} /> Affiner les hypothèses</span></div>
              <div className="financial-input-grid">
                <label><span>Loyer retenu</span><div><input value={validatedRent} onChange={(e) => setValidatedRent(e.target.value)} inputMode="numeric" /><b>€/mois</b></div></label>
                {result.propertyType !== "house" && <label><span>Charges</span><div><input value={financialInputs.charges} onChange={(e) => setFinancialInputs({...financialInputs, charges:e.target.value})} inputMode="numeric" /><b>€/mois</b></div></label>}
                <label><span>Taxe foncière</span><div><input value={financialInputs.propertyTax} onChange={(e) => setFinancialInputs({...financialInputs, propertyTax:e.target.value})} inputMode="numeric" /><b>€/an</b></div></label>
                <label><span>Apport</span><div><input value={financialInputs.contributionRate} onChange={(e) => setFinancialInputs({...financialInputs, contributionRate:e.target.value})} /><b>%</b></div></label>
                <label><span>Taux du crédit</span><div><input value={financialInputs.interestRate} onChange={(e) => setFinancialInputs({...financialInputs, interestRate:e.target.value})} /><b>%</b></div></label>
                <label><span>Durée</span><div><input value={financialInputs.durationYears} onChange={(e) => setFinancialInputs({...financialInputs, durationYears:e.target.value})} /><b>ans</b></div></label>
                <label><span>Assurance emprunteur</span><div><input value={financialInputs.insuranceRate} onChange={(e) => setFinancialInputs({...financialInputs, insuranceRate:e.target.value})} /><b>%/an</b></div></label>
              </div>
            </section>

            <section className="card extracted-card">
              <div className="section-title"><span><Search size={18} /> Données détectées dans l’annonce</span></div>
              <div className="extracted-grid trusted-data-grid">
                <div><span>Prix</span><b>{result.price ? euro(result.price) : "Non renseigné"}</b></div>
                <div><span>Ville</span><b>{result.city}</b></div>
                <div><span>Type</span><b>{result.propertyLabel}</b></div>
                <div><span>Surface</span><b>{result.surface ? `${result.surface} m²` : "Non renseignée"}</b></div>
                <div><span>Pièces</span><b>{result.rooms || "Non renseignées"}</b></div>
                <div><span>DPE</span><b>{result.dpeDetected ? result.dpe : "Non renseigné"}</b></div>
                <div><span>Charges</span><b>{result.chargesDetected ? `${euro(result.monthlyCharges)}/mois` : "Non renseignées"}</b></div>
                <div><span>Taxe foncière</span><b>{result.propertyTaxDetected ? euro(result.propertyTax) : "Non renseignée"}</b></div>
              </div>
            </section>

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
          </div>
        )}
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
          <div className="announcement-input-actions">
            {input && (
              <button
                type="button"
                className="quick-clear-button"
                onClick={() => {
                  setInput("");
                  setError("");
                }}
                aria-label="Effacer le texte collé"
                title="Effacer tout le texte"
              >
                <X size={14} />
                <span>Effacer</span>
              </button>
            )}
            <div className="url-soon-badge" title="La lecture automatique d’une URL sera ajoutée prochainement.">
              <Link2 size={13} />
              <span>URL bientôt</span>
            </div>
          </div>
        </div>

        <div className="announcement-textarea-wrap">
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              if (error) setError("");
            }}
            placeholder="Prix, surface, ville, charges, DPE, description, loyer éventuel…"
          />
          {input && (
            <button
              type="button"
              className="textarea-clear-icon"
              onClick={() => {
                setInput("");
                setError("");
              }}
              aria-label="Effacer le texte collé"
              title="Effacer le texte collé"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {isStandaloneUrl(input) && (
          <div className="url-help-message">
            <AlertTriangle size={15} />
            <span>Vous avez collé un lien seul. Copiez également le texte de l’annonce pour lancer l’analyse.</span>
          </div>
        )}

        {error && <p className="announcement-error">{error}</p>}

        <div className="announcement-input-footer">
          <div className="demo-buttons">
            <button className="secondary" onClick={() => { setInput(apartmentDemo); setError(""); }}>
              Exemple appartement
            </button>
            <button className="secondary" onClick={() => { setInput(houseDemo); setError(""); }}>
              Exemple maison
            </button>
          </div>
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
        <div><Search /><b>Extraction automatique</b><span>Type de bien, prix, surface, terrain, DPE, charges et loyer.</span></div>
        <div><BarChart3 /><b>Analyse financière</b><span>Calcul financier séparé et estimation locative fondée sur une référence sectorielle explicite.</span></div>
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


const RADAR_FALLBACK = {
  status: "demo",
  updatedAt: null,
  marketMood: {
    label: "Connexion des sources en attente",
    summary: "La page est prête. Les données publiques seront affichées dès que l’API Radar sera connectée.",
    confidence: null
  },
  indicators: [
    { label: "Crédit", value: "À connecter", trend: "neutral", note: "Source attendue : Banque de France" },
    { label: "Prix", value: "À connecter", trend: "neutral", note: "Source attendue : Insee / DVF" },
    { label: "Location", value: "À connecter", trend: "neutral", note: "Données locales à configurer" },
    { label: "Fiscalité", value: "Veille active", trend: "neutral", note: "Sources officielles uniquement" }
  ],
  news: [
    {
      id: "welcome",
      category: "Fonctionnement",
      title: "Votre veille immobilière fiable et traçable",
      summary: "Le Radar rassemble les informations utiles à l’investisseur et distingue clairement les règles applicables, les textes en discussion et les analyses.",
      impact: "Vous obtenez une information courte, datée et accompagnée de sa source.",
      action: "Connecter l’API Radar pour activer les mises à jour automatiques.",
      sourceName: "Renta Locative",
      sourceUrl: "",
      sourceDate: "",
      status: "analysis",
      confidence: "—"
    }
  ],
  tutorials: [
    { title: "Calculer une rentabilité réellement comparable", duration: "4 min", level: "Essentiel", topic: "Rentabilité" },
    { title: "Lire les trois documents clés d’une copropriété", duration: "6 min", level: "Pratique", topic: "Copropriété" },
    { title: "Vérifier un projet LMNP avant de signer", duration: "5 min", level: "Fiscalité", topic: "LMNP" }
  ],
  caseStudy: {
    title: "Étude de cas personnalisée",
    city: "À partir de vos projets",
    score: null,
    summary: "Le Radar pourra transformer vos données enregistrées en étude de cas : financement, rendement, risques et marge de négociation.",
    action: "Enregistrez au moins un projet pour obtenir une analyse contextualisée."
  }
};

function RadarStatusBadge({ status }) {
  const map = {
    official: ["OFFICIEL", "official"],
    applicable: ["APPLICABLE", "official"],
    discussion: ["EN DISCUSSION", "discussion"],
    proposal: ["PROJET / ANNONCE", "proposal"],
    analysis: ["ANALYSE", "analysis"]
  };
  const [label, className] = map[status] || map.analysis;
  return <span className={`radar-status ${className}`}>{label}</span>;
}


const RADAR_TUTORIALS = {
  "Calculer une rentabilité réellement comparable": {
    category: "Rentabilité",
    duration: "4 min",
    title: "Calculer une rentabilité réellement comparable",
    intro: "Deux biens ne se comparent pas avec la seule rentabilité brute. Il faut intégrer l’ensemble du coût d’acquisition et les charges réellement supportées.",
    steps: [
      { title: "1. Calculer le coût total", text: "Prix d’achat + frais de notaire + travaux + mobilier + éventuels frais de dossier." },
      { title: "2. Calculer les loyers annuels", text: "Loyer mensuel hors charges × 12, en conservant une hypothèse prudente de vacance locative." },
      { title: "3. Retirer les charges", text: "Taxe foncière, copropriété non récupérable, assurance, gestion, entretien et vacance locative." },
      { title: "4. Comparer le cash-flow", text: "Le rendement mesure la performance du bien. Le cash-flow mesure l’effort mensuel réel après le financement." }
    ],
    example: "Bien à 150 000 €, 12 000 € de frais, 8 000 € de travaux et 9 600 € de loyers annuels : la rentabilité brute calculée sur le seul prix serait trompeuse. Le coût total à retenir est de 170 000 €.",
    takeaway: "Comparez toujours rendement net, cash-flow et risque locatif ensemble."
  },
  "Lire les trois documents clés d’une copropriété": {
    category: "Copropriété",
    duration: "6 min",
    title: "Lire les trois documents clés d’une copropriété",
    intro: "Une copropriété peut transformer un bon rendement apparent en mauvais investissement. Trois documents permettent d’identifier rapidement les principaux risques.",
    steps: [
      { title: "1. Les procès-verbaux d’assemblée générale", text: "Cherchez les travaux votés, refusés ou régulièrement reportés, ainsi que les conflits et impayés." },
      { title: "2. Le relevé des charges", text: "Séparez les charges récupérables sur le locataire des dépenses restant à la charge du propriétaire." },
      { title: "3. Le carnet d’entretien et le plan de travaux", text: "Vérifiez l’état de la toiture, des façades, de la chaudière collective, des ascenseurs et des réseaux." },
      { title: "4. Les signaux d’alerte", text: "Fonds de travaux faible, nombreux impayés, gros chantier reporté ou syndic fréquemment remplacé." }
    ],
    example: "Un ravalement estimé à 300 000 € dans une copropriété de 30 lots représente en moyenne 10 000 € par lot avant répartition selon les tantièmes.",
    takeaway: "Demandez les documents avant de formuler une offre définitive."
  },
  "Vérifier un projet LMNP avant de signer": {
    category: "LMNP",
    duration: "5 min",
    title: "Vérifier un projet LMNP avant de signer",
    intro: "Le LMNP peut réduire l’imposition des loyers, mais il ne compense ni un prix trop élevé ni une mauvaise demande locative.",
    steps: [
      { title: "1. Vérifier la demande meublée", text: "Étudiants, salariés en mobilité, jeunes actifs ou location moyenne durée : identifiez précisément la clientèle locale." },
      { title: "2. Budgéter le mobilier", text: "Intégrez l’équipement initial, son renouvellement et la liste minimale obligatoire." },
      { title: "3. Comparer micro-BIC et réel", text: "Le régime réel implique une comptabilité, mais permet généralement de déduire les charges et d’amortir le bien selon les règles applicables." },
      { title: "4. Anticiper la revente", text: "La fiscalité et les règles du LMNP évoluent. Vérifiez toujours les textes applicables à la date de l’opération." }
    ],
    example: "Un avantage fiscal estimé ne doit jamais être ajouté artificiellement au cash-flow tant qu’il n’a pas été validé avec les données comptables du bien.",
    takeaway: "Décidez d’abord sur la qualité économique du projet, puis optimisez sa fiscalité."
  }
};

function InvestorRadar({ projects }) {
  const [data, setData] = useState(RADAR_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState(null);

  const loadRadar = async () => {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/investor-radar", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.news) || !Array.isArray(payload.indicators)) {
        throw new Error("Format de données invalide");
      }
      setData(payload);
    } catch {
      setData(RADAR_FALLBACK);
      setNotice("Mode démonstration : les sources n’ont pas pu être chargées.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRadar(); }, []);

  const updatedLabel = data.updatedAt
    ? new Date(data.updatedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "Sources non connectées";

  const activeProject = projects[0];
  const activeCalc = activeProject ? calculate(activeProject) : null;
  const featured = data.news[0];
  const secondaryNews = data.news.slice(1, 3);
  const remainingNews = data.news.slice(3);
  const visibleRemaining = showAll ? remainingNews : remainingNews.slice(0, 3);

  const toneFor = (category = "") => {
    const value = category.toLocaleLowerCase("fr-FR");
    if (value.includes("fiscal")) return "orange";
    if (value.includes("crédit") || value.includes("credit")) return "green";
    if (value.includes("location")) return "purple";
    if (value.includes("travaux") || value.includes("dpe")) return "red";
    return "blue";
  };


  const projectNewsImpact = useMemo(() => {
    if (!featured || !activeProject || !activeCalc) return null;

    const raw = `${featured.category || ""} ${featured.title || ""} ${featured.summary || ""}`.toLocaleLowerCase("fr-FR");
    const has = (...terms) => terms.some((term) => raw.includes(term));

    if (has("micro-entreprise", "entreprise individuelle", "parentalité", "démarches étudiantes")) {
      return {
        level: "none",
        label: "Aucun impact direct identifié",
        summary: `Cette actualité ne concerne pas directement votre projet « ${activeProject.name} ».`,
        detail: "Elle porte sur un autre régime ou une autre situation administrative. Elle reste informative, mais ne doit pas modifier vos hypothèses de rentabilité.",
        action: "Aucune modification de votre simulation n’est recommandée."
      };
    }

    if (has("lmnp", "location meublée", "location meublee", "bénéfices industriels", "bic", "amortissement")) {
      return {
        level: "high",
        label: "Impact fiscal potentiel",
        summary: `Cette actualité peut concerner la fiscalité de « ${activeProject.name} ».`,
        detail: `Votre cash-flow actuel est estimé à ${euro(activeCalc.monthlyCashflow)}/mois avant fiscalité définitive. Une évolution du LMNP peut modifier le résultat après impôt sans changer la rentabilité physique du bien.`,
        action: "Vérifiez la date d’application et faites valider l’impact par votre comptable avant de modifier vos calculs."
      };
    }

    if (has("taxe foncière", "taxe fonciere", "impôts locaux", "impots locaux")) {
      return {
        level: "medium",
        label: "Charges à vérifier",
        summary: `Cette actualité peut affecter les charges annuelles de « ${activeProject.name} ».`,
        detail: `La taxe foncière enregistrée dans votre projet est de ${euro(toNumber(activeProject.propertyTax))} par an. Une variation se répercute directement sur le cash-flow.`,
        action: "Comparez le montant renseigné avec le dernier avis de taxe foncière de la commune."
      };
    }

    if (has("crédit", "credit", "prêt", "pret", "taux", "banque", "financement")) {
      return {
        level: "medium",
        label: "Financement potentiellement concerné",
        summary: `Les conditions de crédit peuvent modifier la mensualité de « ${activeProject.name} ».`,
        detail: `Votre simulation utilise actuellement un taux de ${activeProject.rate || "—"} % sur ${activeProject.loanYears || "—"} ans. Une variation de taux doit être testée dans le simulateur avant toute décision.`,
        action: "Créez un scénario avec le nouveau taux bancaire réellement proposé."
      };
    }

    if (has("dpe", "rénovation", "renovation", "énergie", "energie", "travaux", "passoire")) {
      return {
        level: "high",
        label: "Risque technique à contrôler",
        summary: `Cette actualité peut influencer la louabilité ou le budget travaux de « ${activeProject.name} ».`,
        detail: `Votre projet prévoit ${euro(toNumber(activeProject.works))} de travaux. Les règles énergétiques peuvent imposer un calendrier ou un budget différent.`,
        action: "Contrôlez le DPE, les devis et la date d’entrée en vigueur de la règle."
      };
    }

    if (has("loyer", "bail", "locataire", "location", "encadrement")) {
      return {
        level: "medium",
        label: "Gestion locative concernée",
        summary: `Cette actualité peut concerner le loyer ou le bail de « ${activeProject.name} ».`,
        detail: `Le loyer retenu dans votre simulation est de ${euro(toNumber(activeProject.rent))}/mois. Vérifiez qu’il reste compatible avec les règles locales et le type de bail.`,
        action: "Contrôlez l’encadrement éventuel, l’IRL et les clauses du bail."
      };
    }

    if (has("prix", "immobilier", "logement", "transaction", "marché", "marche")) {
      return {
        level: "low",
        label: "Contexte de marché",
        summary: `Cette actualité apporte un contexte utile pour « ${activeProject.name} », sans recalcul automatique.`,
        detail: "Une tendance nationale ne suffit pas à modifier la valeur d’un bien. La commune, le quartier et les ventes comparables restent prioritaires.",
        action: "Comparez avec des transactions récentes et des annonces réellement concurrentes."
      };
    }

    return {
      level: "none",
      label: "Lien non établi",
      summary: `Aucun effet suffisamment précis n’est identifié sur « ${activeProject.name} ».`,
      detail: "Le Radar évite d’attribuer artificiellement une actualité générale à votre projet.",
      action: "Conservez vos hypothèses tant qu’une source plus spécifique ne les remet pas en cause."
    };
  }, [featured, activeProject, activeCalc]);

  return (
    <div className="page-section radar-page radar-v13">
      <section className="radar-hero radar-hero-compact">
        <div>
          <span className="eyebrow"><Activity size={14} /> RADAR INVESTISSEUR</span>
          <h1>Le marché, sans le bruit.</h1>
          <p>Les informations utiles, leur impact et l’action à retenir.</p>
          <div className="radar-meta">
            <span><Clock3 size={15} /> {updatedLabel}</span>
            <span><ShieldCheck size={15} /> Sources officielles</span>
          </div>
        </div>
        <div className="radar-mood radar-mood-compact">
          <span>Lecture du marché</span>
          <strong>{data.marketMood?.label || "Analyse en cours"}</strong>
          <p>{data.marketMood?.summary}</p>
        </div>
      </section>

      {notice && <div className="radar-notice"><AlertTriangle size={17} /> {notice}</div>}

      <div className="radar-toolbar radar-toolbar-v13">
        <div>
          <b>Votre briefing</b>
          <span>{loading ? "Actualisation en cours…" : `${data.news.length} information(s) retenue(s)`}</span>
        </div>
        <button className="secondary" onClick={loadRadar} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Actualiser
        </button>
      </div>

      <div className="radar-indicators radar-indicators-v13">
        {data.indicators.map((item, index) => (
          <article className="radar-indicator radar-indicator-v13" key={`${item.label}-${index}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>

      {projectNewsImpact && (
        <section className={`radar-personal-strip impact-${projectNewsImpact.level}`}>
          <div className="radar-personal-icon"><Sparkles size={20} /></div>
          <div>
            <span>IMPACT SUR VOTRE PROJET</span>
            <b>{projectNewsImpact.label}</b>
            <p>{projectNewsImpact.summary}</p>
          </div>
          <button onClick={() => document.getElementById("radar-project-impact")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            Voir le détail <ChevronRight size={16} />
          </button>
        </section>
      )}

      {featured && (
        <section className={`radar-featured tone-${toneFor(featured.category)}`}>
          <div className="radar-featured-content">
            <div className="radar-featured-kicker">
              <span>À RETENIR</span>
              <RadarStatusBadge status={featured.status} />
            </div>
            <span className="radar-featured-category">{featured.category}</span>
            <h2>{featured.title}</h2>
            <p>{featured.summary}</p>
            <div className="radar-featured-impact">
              <b>Ce que cela change</b>
              <span>{featured.impact}</span>
            </div>
            <div className="radar-featured-actions">
              {featured.sourceUrl && (
                <a href={featured.sourceUrl} target="_blank" rel="noreferrer">
                  Lire la source <ExternalLink size={14} />
                </a>
              )}
              <small className="radar-source-badge"><ShieldCheck size={13} /> {featured.sourceName}{featured.sourceDate ? ` · ${featured.sourceDate}` : ""}</small>
            </div>
          </div>
          <div className="radar-featured-visual">
            {toneFor(featured.category) === "orange" ? <Landmark size={44} /> :
             toneFor(featured.category) === "green" ? <TrendingUp size={44} /> :
             toneFor(featured.category) === "purple" ? <Home size={44} /> :
             toneFor(featured.category) === "red" ? <AlertTriangle size={44} /> :
             <Newspaper size={44} />}
          </div>
        </section>
      )}

      <section className="radar-section-v13">
        <div className="section-title">
          <span><Newspaper size={18} /> Les autres informations</span>
        </div>

        <div className="radar-story-grid">
          {secondaryNews.map((item, index) => (
            <article className={`radar-story-card tone-${toneFor(item.category)}`} key={item.id || index}>
              <div className="radar-story-head">
                <span>{item.category}</span>
                <RadarStatusBadge status={item.status} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <details>
                <summary>Pourquoi c’est important <ChevronRight size={15} /></summary>
                <div>
                  <b>Impact</b>
                  <p>{item.impact}</p>
                  <b>Action recommandée</b>
                  <p>{item.action}</p>
                </div>
              </details>
              <footer>
                <span className="radar-source-badge"><ShieldCheck size={12} /> {item.sourceName}{item.sourceDate ? ` · ${item.sourceDate}` : ""}</span>
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">Source <ExternalLink size={12} /></a>}
              </footer>
            </article>
          ))}
        </div>

        {visibleRemaining.length > 0 && (
          <div className="radar-compact-list">
            {visibleRemaining.map((item, index) => (
              <details className="radar-compact-item" key={item.id || index}>
                <summary>
                  <span className={`radar-dot tone-${toneFor(item.category)}`} />
                  <div>
                    <small>{item.category}</small>
                    <b>{item.title}</b>
                  </div>
                  <ChevronRight size={16} />
                </summary>
                <div className="radar-compact-body">
                  <p>{item.summary}</p>
                  <div><b>Impact :</b> {item.impact}</div>
                  <div><b>À faire :</b> {item.action}</div>
                  {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">Consulter la source <ExternalLink size={12} /></a>}
                </div>
              </details>
            ))}
          </div>
        )}

        {remainingNews.length > 3 && (
          <button className="radar-show-all" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Réduire la liste" : `Voir toutes les actualités (${remainingNews.length})`}
          </button>
        )}
      </section>

      <div className="radar-bottom-grid">
        <section className="card radar-academy-v13">
          <div className="section-title"><span><BookOpen size={18} /> Académie investisseur</span></div>
          <p className="radar-academy-intro">Trois guides courts pour sécuriser vos décisions.</p>
          <div className="radar-tutorials radar-tutorials-v13">
            {data.tutorials.map((tutorial, index) => (
              <button
                key={`${tutorial.title}-${index}`}
                onClick={() => setSelectedTutorial(RADAR_TUTORIALS[tutorial.title] || null)}
              >
                <div><span>{tutorial.topic}</span><b>{tutorial.title}</b></div>
                <small>{tutorial.duration}</small>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>

        <section id="radar-project-impact" className={`card radar-case radar-case-v13 radar-news-project-impact impact-${projectNewsImpact?.level || "none"}`}>
          <div className="section-title"><span><Sparkles size={18} /> Impact de l’actualité sur votre projet</span></div>
          {projectNewsImpact && featured ? (
            <>
              <span className="radar-impact-project"><MapPin size={14} /> {activeProject.name}{activeProject.city ? ` · ${activeProject.city}` : ""}</span>
              <h3>{projectNewsImpact.label}</h3>
              <p className="radar-impact-linked-news">Actualité analysée : <b>{featured.title}</b></p>
              <div className="radar-impact-detail">
                <span>ANALYSE</span>
                <p>{projectNewsImpact.detail}</p>
              </div>
              <div className="radar-impact-action">
                <Check size={17} />
                <p><b>Action recommandée :</b> {projectNewsImpact.action}</p>
              </div>
              <small>Cette mise en relation est indicative. Elle ne remplace pas la vérification de la source officielle.</small>
            </>
          ) : (
            <>
              <h3>Aucun projet à croiser</h3>
              <p>Enregistrez un projet pour mesurer l’impact potentiel de l’actualité principale.</p>
            </>
          )}
        </section>
      </div>

      {selectedTutorial && (
        <div className="academy-overlay" role="presentation" onClick={() => setSelectedTutorial(null)}>
          <article className="academy-reader" role="dialog" aria-modal="true" aria-label={selectedTutorial.title} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>{selectedTutorial.category} · {selectedTutorial.duration}</span>
                <h2>{selectedTutorial.title}</h2>
              </div>
              <button onClick={() => setSelectedTutorial(null)} aria-label="Fermer le tutoriel"><X size={20} /></button>
            </header>

            <div className="academy-reader-body">
              <p className="academy-lead">{selectedTutorial.intro}</p>

              <div className="academy-steps">
                {selectedTutorial.steps.map((step) => (
                  <section key={step.title}>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </section>
                ))}
              </div>

              <aside className="academy-example">
                <span>EXEMPLE CONCRET</span>
                <p>{selectedTutorial.example}</p>
              </aside>

              <div className="academy-takeaway">
                <Check size={18} />
                <p><b>À retenir :</b> {selectedTutorial.takeaway}</p>
              </div>
            </div>

            <footer>
              <button className="primary" onClick={() => setSelectedTutorial(null)}>Terminer la lecture</button>
            </footer>
          </article>
        </div>
      )}

      <div className="radar-disclaimer radar-disclaimer-v13">
        <ShieldCheck size={17} />
        <p><b>Fiabilité :</b> chaque information conserve sa source et son statut. Vérifiez toujours la publication officielle avant une décision fiscale, juridique ou financière.</p>
      </div>
    </div>
  );
}


function ProfileHub({ projects, isPremium, premiumEmail, onGoals, onCompare, onExport, onPremium }) {
  return (
    <div className="page-section profile-hub">
      <section className="profile-hero card">
        <div className="profile-avatar"><UserRound size={28} /></div>
        <div>
          <span>MON ESPACE</span>
          <h1>{premiumEmail || "Votre profil investisseur"}</h1>
          <p>Retrouvez ici les fonctions secondaires sans encombrer votre navigation principale.</p>
        </div>
        <div className={`profile-plan ${isPremium ? "active" : ""}`}>
          {isPremium ? <Check size={17} /> : <Crown size={17} />}
          <b>{isPremium ? "Premium actif" : "Offre gratuite"}</b>
        </div>
      </section>

      <div className="profile-menu-grid">
        <button className="profile-menu-card" onClick={onGoals}>
          <Target />
          <div><b>Mes objectifs</b><span>Patrimoine, revenus et progression.</span></div>
          <ChevronRight />
        </button>
        <button className="profile-menu-card" onClick={onCompare}>
          <Scale />
          <div><b>Comparer mes projets</b><span>Classement et comparaison détaillée.</span></div>
          <ChevronRight />
        </button>
        <button className="profile-menu-card" onClick={onExport}>
          <Download />
          <div><b>Exporter mes données</b><span>Créer un rapport PDF de vos analyses.</span></div>
          <ChevronRight />
        </button>
        <button className="profile-menu-card" onClick={onPremium}>
          <Crown />
          <div><b>{isPremium ? "Gérer Premium" : "Découvrir Premium"}</b><span>{projects.length} projet(s) enregistré(s).</span></div>
          <ChevronRight />
        </button>
      </div>

      <section className="card profile-settings">
        <div className="section-title"><span><Settings size={18} /> Organisation de l’application</span></div>
        <p>L’analyse d’annonce, vos biens et le Radar du marché restent accessibles directement. Les objectifs, comparaisons et exports sont regroupés ici.</p>
      </section>
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
    ["dashboard", "Accueil", <Home size={18} />],
    ["announcement", "Analyse", <Sparkles size={18} />],
    ["portfolio", "Mes biens", <Building2 size={18} />],
    ["radar", "Radar", <Newspaper size={18} />],
    ["profile", "Profil", <UserRound size={18} />]
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
            <button
              key={id}
              className={`nav-item nav-${id} ${page === id ? "active" : ""}`}
              onClick={() => setPage(id)}
            >
              {icon}<span>{label}</span>
              {id === "portfolio" && <em>{projects.length}</em>}
              {!isPremium && ["announcement", "radar"].includes(id) && <Crown className="nav-premium-icon" size={13} />}
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
            <span>RENTA LOCATIVE V17</span>
            <h2>{page === "dashboard" ? "Bienvenue sur Renta Locative 👋"
              : page === "simulator" ? "Simulateur"
              : page === "compare" ? "Comparer"
              : page === "goals" ? "Objectifs"
              : nav.find((item) => item[0] === page)?.[1]}</h2>
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
          <div className="page-section dashboard-v17">
            <section className="analysis-hero-v17">
              <div className="analysis-hero-copy">
                <span className="eyebrow"><Sparkles size={14} /> ANALYSE INTELLIGENTE</span>
                <h1>Une annonce vous intéresse&nbsp;? Vérifiez-la avant de visiter.</h1>
                <p>Collez le lien ou le texte d’une annonce et obtenez un score, un prix conseillé, la rentabilité estimée et les principaux risques.</p>
                <div className="hero-buttons">
                  <button className="primary hero-analysis-button" onClick={() => setPage("announcement")}>
                    Analyser une annonce <ChevronRight size={17} />
                  </button>
                  <button className="secondary" onClick={() => setPage("simulator")}>Faire une simulation manuelle</button>
                </div>
                <div className="analysis-proof">
                  <span><Check size={14} /> Score sur 100</span>
                  <span><Check size={14} /> Prix conseillé</span>
                  <span><Check size={14} /> Risques détectés</span>
                </div>
              </div>
              <div className="analysis-preview-v17">
                <div className="preview-top"><span>APERÇU DE L’ANALYSE</span><b>Démo</b></div>
                <div className="preview-score"><strong>82</strong><small>/100</small></div>
                <h3>Opportunité à négocier</h3>
                <div className="preview-values">
                  <div><small>Prix affiché</small><b>219 000 €</b></div>
                  <div><small>Prix conseillé</small><b>204 000 €</b></div>
                </div>
                <div className="preview-alert"><AlertTriangle size={16} /><span>DPE et charges à vérifier</span></div>
              </div>
            </section>

            <div className="dashboard-v17-metrics">
              <div><span>Portefeuille</span><b>{euro(portfolioValue)}</b><small>{projects.length} bien(s)</small></div>
              <div><span>Cash-flow global</span><b>{euro(portfolioCashflow)}</b><small>Avant fiscalité</small></div>
              <div><span>Projet actif</span><b>{calc.score}/100</b><small>{project.name}</small></div>
            </div>

            <section className="dashboard-actions-v17">
              <button onClick={() => setPage("portfolio")}>
                <div className="action-icon"><FolderOpen /></div>
                <div><b>Mes investissements</b><span>Consultez vos projets enregistrés et leurs résultats.</span></div>
                <ChevronRight />
              </button>
              <button onClick={() => setPage("compare")}>
                <div className="action-icon"><Scale /></div>
                <div><b>Comparer des biens</b><span>Identifiez le projet le plus équilibré.</span></div>
                <ChevronRight />
              </button>
              <button onClick={() => setPage("radar")}>
                <div className="action-icon"><Newspaper /></div>
                <div><b>Radar du marché</b><span>Actualités et changements utiles à vos projets.</span></div>
                <ChevronRight />
              </button>
            </section>
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
                  "Détection appartement ou maison, surface habitable, terrain, charges et DPE",
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
        {page === "radar" && (
          isPremium
            ? <InvestorRadar projects={projects} />
            : <PremiumGate
                title="Accédez au Radar du marché"
                description="Recevez une veille immobilière structurée, sourcée et traduite en conséquences concrètes pour vos projets."
                features={[
                  "Tendances du crédit, des prix et du marché locatif",
                  "Veille fiscale et réglementaire avec statut clair",
                  "Tutoriels pratiques et études de cas",
                  "Impact personnalisé sur vos projets enregistrés"
                ]}
                preview={
                  <div className="radar-gate-preview">
                    <div><Activity size={22} /><b>Marché & fiscalité</b><span>Mise à jour automatique</span></div>
                    <div><ShieldCheck size={22} /><b>Sources vérifiées</b><span>Datées et traçables</span></div>
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

        {page === "profile" && (
          <ProfileHub
            projects={projects}
            isPremium={isPremium}
            premiumEmail={premiumEmail}
            onGoals={() => setPage("goals")}
            onCompare={() => setPage("compare")}
            onExport={exportPdf}
            onPremium={() => setCheckoutOpen(true)}
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
