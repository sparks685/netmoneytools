import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Scale, Download, Printer, AlertCircle, ArrowRight, Info,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { STATE_TAX_RATES } from "@/data/stateTaxRates";
import jsPDF from "jspdf";

type FilingStatus = "single" | "married" | "hoh";

const SS_WAGE_BASE = 168600;

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

function federalTax(income: number, status: FilingStatus): number {
  if (income <= 0) return 0;
  let tax = 0;
  for (const b of FEDERAL_BRACKETS[status]) {
    if (income <= b.min) break;
    tax += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return tax;
}

function fmt(n: number, showSign = false): string {
  const s = Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (showSign && n > 0) return `+${s}`;
  if (showSign && n < 0) return `-${s}`;
  return s;
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

interface W2Result {
  gross: number;
  preTaxDeductions: number;
  taxableIncome: number;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  totalFICA: number;
  totalTax: number;
  takeHome: number;
  effectiveTaxRate: number;
  employerCost: number;
}

interface K1099Result {
  grossRevenue: number;
  businessExpenses: number;
  netSEIncome: number;
  seTax: number;
  seTaxDeduction: number;
  qbiDeduction: number;
  federalTaxableIncome: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  takeHome: number;
  effectiveTaxRate: number;
  requiredGrossToMatchW2: number;
}

function calcW2(
  annualGross: number,
  stateRate: number,
  status: FilingStatus,
  preTaxDeductions: number
): W2Result {
  const taxableIncome = Math.max(0, annualGross - preTaxDeductions);
  const fed = federalTax(taxableIncome, status);
  const state = taxableIncome * stateRate;
  const ss = Math.min(annualGross, SS_WAGE_BASE) * 0.062;
  const medicare = annualGross * 0.0145;
  const totalFICA = ss + medicare;
  const totalTax = fed + state + totalFICA;
  const takeHome = annualGross - preTaxDeductions - totalTax;

  return {
    gross: annualGross,
    preTaxDeductions,
    taxableIncome,
    federalTax: fed,
    stateTax: state,
    socialSecurity: ss,
    medicare,
    totalFICA,
    totalTax,
    takeHome,
    effectiveTaxRate: totalTax / annualGross,
    employerCost: annualGross + Math.min(annualGross, SS_WAGE_BASE) * 0.062 + annualGross * 0.0145,
  };
}

function calc1099(
  annualGross: number,
  stateRate: number,
  status: FilingStatus,
  businessExpenses: number,
  useQBI: boolean
): K1099Result {
  const netSEIncome = Math.max(0, annualGross - businessExpenses);
  const seTaxBase = netSEIncome * 0.9235;
  const seTax = seTaxBase * 0.153;
  const seTaxDeduction = seTax * 0.5;

  const incomeAfterSEDeduction = Math.max(0, netSEIncome - seTaxDeduction);
  const qbiDeduction = useQBI ? incomeAfterSEDeduction * 0.20 : 0;
  const federalTaxableIncome = Math.max(0, incomeAfterSEDeduction - qbiDeduction);

  const fed = federalTax(federalTaxableIncome, status);
  const state = netSEIncome * stateRate;
  const totalTax = fed + state + seTax;
  const takeHome = annualGross - businessExpenses - totalTax;

  return {
    grossRevenue: annualGross,
    businessExpenses,
    netSEIncome,
    seTax,
    seTaxDeduction,
    qbiDeduction,
    federalTaxableIncome,
    federalTax: fed,
    stateTax: state,
    totalTax,
    takeHome,
    effectiveTaxRate: totalTax / annualGross,
    requiredGrossToMatchW2: 0,
  };
}

function calcRequiredGross(
  w2TakeHome: number,
  stateRate: number,
  status: FilingStatus,
  businessExpenses: number,
  useQBI: boolean
): number {
  let gross = w2TakeHome * 1.35;
  for (let i = 0; i < 150; i++) {
    const res = calc1099(gross, stateRate, status, businessExpenses, useQBI);
    const diff = w2TakeHome - res.takeHome;
    if (Math.abs(diff) < 1) break;
    gross += diff * 0.85;
  }
  return gross;
}

interface FormState {
  annualGross: string;
  state: string;
  filingStatus: FilingStatus;
  w2Deductions: string;
  businessExpenses: string;
  useQBI: boolean;
}

interface Results {
  w2: W2Result;
  k1099: K1099Result;
  stateName: string;
}

export default function ContractorCompare() {
  const [form, setForm] = useState<FormState>({
    annualGross: "",
    state: "TX",
    filingStatus: "single",
    w2Deductions: "0",
    businessExpenses: "0",
    useQBI: true,
  });
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const gross = parseFloat(form.annualGross.replace(/,/g, ""));
    if (!gross || gross <= 0) { setError("Please enter a valid annual gross income."); return; }
    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const stateRate = stateInfo?.rate ?? 0;
    const preTax = Math.max(0, parseFloat(form.w2Deductions) || 0);
    const bizExp = Math.max(0, parseFloat(form.businessExpenses) || 0);

    const w2 = calcW2(gross, stateRate, form.filingStatus, preTax);
    const raw1099 = calc1099(gross, stateRate, form.filingStatus, bizExp, form.useQBI);
    const required = calcRequiredGross(w2.takeHome, stateRate, form.filingStatus, bizExp, form.useQBI);
    const k1099: K1099Result = { ...raw1099, requiredGrossToMatchW2: required };

    setResults({ w2, k1099, stateName: stateInfo?.name ?? form.state });
    setTimeout(() => document.getElementById("compare-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function handlePrint() { window.print(); }

  function handleDownloadPDF() {
    if (!results) return;
    const { w2, k1099, stateName } = results;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const lm = 50;
    let y = 50;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 612, 46, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text("1099 vs W-2 Comparison", lm, 30);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("netmoneytools.com — Estimates only", 562, 30, { align: "right" });

    y = 70;
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const status = form.filingStatus === "hoh" ? "Head of Household" : form.filingStatus === "married" ? "Married Filing Jointly" : "Single";
    doc.text(`Gross Income: ${fmt(w2.gross)}  |  State: ${stateName}  |  Filing: ${status}`, lm, y);

    y += 24;
    const colW = 240;
    const col1 = lm;
    const col2 = lm + colW;
    const col3 = lm + colW * 2;

    const header = (label: string, yy: number) => {
      doc.setFillColor(248, 250, 252);
      doc.rect(lm, yy - 12, 512, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(label, col1, yy);
    };

    const row = (label: string, v1: string, v2: string, yy: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(label, col1, yy);
      doc.setTextColor(15, 23, 42);
      doc.text(v1, col2, yy, { align: "right" });
      doc.text(v2, col3 + 100, yy, { align: "right" });
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("", col1, y);
    doc.setTextColor(37, 99, 235);
    doc.text("W-2 Employee", col2, y, { align: "right" });
    doc.setTextColor(16, 185, 129);
    doc.text("1099 Contractor", col3 + 100, y, { align: "right" });
    y += 6;

    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.line(lm, y, 562, y); y += 14;

    header("Income", y); y += 14;
    row("Gross / Revenue", fmt(w2.gross), fmt(k1099.grossRevenue), y); y += 12;
    row("Pre-tax / Business Deductions", `(${fmt(w2.preTaxDeductions)})`, `(${fmt(k1099.businessExpenses)})`, y); y += 12;
    row("Taxable Base", fmt(w2.taxableIncome), fmt(k1099.netSEIncome), y); y += 16;

    header("Taxes", y); y += 14;
    row("Federal Income Tax", `(${fmt(w2.federalTax)})`, `(${fmt(k1099.federalTax)})`, y); y += 12;
    row("State Tax", `(${fmt(w2.stateTax)})`, `(${fmt(k1099.stateTax)})`, y); y += 12;
    row("FICA / Self-Employment Tax", `(${fmt(w2.totalFICA)})`, `(${fmt(k1099.seTax)})`, y); y += 12;
    if (k1099.seTaxDeduction > 0) { row("SE Tax Deduction (50%)", "N/A", fmt(k1099.seTaxDeduction), y); y += 12; }
    if (k1099.qbiDeduction > 0) { row("QBI Deduction (20%)", "N/A", fmt(k1099.qbiDeduction), y); y += 12; }
    row("Total Tax", `(${fmt(w2.totalTax)})`, `(${fmt(k1099.totalTax)})`, y, true); y += 16;

    header("Summary", y); y += 14;
    row("Effective Tax Rate", pct(w2.effectiveTaxRate), pct(k1099.effectiveTaxRate), y); y += 12;
    row("Take-Home Pay", fmt(w2.takeHome), fmt(k1099.takeHome), y, true); y += 12;
    row("Difference vs W-2", "—", fmt(k1099.takeHome - w2.takeHome, true), y); y += 20;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`To match W-2 take-home as 1099, you need to charge: ${fmt(k1099.requiredGrossToMatchW2)}/year`, lm, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Estimates only. Consult a qualified tax professional. QBI eligibility rules apply. 2026 federal tax brackets.", lm, y);

    doc.save("1099-vs-w2-comparison.pdf");
  }

  const r = results;
  const diff = r ? r.k1099.takeHome - r.w2.takeHome : 0;

  return (
    <>
      <Helmet>
        <title>1099 vs W-2 Calculator 2026 | Contractor vs Employee Tax Compare | NetMoneyTools</title>
        <meta name="description" content="Compare true take-home pay as a 1099 independent contractor vs W-2 employee. See self-employment tax, QBI deduction, and how much you need to charge to break even." />
        <link rel="canonical" href="https://netmoneytools.com/1099-vs-w2" />
        <meta property="og:title" content="1099 vs W-2 Tax Calculator 2026 | NetMoneyTools" />
        <meta property="og:description" content="Side-by-side comparison of contractor vs employee take-home pay including SE tax, QBI deduction, and break-even analysis." />
        <meta property="og:url" content="https://netmoneytools.com/1099-vs-w2" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            1099 vs W-2 Compare
          </h1>
          <p className="text-[#475569]">
            See the true financial difference between being a W-2 employee and a 1099 independent contractor at the same income level.
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleCalculate} className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-6">

          <div>
            <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider mb-4 pb-2 border-b border-[#e2e8f0]">
              Income & Tax Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Annual Gross Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                  <input
                    type="number" min="0" step="1000" placeholder="e.g. 100000"
                    value={form.annualGross}
                    onChange={(e) => setField("annualGross", e.target.value)}
                    className="w-full pl-7 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                    required
                  />
                </div>
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
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-bold text-[#2563eb] uppercase tracking-wider mb-3 pb-2 border-b border-blue-100">
                W-2 Employee
              </h2>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">
                  Annual Pre-Tax Deductions
                  <span className="text-[#94a3b8] font-normal ml-1">(401k, health ins., HSA)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                  <input
                    type="number" min="0" step="100" placeholder="e.g. 8000"
                    value={form.w2Deductions}
                    onChange={(e) => setField("w2Deductions", e.target.value)}
                    className="w-full pl-7 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#10b981] uppercase tracking-wider mb-3 pb-2 border-b border-emerald-100">
                1099 Contractor
              </h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-[#0f172a]">
                    Annual Business Expenses
                    <span className="text-[#94a3b8] font-normal ml-1">(deductible)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                    <input
                      type="number" min="0" step="100" placeholder="e.g. 5000"
                      value={form.businessExpenses}
                      onChange={(e) => setField("businessExpenses", e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                    />
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.useQBI}
                    onChange={(e) => setField("useQBI", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#e2e8f0] text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
                  />
                  <span className="text-sm text-[#0f172a]">
                    <span className="font-semibold">Apply QBI Deduction (20%)</span>
                    <span className="text-[#475569] block text-xs mt-0.5">Qualified Business Income deduction for eligible self-employed filers</span>
                  </span>
                </label>
              </div>
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
            <Scale size={18} />
            Compare W-2 vs 1099
          </button>
        </form>

        {/* Results */}
        {r && (
          <div id="compare-results" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-[#0f172a]">Comparison Results</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors">
                  <Printer size={15} /> Print
                </button>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-sm font-semibold transition-colors">
                  <Download size={15} /> Download PDF
                </button>
              </div>
            </div>

            {/* Top summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
                <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1 font-sans">W-2 Take-Home</p>
                <p className="text-2xl font-extrabold text-[#2563eb]">{fmt(r.w2.takeHome)}</p>
                <p className="text-xs text-[#475569] mt-1">Effective rate: {pct(r.w2.effectiveTaxRate)}</p>
              </div>
              <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
                <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1 font-sans">1099 Take-Home</p>
                <p className="text-2xl font-extrabold text-[#10b981]">{fmt(r.k1099.takeHome)}</p>
                <p className="text-xs text-[#475569] mt-1">Effective rate: {pct(r.k1099.effectiveTaxRate)}</p>
              </div>
              <div className={`rounded-xl border shadow-sm p-5 ${diff >= 0 ? "bg-[#f0fdf4] border-[#10b981]/30" : "bg-rose-50 border-rose-200"}`}>
                <p className="text-xs text-[#94a3b8] uppercase tracking-wider mb-1 font-sans">1099 Difference</p>
                <div className="flex items-center gap-1.5">
                  {diff > 0 ? <TrendingUp size={20} className="text-[#10b981]" /> : diff < 0 ? <TrendingDown size={20} className="text-[#f43f5e]" /> : <Minus size={20} className="text-[#94a3b8]" />}
                  <p className={`text-2xl font-extrabold ${diff >= 0 ? "text-[#10b981]" : "text-[#f43f5e]"}`}>{fmt(diff, true)}</p>
                </div>
                <p className="text-xs text-[#475569] mt-1">vs W-2 annually</p>
              </div>
            </div>

            {/* Side-by-side table */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-md overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-3 border-b border-[#e2e8f0]">
                <div className="p-4 bg-[#f8fafc]" />
                <div className="p-4 bg-blue-50 border-l border-[#e2e8f0] text-center">
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wider">W-2 Employee</p>
                </div>
                <div className="p-4 bg-emerald-50 border-l border-[#e2e8f0] text-center">
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wider">1099 Contractor</p>
                </div>
              </div>

              {/* Section: Income */}
              <SectionHeader label="Income" />
              <CompareRow label="Gross / Revenue" v1={fmt(r.w2.gross)} v2={fmt(r.k1099.grossRevenue)} />
              <CompareRow label="Pre-Tax / Business Deductions" v1={r.w2.preTaxDeductions > 0 ? `(${fmt(r.w2.preTaxDeductions)})` : "—"} v2={r.k1099.businessExpenses > 0 ? `(${fmt(r.k1099.businessExpenses)})` : "—"} sub1={r.w2.preTaxDeductions > 0 ? "401k, health ins., HSA" : undefined} sub2={r.k1099.businessExpenses > 0 ? "Deductible expenses" : undefined} />
              <CompareRow label="Taxable Base" v1={fmt(r.w2.taxableIncome)} v2={fmt(r.k1099.netSEIncome)} highlight />

              {/* Section: Taxes */}
              <SectionHeader label="Taxes" />
              <CompareRow label="Federal Income Tax" v1={`(${fmt(r.w2.federalTax)})`} v2={`(${fmt(r.k1099.federalTax)})`} red />
              <CompareRow label={`${r.stateName} State Tax`} v1={`(${fmt(r.w2.stateTax)})`} v2={`(${fmt(r.k1099.stateTax)})`} red />
              <CompareRow
                label="FICA / Self-Employment Tax"
                v1={`(${fmt(r.w2.totalFICA)})`}
                v2={`(${fmt(r.k1099.seTax)})`}
                sub1="7.65% employee share"
                sub2="15.3% of 92.35% of net"
                red
              />
              <CompareRow label="SE Tax Deduction (50%)" v1="N/A" v2={r.k1099.seTaxDeduction > 0 ? fmt(r.k1099.seTaxDeduction) : "—"} sub2="Reduces federal taxable income" green2 />
              <CompareRow label="QBI Deduction (20%)" v1="N/A" v2={r.k1099.qbiDeduction > 0 ? fmt(r.k1099.qbiDeduction) : form.useQBI ? "—" : "Not applied"} sub2={form.useQBI ? "Qualified Business Income" : undefined} green2 />
              <CompareRow label="Total Tax Burden" v1={`(${fmt(r.w2.totalTax)})`} v2={`(${fmt(r.k1099.totalTax)})`} red bold />

              {/* Section: Summary */}
              <SectionHeader label="Summary" />
              <CompareRow label="Effective Tax Rate" v1={pct(r.w2.effectiveTaxRate)} v2={pct(r.k1099.effectiveTaxRate)} />
              <CompareRow label="Annual Take-Home Pay" v1={fmt(r.w2.takeHome)} v2={fmt(r.k1099.takeHome)} bold highlight />
              <CompareRow label="Employer's True Cost" v1={fmt(r.w2.employerCost)} v2={fmt(r.k1099.grossRevenue)} sub1="Gross + 7.65% FICA match" sub2="Just the gross payment" />
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-[#0f172a] text-lg">Key Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-[#f0f4ff] rounded-lg">
                  <Info size={16} className="text-[#2563eb] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#0f172a]">
                    <strong>Break-even rate:</strong> To match the W-2 take-home of{" "}
                    <strong>{fmt(r.w2.takeHome)}/year</strong> as a 1099 contractor, you need to charge{" "}
                    <strong className="text-[#2563eb]">{fmt(r.k1099.requiredGrossToMatchW2)}/year</strong>
                    {" "}({pct((r.k1099.requiredGrossToMatchW2 - r.w2.gross) / r.w2.gross)} more than the W-2 salary).
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#f0fdf4] rounded-lg">
                  <Info size={16} className="text-[#10b981] mt-0.5 shrink-0" />
                  <p className="text-sm text-[#0f172a]">
                    <strong>Tax difference:</strong> As a 1099 contractor at the same gross, you pay{" "}
                    <strong className={r.k1099.totalTax > r.w2.totalTax ? "text-[#f43f5e]" : "text-[#10b981]"}>
                      {fmt(Math.abs(r.k1099.totalTax - r.w2.totalTax))} {r.k1099.totalTax > r.w2.totalTax ? "more" : "less"}
                    </strong>{" "}
                    in total taxes — the SE tax replaces employee FICA but at double the rate since you pay both halves.
                  </p>
                </div>
                {r.k1099.qbiDeduction > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-[#fef9ee] rounded-lg">
                    <Info size={16} className="text-[#f59e0b] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#0f172a]">
                      <strong>QBI benefit:</strong> The 20% Qualified Business Income deduction saves you approximately{" "}
                      <strong>{fmt(r.k1099.qbiDeduction * 0.22)}</strong> in federal taxes (at the 22% bracket). QBI eligibility rules apply — consult a tax professional.
                    </p>
                  </div>
                )}
                {r.k1099.businessExpenses > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                    <Info size={16} className="text-[#64748b] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#0f172a]">
                      <strong>Business expenses:</strong> Your {fmt(r.k1099.businessExpenses)} in deductible expenses reduce your net SE income and taxable base, partially offsetting the SE tax burden.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#fef9ee] border border-[#f59e0b]/30 rounded-xl p-4">
              <p className="text-xs text-[#92400e] leading-relaxed">
                <strong>Disclaimer:</strong> Estimates only. Uses 2026 federal tax brackets and simplified state flat rates. QBI deduction eligibility depends on business type, income level, and other IRS rules (phase-outs apply at higher incomes for specified service trades). Self-employment tax calculation uses the standard 92.35% factor. Does not include AMT, NIIT, local taxes, or state-specific self-employment rules. Consult a CPA for advice specific to your situation.
              </p>
            </div>
          </div>
        )}

        {/* Related tools */}
        <section className="bg-[#f0f4ff] border border-[#2563eb]/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-[#0f172a] mb-1">More payroll tools</h3>
            <p className="text-sm text-[#475569]">Calculate exact take-home pay or find the gross needed for a net target.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/paycheck-calculator" className="flex items-center gap-1.5 px-3 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-[#1d4ed8] transition-colors">
              Paycheck <ArrowRight size={14} />
            </Link>
            <Link to="/gross-up-calculator" className="flex items-center gap-1.5 px-3 py-2 border border-[#2563eb] text-[#2563eb] rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors">
              Gross Up <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-3 bg-[#f8fafc] border-y border-[#e2e8f0]">
      <div className="px-4 py-2 col-span-3">
        <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function CompareRow({
  label, v1, v2, sub1, sub2, red, green2, bold, highlight,
}: {
  label: string; v1: string; v2: string;
  sub1?: string; sub2?: string;
  red?: boolean; green2?: boolean; bold?: boolean; highlight?: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 border-b border-[#f1f5f9] ${highlight ? "bg-[#f8fafc]" : ""}`}>
      <div className="px-4 py-3">
        <p className={`text-sm ${bold ? "font-semibold text-[#0f172a]" : "text-[#475569]"}`}>{label}</p>
      </div>
      <div className="px-4 py-3 border-l border-[#f1f5f9] text-right">
        <p className={`text-sm ${bold ? "font-bold" : "font-medium"} ${red ? "text-[#f43f5e]" : "text-[#0f172a]"}`}>{v1}</p>
        {sub1 && <p className="text-xs text-[#94a3b8] mt-0.5">{sub1}</p>}
      </div>
      <div className="px-4 py-3 border-l border-[#f1f5f9] text-right">
        <p className={`text-sm ${bold ? "font-bold" : "font-medium"} ${red ? "text-[#f43f5e]" : green2 ? "text-[#10b981]" : "text-[#0f172a]"}`}>{v2}</p>
        {sub2 && <p className="text-xs text-[#94a3b8] mt-0.5">{sub2}</p>}
      </div>
    </div>
  );
}
