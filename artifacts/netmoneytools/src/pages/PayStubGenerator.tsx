import React, { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  FileText, Download, Printer, RotateCcw, AlertCircle, ArrowRight, Plus, Trash2
} from "lucide-react";
import { calcPaycheck, type FilingStatus, type PayFrequency } from "@/lib/taxCalc";
import { STATE_TAX_RATES } from "@/data/stateTaxRates";
import jsPDF from "jspdf";

const FREQ_LABEL: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  semimonthly: "Semi-Monthly",
  monthly: "Monthly",
};

interface Deduction {
  id: string;
  label: string;
  amount: string;
}

interface FormState {
  employeeName: string;
  employerName: string;
  employerAddress: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  frequency: PayFrequency;
  grossPay: string;
  filingStatus: FilingStatus;
  state: string;
  deductions: Deduction[];
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const today = new Date();
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const twoWeeksAgo = new Date(today);
twoWeeksAgo.setDate(today.getDate() - 13);

const DEFAULT_FORM: FormState = {
  employeeName: "",
  employerName: "",
  employerAddress: "",
  periodStart: fmtDate(twoWeeksAgo),
  periodEnd: fmtDate(today),
  payDate: fmtDate(today),
  frequency: "biweekly",
  grossPay: "",
  filingStatus: "single",
  state: "TX",
  deductions: [
    { id: genId(), label: "401(k)", amount: "" },
    { id: genId(), label: "Health Insurance", amount: "" },
  ],
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function displayDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

interface StubData {
  employeeName: string;
  employerName: string;
  employerAddress: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  frequency: PayFrequency;
  grossPay: number;
  filingStatus: FilingStatus;
  stateName: string;
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  preTaxDeductions: { label: string; amount: number }[];
  preTaxTotal: number;
  totalDeductions: number;
  netPay: number;
  effectiveTaxRate: number;
}

export default function PayStubGenerator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [stub, setStub] = useState<StubData | null>(null);
  const [error, setError] = useState("");
  const stubRef = useRef<HTMLDivElement>(null);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addDeduction() {
    setField("deductions", [
      ...form.deductions,
      { id: genId(), label: "", amount: "" },
    ]);
  }

  function updateDeduction(id: string, key: "label" | "amount", val: string) {
    setField(
      "deductions",
      form.deductions.map((d) => (d.id === id ? { ...d, [key]: val } : d))
    );
  }

  function removeDeduction(id: string) {
    setField("deductions", form.deductions.filter((d) => d.id !== id));
  }

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const gross = parseFloat(form.grossPay);
    if (!gross || gross <= 0) {
      setError("Please enter a valid gross pay amount.");
      return;
    }
    if (!form.employeeName.trim()) {
      setError("Please enter the employee name.");
      return;
    }
    if (!form.employerName.trim()) {
      setError("Please enter the employer name.");
      return;
    }

    const preTaxDeductions = form.deductions
      .map((d) => ({ label: d.label || "Deduction", amount: parseFloat(d.amount) || 0 }))
      .filter((d) => d.amount > 0);
    const preTaxTotal = preTaxDeductions.reduce((sum, d) => sum + d.amount, 0);
    const taxableGross = Math.max(0, gross - preTaxTotal);

    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const stateRate = stateInfo?.rate ?? 0;
    const taxes = calcPaycheck(taxableGross, stateRate, form.filingStatus, form.frequency);

    const totalDeductions = preTaxTotal + taxes.federalTax + taxes.stateTax + taxes.socialSecurity + taxes.medicare;
    const netPay = gross - totalDeductions;

    setStub({
      employeeName: form.employeeName.trim(),
      employerName: form.employerName.trim(),
      employerAddress: form.employerAddress.trim(),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      payDate: form.payDate,
      frequency: form.frequency,
      grossPay: gross,
      filingStatus: form.filingStatus,
      stateName: stateInfo?.name ?? form.state,
      federalTax: taxes.federalTax,
      stateTax: taxes.stateTax,
      socialSecurity: taxes.socialSecurity,
      medicare: taxes.medicare,
      preTaxDeductions,
      preTaxTotal,
      totalDeductions,
      netPay,
      effectiveTaxRate: (taxes.federalTax + taxes.stateTax + taxes.socialSecurity + taxes.medicare) / gross,
    });

    setTimeout(() => {
      document.getElementById("stub-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleReset() {
    setForm(DEFAULT_FORM);
    setStub(null);
    setError("");
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    if (!stub) return;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const lm = 50;
    const rEdge = 562;
    let y = 50;
    const lineH = 16;

    const drawHRule = (yy: number) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(lm, yy, rEdge, yy);
    };

    const col2 = (label: string, value: string, yy: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(label, lm, yy);
      doc.setTextColor(15, 23, 42);
      doc.text(value, rEdge, yy, { align: "right" });
    };

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 612, 48, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("PAY STUB", lm, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("netmoneytools.com — Estimates only", rEdge, 30, { align: "right" });

    y = 70;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(stub.employerName, lm, y);
    if (stub.employerAddress) {
      y += lineH;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(stub.employerAddress, lm, y);
    }

    y += lineH + 4;
    drawHRule(y); y += lineH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Employee", lm, y);
    doc.text("Pay Period", 240, y);
    doc.text("Pay Date", 400, y);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(stub.employeeName, lm, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${displayDate(stub.periodStart)} – ${displayDate(stub.periodEnd)}`, 240, y);
    doc.text(displayDate(stub.payDate), 400, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${FREQ_LABEL[stub.frequency]} | ${stub.filingStatus === "hoh" ? "Head of Household" : stub.filingStatus === "married" ? "Married Filing Jointly" : "Single"} | ${stub.stateName}`, lm, y);

    y += lineH + 4;
    drawHRule(y); y += lineH;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("EARNINGS", lm, y);
    y += 4;
    col2("Gross Pay", fmt(stub.grossPay), y += lineH);

    if (stub.preTaxDeductions.length > 0) {
      y += lineH;
      drawHRule(y); y += lineH;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PRE-TAX DEDUCTIONS", lm, y); y += 4;
      for (const d of stub.preTaxDeductions) {
        col2(d.label, `(${fmt(d.amount)})`, y += lineH);
      }
      col2("Pre-Tax Total", `(${fmt(stub.preTaxTotal)})`, y += lineH, true);
    }

    y += lineH;
    drawHRule(y); y += lineH;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("TAX WITHHOLDINGS", lm, y); y += 4;
    col2("Federal Income Tax", `(${fmt(stub.federalTax)})`, y += lineH);
    col2(`${stub.stateName} State Tax`, `(${fmt(stub.stateTax)})`, y += lineH);
    col2("Social Security (6.2%)", `(${fmt(stub.socialSecurity)})`, y += lineH);
    col2("Medicare (1.45%)", `(${fmt(stub.medicare)})`, y += lineH);
    col2("Tax Total", `(${fmt(stub.federalTax + stub.stateTax + stub.socialSecurity + stub.medicare)})`, y += lineH, true);

    y += lineH;
    doc.setFillColor(240, 249, 255);
    doc.rect(lm - 6, y - 12, rEdge - lm + 12, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text("NET PAY", lm, y + 4);
    doc.setTextColor(16, 185, 129);
    doc.text(fmt(stub.netPay), rEdge, y + 4, { align: "right" });

    y += 36;
    drawHRule(y); y += lineH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "This pay stub is generated by NetMoneyTools for estimation purposes only. Actual withholding may vary based on pre-tax benefits,",
      lm, y
    );
    doc.text("local taxes, and individual W-4 elections. Consult a qualified tax professional for advice.", lm, y + 10);

    doc.save(`pay-stub-${stub.employeeName.replace(/\s+/g, "-").toLowerCase()}-${stub.payDate}.pdf`);
  }

  const filing = form.filingStatus === "hoh" ? "Head of Household" : form.filingStatus === "married" ? "Married Filing Jointly" : "Single";

  return (
    <>
      <Helmet>
        <title>Pay Stub Generator 2026 | Free Paycheck Stub Maker | NetMoneyTools</title>
        <meta name="description" content="Generate a professional pay stub instantly. Enter employee info and gross pay — we calculate all taxes and create a downloadable PDF. Free, no signup." />
        <link rel="canonical" href="https://netmoneytools.com/pay-stub-generator" />
        <meta property="og:title" content="Pay Stub Generator 2026 | NetMoneyTools" />
        <meta property="og:description" content="Create a professional pay stub with automatic tax calculations. Download as PDF. Free, no signup." />
        <meta property="og:url" content="https://netmoneytools.com/pay-stub-generator" />
        <meta property="og:type" content="website" />
      </Helmet>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #stub-preview { display: block !important; position: static !important; }
          #stub-print-wrapper { display: block !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            Pay Stub Generator 2026
          </h1>
          <p className="text-[#475569]">
            Fill in the details below to generate a professional pay stub with automatic tax calculations.
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-6">

          {/* Employer & Employee */}
          <div>
            <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider mb-4 pb-2 border-b border-[#e2e8f0]">
              Employer & Employee
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Employee Name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.employeeName}
                  onChange={(e) => setField("employeeName", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Employer Name</label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={form.employerName}
                  onChange={(e) => setField("employerName", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Employer Address <span className="text-[#94a3b8] font-normal">(optional)</span></label>
                <input
                  type="text"
                  placeholder="123 Main St, Austin, TX 78701"
                  value={form.employerAddress}
                  onChange={(e) => setField("employerAddress", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                />
              </div>
            </div>
          </div>

          {/* Pay Period */}
          <div>
            <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider mb-4 pb-2 border-b border-[#e2e8f0]">
              Pay Period
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Period Start</label>
                <input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setField("periodStart", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Period End</label>
                <input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setField("periodEnd", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Pay Date</label>
                <input
                  type="date"
                  value={form.payDate}
                  onChange={(e) => setField("payDate", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div>
            <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider mb-4 pb-2 border-b border-[#e2e8f0]">
              Compensation & Taxes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Gross Pay (this period)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 3500"
                    value={form.grossPay}
                    onChange={(e) => setField("grossPay", e.target.value)}
                    className="w-full pl-7 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-[#0f172a]">Pay Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setField("frequency", e.target.value as PayFrequency)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                >
                  <option value="weekly">Weekly (52x/year)</option>
                  <option value="biweekly">Bi-Weekly (26x/year)</option>
                  <option value="semimonthly">Semi-Monthly (24x/year)</option>
                  <option value="monthly">Monthly (12x/year)</option>
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
                <label className="block text-sm font-semibold text-[#0f172a]">State</label>
                <select
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                >
                  {STATE_TAX_RATES.map((s) => (
                    <option key={s.abbreviation} value={s.abbreviation}>
                      {s.name} ({s.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pre-tax Deductions */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e2e8f0]">
              <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
                Pre-Tax Deductions <span className="text-[#94a3b8] font-normal normal-case">(optional)</span>
              </h2>
              <button
                type="button"
                onClick={addDeduction}
                className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {form.deductions.map((d) => (
                <div key={d.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Label (e.g. 401k)"
                    value={d.label}
                    onChange={(e) => updateDeduction(d.id, "label", e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#475569] text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={d.amount}
                      onChange={(e) => updateDeduction(d.id, "amount", e.target.value)}
                      className="w-full pl-6 pr-2 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeduction(d.id)}
                    className="p-2 text-[#94a3b8] hover:text-[#f43f5e] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {form.deductions.length === 0 && (
                <p className="text-xs text-[#94a3b8] italic">No pre-tax deductions added. Click "Add" to include 401(k), health insurance, etc.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#f43f5e] text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
            >
              <FileText size={18} />
              Generate Pay Stub
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 border border-[#e2e8f0] rounded-lg text-[#475569] hover:bg-[#f8fafc] transition-colors"
              title="Start Over"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </form>

        {/* Pay Stub Preview */}
        {stub && (
          <div id="stub-preview" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-[#0f172a]">Pay Stub Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
                >
                  <Printer size={15} />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  <Download size={15} />
                  Download PDF
                </button>
              </div>
            </div>

            {/* Stub Card */}
            <div ref={stubRef} className="bg-white border border-[#e2e8f0] rounded-xl shadow-md overflow-hidden font-mono text-sm" id="stub-print-wrapper">

              {/* Header bar */}
              <div className="bg-[#2563eb] px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-lg tracking-wide">PAY STUB</p>
                  <p className="text-blue-200 text-xs mt-0.5">netmoneytools.com — Estimates only</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-base">{stub.employerName}</p>
                  {stub.employerAddress && <p className="text-blue-200 text-xs mt-0.5">{stub.employerAddress}</p>}
                </div>
              </div>

              {/* Meta row */}
              <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs">
                <div>
                  <p className="text-[#94a3b8] uppercase tracking-wider font-sans mb-1">Employee</p>
                  <p className="text-[#0f172a] font-bold font-sans">{stub.employeeName}</p>
                  <p className="text-[#475569] font-sans">{filing} · {stub.stateName}</p>
                </div>
                <div>
                  <p className="text-[#94a3b8] uppercase tracking-wider font-sans mb-1">Pay Period</p>
                  <p className="text-[#0f172a] font-sans">{displayDate(stub.periodStart)} – {displayDate(stub.periodEnd)}</p>
                  <p className="text-[#475569] font-sans">{FREQ_LABEL[stub.frequency]}</p>
                </div>
                <div>
                  <p className="text-[#94a3b8] uppercase tracking-wider font-sans mb-1">Pay Date</p>
                  <p className="text-[#0f172a] font-sans">{displayDate(stub.payDate)}</p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Earnings */}
                <div>
                  <p className="text-[#94a3b8] text-xs uppercase tracking-wider font-sans mb-2">Earnings</p>
                  <div className="flex justify-between items-center py-1.5 border-b border-[#f1f5f9]">
                    <span className="text-[#475569]">Regular Pay</span>
                    <span className="text-[#0f172a] font-semibold">{fmt(stub.grossPay)}</span>
                  </div>
                </div>

                {/* Pre-tax deductions */}
                {stub.preTaxDeductions.length > 0 && (
                  <div>
                    <p className="text-[#94a3b8] text-xs uppercase tracking-wider font-sans mb-2">Pre-Tax Deductions</p>
                    {stub.preTaxDeductions.map((d, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-[#f1f5f9]">
                        <span className="text-[#475569]">{d.label}</span>
                        <span className="text-[#f43f5e]">({fmt(d.amount)})</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-1.5 border-b border-[#e2e8f0]">
                      <span className="text-[#0f172a] font-semibold">Taxable Gross</span>
                      <span className="text-[#0f172a] font-semibold">{fmt(stub.grossPay - stub.preTaxTotal)}</span>
                    </div>
                  </div>
                )}

                {/* Tax withholdings */}
                <div>
                  <p className="text-[#94a3b8] text-xs uppercase tracking-wider font-sans mb-2">Tax Withholdings</p>
                  {[
                    { label: "Federal Income Tax", amount: stub.federalTax },
                    { label: `${stub.stateName} State Tax`, amount: stub.stateTax },
                    { label: "Social Security (6.2%)", amount: stub.socialSecurity },
                    { label: "Medicare (1.45%)", amount: stub.medicare },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-[#f1f5f9]">
                      <span className="text-[#475569]">{row.label}</span>
                      <span className="text-[#f43f5e]">({fmt(row.amount)})</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t-2 border-[#e2e8f0] pt-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#475569]">Total Deductions</span>
                    <span className="text-[#f43f5e] font-semibold">({fmt(stub.totalDeductions)})</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#f0fdf4] rounded-lg px-4 py-3 mt-2">
                    <span className="text-[#0f172a] font-bold text-base font-sans">NET PAY</span>
                    <span className="text-[#10b981] font-extrabold text-2xl">{fmt(stub.netPay)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-[#94a3b8] font-sans">Effective Tax Rate</span>
                    <span className="text-[#475569] font-sans">{(stub.effectiveTaxRate * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-[#fef9ee] border-t border-[#f59e0b]/20">
                <p className="text-xs text-[#92400e] font-sans leading-relaxed">
                  This stub is for estimation purposes only. Actual withholding may differ based on W-4 elections, local taxes, pre-tax benefits, and other factors. Tax Year 2026. Consult a tax professional for your specific situation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Related Tools */}
        <section className="bg-[#f0f4ff] border border-[#2563eb]/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-[#0f172a] mb-1">Need to check your take-home pay first?</h3>
            <p className="text-sm text-[#475569]">Use our Paycheck or Gross Up calculators for quick estimates.</p>
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
