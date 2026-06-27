import React, { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AlertCircle, Check, Copy, ArrowRight, RefreshCw } from "lucide-react";
import { STATE_TAX_RATES } from "@/data/stateTaxRates";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type FilingStatus = "single" | "married" | "hoh";
type Frequency = "hourly" | "weekly" | "biweekly" | "semimonthly" | "monthly" | "annual";

const PERIODS: Record<Frequency, number> = {
  hourly: 2080, weekly: 52, biweekly: 26,
  semimonthly: 24, monthly: 12, annual: 1,
};

const FREQ_LABELS: Record<Frequency, string> = {
  hourly: "Hourly", weekly: "Weekly", biweekly: "Bi-Weekly",
  semimonthly: "Semi-Monthly", monthly: "Monthly", annual: "Annual",
};

/* ─── 2026 Tax Tables ────────────────────────────────────────────────────── */
const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 15000, married: 30000, hoh: 22500,
};

interface Bracket { min: number; max: number; rate: number; }

const FEDERAL_BRACKETS: Record<FilingStatus, Bracket[]> = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 17000, rate: 0.10 },
    { min: 17000, max: 64850, rate: 0.12 },
    { min: 64850, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
};

const SS_WAGE_BASE = 168600;

function calcFederalTax(taxableIncome: number, status: FilingStatus): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  for (const b of FEDERAL_BRACKETS[status]) {
    if (taxableIncome <= b.min) break;
    tax += (Math.min(taxableIncome, b.max) - b.min) * b.rate;
  }
  return tax;
}

/* ─── Iterative Solver ───────────────────────────────────────────────────── */
interface SolverResult {
  annualGross: number;
  annualFederal: number;
  annualState: number;
  annualSS: number;
  annualMedicare: number;
  annualNet: number;
  marginalRate: number;
  effectiveRate: number;
}

function solve(
  annualNetTarget: number,
  stateRate: number,
  status: FilingStatus,
  dependents: number,
): SolverResult {
  const stdDed = STANDARD_DEDUCTION[status];
  let gross = annualNetTarget / 0.65;

  for (let i = 0; i < 200; i++) {
    const federalTaxable = Math.max(0, gross - stdDed);
    const rawFederal = calcFederalTax(federalTaxable, status);
    const dependentCredit = Math.min(dependents * 2000, Math.max(0, rawFederal));
    const federal = Math.max(0, rawFederal - dependentCredit);
    const state = gross * stateRate;
    const ss = Math.min(gross, SS_WAGE_BASE) * 0.062;
    const medicare = gross * 0.0145;
    const net = gross - federal - state - ss - medicare;
    const diff = annualNetTarget - net;
    if (Math.abs(diff) < 0.005) {
      const topBracket = FEDERAL_BRACKETS[status].find(
        (b) => gross - stdDed > b.min && gross - stdDed <= b.max
      );
      const marginalRate = (topBracket?.rate ?? 0) + stateRate + (gross < SS_WAGE_BASE ? 0.0765 : 0.0145);
      return {
        annualGross: gross,
        annualFederal: federal,
        annualState: state,
        annualSS: ss,
        annualMedicare: medicare,
        annualNet: net,
        marginalRate,
        effectiveRate: (federal + state + ss + medicare) / gross,
      };
    }
    gross += diff * 0.9;
  }

  // Return best estimate
  const federalTaxable = Math.max(0, gross - stdDed);
  const rawFederal = calcFederalTax(federalTaxable, status);
  const dependentCredit = Math.min(dependents * 2000, Math.max(0, rawFederal));
  const federal = Math.max(0, rawFederal - dependentCredit);
  const state = gross * stateRate;
  const ss = Math.min(gross, SS_WAGE_BASE) * 0.062;
  const medicare = gross * 0.0145;
  const topBracket = FEDERAL_BRACKETS[status].find(
    (b) => gross - stdDed > b.min && gross - stdDed <= b.max
  );
  const marginalRate = (topBracket?.rate ?? 0) + stateRate + (gross < SS_WAGE_BASE ? 0.0765 : 0.0145);
  return {
    annualGross: gross, annualFederal: federal, annualState: state,
    annualSS: ss, annualMedicare: medicare, annualNet: gross - federal - state - ss - medicare,
    marginalRate, effectiveRate: (federal + state + ss + medicare) / gross,
  };
}

/* ─── SVG Donut Chart ────────────────────────────────────────────────────── */
const CHART_SEGMENTS = [
  { key: "net",      label: "Take-Home Pay", color: "#10b981" },
  { key: "federal",  label: "Federal Tax",   color: "#2563eb" },
  { key: "state",    label: "State Tax",     color: "#8b5cf6" },
  { key: "ss",       label: "Social Security", color: "#f59e0b" },
  { key: "medicare", label: "Medicare",      color: "#f43f5e" },
];

interface DonutSegment { key: string; value: number; }

function DonutChart({ segments, gross }: { segments: DonutSegment[]; gross: number }) {
  const R = 70;
  const SW = 30;
  const CX = 110;
  const CY = 110;
  const C = 2 * Math.PI * R;

  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const frac = gross > 0 ? seg.value / gross : 0;
    const dashLen = frac * C;
    const offset = -(cumulative / gross) * C;
    cumulative += seg.value;
    const meta = CHART_SEGMENTS.find((s) => s.key === seg.key)!;
    return { ...meta, dashLen, offset, frac };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={CX * 2} height={CY * 2} viewBox={`0 0 ${CX * 2} ${CY * 2}`}>
        {/* track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
        {arcs.map((arc) =>
          arc.frac > 0 ? (
            <circle
              key={arc.key}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={arc.color}
              strokeWidth={SW}
              strokeDasharray={`${arc.dashLen} ${C}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              style={{ transform: "rotate(-90deg)", transformOrigin: `${CX}px ${CY}px` }}
            />
          ) : null
        )}
        {/* center label */}
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="12" fill="#64748b" fontFamily="sans-serif">Take-Home</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#10b981" fontFamily="sans-serif">
          {gross > 0 ? ((segments.find((s) => s.key === "net")?.value ?? 0) / gross * 100).toFixed(1) + "%" : "—"}
        </text>
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {CHART_SEGMENTS.map((seg) => {
          const arc = arcs.find((a) => a.key === seg.key);
          return (
            <div key={seg.key} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[#475569] text-xs">{seg.label}</span>
              <span className="ml-auto text-xs font-semibold text-[#0f172a]">{arc ? (arc.frac * 100).toFixed(1) + "%" : "0%"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(n: number): string {
  return (n * 100).toFixed(2) + "%";
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
interface FormState {
  desiredNet: string;
  frequency: Frequency;
  state: string;
  filingStatus: FilingStatus;
  dependents: number;
}

interface ResultView {
  res: SolverResult;
  periodMultiplier: number;
  freqLabel: string;
  stateName: string;
  showAnnual: boolean;
}

export default function ReversePaycheck() {
  const [form, setForm] = useState<FormState>({
    desiredNet: "",
    frequency: "biweekly",
    state: "TX",
    filingStatus: "single",
    dependents: 0,
  });
  const [result, setResult] = useState<ResultView | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setResult(null);
  }

  const handleCalculate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const netPerPeriod = parseFloat(form.desiredNet.replace(/,/g, ""));
    if (!netPerPeriod || netPerPeriod <= 0) {
      setError("Please enter a valid desired net pay amount.");
      return;
    }
    if (netPerPeriod > 2000000) {
      setError("Please enter a reasonable net pay amount.");
      return;
    }

    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const stateRate = stateInfo?.rate ?? 0;
    const periods = PERIODS[form.frequency];
    const annualNet = netPerPeriod * periods;

    const res = solve(annualNet, stateRate, form.filingStatus, form.dependents);

    setResult({
      res,
      periodMultiplier: 1 / periods,
      freqLabel: FREQ_LABELS[form.frequency],
      stateName: stateInfo?.name ?? form.state,
      showAnnual: false,
    });

    setTimeout(() => {
      document.getElementById("rp-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [form]);

  function toggleView() {
    setResult((r) => r ? { ...r, showAnnual: !r.showAnnual } : r);
  }

  function handleShare() {
    if (!result) return;
    const { res, freqLabel, stateName, periodMultiplier } = result;
    const m = periodMultiplier;
    const text = [
      `Reverse Paycheck Calculation — NetMoneyTools.com`,
      ``,
      `${freqLabel} Gross Pay: ${fmt(res.annualGross * m)}`,
      `  Federal Income Tax: ${fmt(res.annualFederal * m)}`,
      `  ${stateName} State Tax: ${fmt(res.annualState * m)}`,
      `  Social Security: ${fmt(res.annualSS * m)}`,
      `  Medicare: ${fmt(res.annualMedicare * m)}`,
      `${freqLabel} Net Take-Home: ${fmt(res.annualNet * m)}`,
      ``,
      `Effective Tax Rate: ${pct(res.effectiveRate)}`,
      `Marginal Rate: ${pct(res.marginalRate)}`,
      ``,
      `Calculate yours: https://netmoneytools.com/reverse-paycheck-calculator`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const r = result;
  const m = r?.periodMultiplier ?? 1;
  const showAnnual = r?.showAnnual ?? false;
  const mult = r ? (showAnnual ? 1 : m) : 1;
  const periodLabel = r ? (showAnnual ? "Annual" : r.freqLabel) : "";

  const chartSegments: DonutSegment[] = r ? [
    { key: "net",      value: r.res.annualNet },
    { key: "federal",  value: r.res.annualFederal },
    { key: "state",    value: r.res.annualState },
    { key: "ss",       value: r.res.annualSS },
    { key: "medicare", value: r.res.annualMedicare },
  ] : [];

  return (
    <>
      <Helmet>
        <title>Reverse Paycheck Calculator 2026 | Find Your Gross Pay | NetMoneyTools</title>
        <meta
          name="description"
          content="Enter your desired take-home pay and instantly find the gross salary you need. Uses 2026 federal and state tax brackets with FICA. Works for any pay frequency."
        />
        <link rel="canonical" href="https://netmoneytools.com/reverse-paycheck-calculator" />
        <meta property="og:title" content="Reverse Paycheck Calculator 2026 | NetMoneyTools" />
        <meta property="og:description" content="Find your required gross salary from your desired net take-home pay. 2026 tax brackets, all 50 states." />
        <meta property="og:url" content="https://netmoneytools.com/reverse-paycheck-calculator" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-8">

        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            Reverse Paycheck Calculator
          </h1>
          <p className="text-[#475569]">
            Enter your desired take-home pay to find the gross salary you need to earn. Uses 2026 federal and state tax brackets.
          </p>
        </header>

        {/* Form */}
        <form
          onSubmit={handleCalculate}
          className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-5"
        >
          <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider border-b border-[#e2e8f0] pb-2">
            What Take-Home Pay Do You Want?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-sm font-semibold text-[#0f172a]">Desired Net Pay</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                <input
                  type="number" min="1" step="0.01" placeholder="e.g. 3500"
                  value={form.desiredNet}
                  onChange={(e) => setField("desiredNet", e.target.value)}
                  className="w-full pl-7 pr-4 py-3 border border-[#e2e8f0] rounded-lg text-[#0f172a] text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">Pay Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setField("frequency", e.target.value as Frequency)}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                {(Object.keys(FREQ_LABELS) as Frequency[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}{f === "hourly" ? " (40 hrs/wk)" : ""}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">State</label>
              <select
                value={form.state}
                onChange={(e) => setField("state", e.target.value)}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                {STATE_TAX_RATES.map((s) => (
                  <option key={s.abbreviation} value={s.abbreviation}>{s.name} ({s.abbreviation})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">Filing Status</label>
              <select
                value={form.filingStatus}
                onChange={(e) => setField("filingStatus", e.target.value as FilingStatus)}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                <option value="single">Single</option>
                <option value="married">Married Filing Jointly</option>
                <option value="hoh">Head of Household</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">
                Dependents
                <span className="text-[#94a3b8] font-normal ml-1 text-xs">(children under 17 for $2k credit)</span>
              </label>
              <select
                value={form.dependents}
                onChange={(e) => setField("dependents", parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? "None" : i}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#f43f5e] text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
          >
            <RefreshCw size={17} />
            Find My Gross Pay
          </button>
        </form>

        {/* Results */}
        {r && (
          <div id="rp-results" className="space-y-5">

            {/* Top bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-[#0f172a]">Your Results</h2>
              <div className="flex gap-2">
                <button
                  onClick={toggleView}
                  className="flex items-center gap-1.5 px-3 py-2 border border-[#e2e8f0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors"
                >
                  {showAnnual ? "Show Per Period" : "Show Annual"}
                </button>
                <button
                  onClick={handleShare}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${copied ? "bg-[#10b981] text-white" : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"}`}
                >
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Share Results</>}
                </button>
              </div>
            </div>

            {/* Summary hero */}
            <div className="bg-[#2563eb] rounded-xl p-6 text-white">
              <p className="text-blue-200 text-sm font-medium mb-1">{periodLabel} Gross Pay Needed</p>
              <p className="text-4xl font-extrabold mb-3">{fmt(r.res.annualGross * mult)}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="bg-white/10 rounded-lg px-3 py-1.5">
                  Effective Rate: <strong>{pct(r.res.effectiveRate)}</strong>
                </span>
                <span className="bg-white/10 rounded-lg px-3 py-1.5">
                  Marginal Rate: <strong>{pct(r.res.marginalRate)}</strong>
                </span>
                <span className="bg-white/10 rounded-lg px-3 py-1.5">
                  {r.stateName} State: <strong>{(() => { const si = STATE_TAX_RATES.find(s => s.name === r.stateName); return si ? (si.rate * 100).toFixed(2) + "%" : "—"; })()}</strong>
                </span>
              </div>
            </div>

            {/* Chart + Breakdown side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Donut chart */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 flex items-center justify-center">
                <DonutChart segments={chartSegments} gross={r.res.annualGross} />
              </div>

              {/* Breakdown table */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
                <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#e2e8f0]">
                  <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">{periodLabel} Breakdown</p>
                </div>
                <div className="divide-y divide-[#f8fafc]">
                  <BreakdownRow
                    label="Gross Pay"
                    amount={r.res.annualGross * mult}
                    pctOfGross={1}
                    color="#2563eb"
                    bold
                  />
                  <BreakdownRow
                    label="Federal Income Tax"
                    amount={-r.res.annualFederal * mult}
                    pctOfGross={r.res.annualFederal / r.res.annualGross}
                    color="#2563eb"
                    deduction
                  />
                  <BreakdownRow
                    label={`${r.stateName} State Tax`}
                    amount={-r.res.annualState * mult}
                    pctOfGross={r.res.annualState / r.res.annualGross}
                    color="#8b5cf6"
                    deduction
                  />
                  <BreakdownRow
                    label="Social Security (6.2%)"
                    amount={-r.res.annualSS * mult}
                    pctOfGross={r.res.annualSS / r.res.annualGross}
                    color="#f59e0b"
                    deduction
                  />
                  <BreakdownRow
                    label="Medicare (1.45%)"
                    amount={-r.res.annualMedicare * mult}
                    pctOfGross={r.res.annualMedicare / r.res.annualGross}
                    color="#f43f5e"
                    deduction
                  />
                  <BreakdownRow
                    label="Net Take-Home"
                    amount={r.res.annualNet * mult}
                    pctOfGross={r.res.annualNet / r.res.annualGross}
                    color="#10b981"
                    bold
                    highlight
                  />
                </div>
              </div>
            </div>

            {/* Period comparison table */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#e2e8f0]">
                <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Gross Pay Across All Pay Frequencies</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Frequency</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Gross</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase hidden sm:table-cell">Total Tax</th>
                      <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f8fafc]">
                    {(Object.keys(FREQ_LABELS) as Frequency[]).map((f) => {
                      const pm = 1 / PERIODS[f];
                      const totalTax = r.res.annualFederal + r.res.annualState + r.res.annualSS + r.res.annualMedicare;
                      const isActive = f === form.frequency;
                      return (
                        <tr key={f} className={isActive ? "bg-blue-50" : ""}>
                          <td className={`px-5 py-2.5 font-medium ${isActive ? "text-[#2563eb]" : "text-[#0f172a]"}`}>
                            {FREQ_LABELS[f]}
                            {isActive && <span className="ml-2 text-xs bg-[#2563eb] text-white px-1.5 py-0.5 rounded">selected</span>}
                          </td>
                          <td className="px-5 py-2.5 text-right font-semibold text-[#0f172a]">{fmt(r.res.annualGross * pm)}</td>
                          <td className="px-5 py-2.5 text-right text-[#f43f5e] hidden sm:table-cell">{fmt(totalTax * pm)}</td>
                          <td className="px-5 py-2.5 text-right font-semibold text-[#10b981]">{fmt(r.res.annualNet * pm)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-[#fef9ee] border border-[#f59e0b]/30 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-[#92400e]">Assumptions &amp; Limitations</p>
              <ul className="text-xs text-[#92400e] space-y-1 list-disc list-inside leading-relaxed">
                <li>Uses 2026 federal tax brackets and standard deduction ({form.filingStatus === "married" ? "$30,000" : form.filingStatus === "hoh" ? "$22,500" : "$15,000"} for {form.filingStatus === "married" ? "married filing jointly" : form.filingStatus === "hoh" ? "head of household" : "single"}).</li>
                <li>Dependents reduce federal tax via Child Tax Credit ($2,000 each, assumes qualifying children under 17).</li>
                <li>State tax uses a simplified flat rate; actual state taxes may use progressive brackets.</li>
                <li>Social Security capped at ${SS_WAGE_BASE.toLocaleString()} wage base. No pre-tax deductions (401k, HSA) applied.</li>
                <li>Hourly assumes 40 hours/week × 52 weeks = 2,080 hours per year.</li>
              </ul>
            </div>

            {/* Related tools */}
            <div className="bg-[#f0f4ff] border border-[#2563eb]/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-[#0f172a] mb-1">Need more detail?</p>
                <p className="text-sm text-[#475569]">Use the Paycheck Calculator to include pre-tax deductions and see a full breakdown.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link to="/paycheck-calculator" className="flex items-center gap-1.5 px-3 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-[#1d4ed8] transition-colors">
                  Paycheck Calc <ArrowRight size={14} />
                </Link>
                <Link to="/gross-up-calculator" className="flex items-center gap-1.5 px-3 py-2 border border-[#2563eb] text-[#2563eb] rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
                  Gross Up <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── Breakdown Row ──────────────────────────────────────────────────────── */
function BreakdownRow({
  label, amount, pctOfGross, color, bold, deduction, highlight,
}: {
  label: string; amount: number; pctOfGross: number;
  color: string; bold?: boolean; deduction?: boolean; highlight?: boolean;
}) {
  const barWidth = Math.max(0, Math.min(100, Math.abs(pctOfGross) * 100));
  return (
    <div className={`px-5 py-3 ${highlight ? "bg-[#f0fdf4]" : ""}`}>
      <div className="flex justify-between items-start mb-1.5">
        <span className={`text-sm ${bold ? "font-bold text-[#0f172a]" : "text-[#475569]"}`}>{label}</span>
        <div className="text-right">
          <span className={`text-sm font-semibold ${deduction ? "text-[#f43f5e]" : "font-bold"}`} style={!deduction ? { color } : undefined}>
            {deduction ? "-" : ""}{fmt(Math.abs(amount))}
          </span>
          <span className="block text-xs text-[#94a3b8]">{(pctOfGross * 100).toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
