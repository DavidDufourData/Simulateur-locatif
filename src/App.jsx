
import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3, Building2, Calculator, Check, ChevronRight, CircleDollarSign,
  Crown, Download, Gauge, Home, LineChart, Moon, Plus, Save, Scale,
  Sparkles, Sun, Target, Trash2, TrendingUp, WalletCards, X
} from "lucide-react";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_00w5kD3QvcjZcx82vxgQE01";
const toNumber = (value) => Number(String(value ?? "").replace(/\s/g, "").replace(",", ".")) || 0;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const euro = (value, digits = 0) =>
  Number(value || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: digits });
const pct = (value) => `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

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

function Goals({ projects }) {
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
      <section className="card premium-panel">
        <div><span className="premium-tag"><Crown size={15} /> PREMIUM</span><h2>Pilotez plusieurs scénarios et objectifs personnalisés.</h2><p>Débloquez les rapports détaillés, l’historique illimité et les recommandations avancées.</p></div>
        <a href={STRIPE_PAYMENT_LINK} className="premium-button">Découvrir Premium <ChevronRight size={17} /></a>
      </section>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(false);
  const [project, setProject] = useState(defaultProject);
  const [projects, setProjects] = useState([]);

  const calc = useMemo(() => calculate(project), [project]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("renta-v6-projects") || "[]");
    setProjects(stored);
    setDark(localStorage.getItem("renta-v6-dark") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("renta-v6-dark", dark ? "1" : "0");
  }, [dark]);

  const saveProject = () => {
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
    setProject({ ...defaultProject, id: "", name: "Nouveau projet" });
    setPage("simulator");
  };

  const nav = [
    ["dashboard", "Tableau de bord", <Home size={18} />],
    ["simulator", "Simulateur", <Calculator size={18} />],
    ["portfolio", "Mes biens", <Building2 size={18} />],
    ["compare", "Comparer", <Scale size={18} />],
    ["goals", "Objectifs", <Target size={18} />]
  ];

  const portfolioValue = projects.reduce((sum, p) => sum + toNumber(p.resaleValue), 0);
  const portfolioCashflow = projects.reduce((sum, p) => sum + calculate(p).monthlyCashflow, 0);
  const portfolioDebt = projects.reduce((sum, p) => sum + calculate(p).remainingCapital, 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="logo" onClick={() => setPage("dashboard")}><span><Building2 /></span><b>Renta Locative</b></button>
        <nav>
          {nav.map(([id, label, icon]) => (
            <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
              {icon}<span>{label}</span>{id === "portfolio" && <em>{projects.length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-premium">
          <Crown size={19} />
          <b>Passez à Premium</b>
          <p>Rapports, historique et analyses avancées.</p>
          <a href={STRIPE_PAYMENT_LINK}>Découvrir</a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span>RENTA LOCATIVE V6</span>
            <h2>{page === "dashboard" ? "Bonjour David 👋" : nav.find((item) => item[0] === page)?.[1]}</h2>
          </div>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="secondary" onClick={() => window.print()}><Download size={16} /> Export PDF</button>
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
              <button onClick={() => setPage("compare")}><Scale /><b>Comparer deux projets</b><span>Repérez le meilleur équilibre global.</span></button>
              <button onClick={() => setPage("goals")}><Target /><b>Suivre vos objectifs</b><span>Visualisez votre progression patrimoniale.</span></button>
            </div>
          </div>
        )}

        {page === "simulator" && <Simulator project={project} setProject={setProject} calc={calc} onSave={saveProject} />}
        {page === "portfolio" && <Portfolio projects={projects} onOpen={openProject} onDelete={deleteProject} onNew={newProject} />}
        {page === "compare" && <Compare projects={projects} />}
        {page === "goals" && <Goals projects={projects} />}
      </main>
    </div>
  );
}
