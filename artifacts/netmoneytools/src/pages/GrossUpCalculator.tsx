import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Calculator, Copy, Download, RotateCcw, ChevronDown, ChevronUp, ArrowRight, AlertCircle } from "lucide-react";
import { calcGrossUp, type FilingStatus, type PayFrequency, type TaxResult } from "@/lib/taxCalc";
import { STATE_TAX_RATES } from "@/data/stateTaxRates";
import jsPDF from "jspdf";

const STORAGE_KEY = "grossup-inputs";

interface FormState {
  desiredNet: string;
  state: string;
  filingStatus: FilingStatus;
  frequency: PayFrequency;
}

const DEFAULT_FORM: FormState = {
  desiredNet: "",
  state: "TX",
  filingStatus: "single",
  frequency: "biweekly",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function pct(n: number) {
  return (n * 100).toFixed(2) + "%";
}

const faqs = [
  {
    q: "What is a gross-up calculation?",
    a: "A gross-up calculation determines the gross (pre-tax) pay needed so that after all taxes are withheld, the employee receives a specific desired net (take-home) amount. It works backwards from the net target.",
  },
  {
    q: "Why do employers need to gross up pay?",
    a: "Employers use gross-up when they want to give an employee a specific bonus or relocation allowance and ensure the employee receives the full intended amount after taxes. Without grossing up, taxes reduce the net amount below the target.",
  },
  {
    q: "Does gross-up apply to bonuses?",
    a: "Yes. Bonus gross-ups are one of the most common uses. An employer may want to give a $5,000 net bonus, so they gross it up to cover federal, state, and FICA taxes, ensuring the employee takes home exactly $5,000.",
  },
  {
    q: "What taxes are included in this gross-up?",
    a: "This calculator includes federal income tax (2026 brackets), state income tax (simplified flat rates by state), Social Security (6.2% up to $168,600), and Medicare (1.45%). It does not include local taxes or pre-tax deductions.",
  },
  {
    q: "Is gross-up pay taxable to the employee?",
    a: "Yes. The grossed-up amount is fully taxable income to the employee. The gross-up simply ensures the employee retains the desired net after those taxes are withheld. This also increases the employer's total payroll cost.",
  },
];

export default function GrossUpCalculator() {
  const [form, setForm] = useState<FormState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_FORM, ...JSON.parse(saved) } : DEFAULT_FORM;
    } catch {
      return DEFAULT_FORM;
    }
  });
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const net = parseFloat(form.desiredNet.replace(/,/g, ""));
    if (!net || net <= 0) {
      setError("Please enter a valid desired net pay amount.");
      return;
    }
    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const stateRate = stateInfo?.rate ?? 0;
    const res = calcGrossUp(net, stateRate, form.filingStatus, form.frequency);
    setResult(res);
  }

  function handleReset() {
    setForm(DEFAULT_FORM);
    setResult(null);
    setError("");
  }

  function handleCopy() {
    if (!result) return;
    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const text = [
      "NetMoneyTools — Gross Up Calculator Results",
      "---",
      `Desired Net Pay: ${fmt(parseFloat(form.desiredNet))}`,
      `State: ${stateInfo?.name ?? form.state}`,
      `Filing Status: ${form.filingStatus}`,
      `Pay Frequency: ${form.frequency}`,
      "---",
      `Required Gross Pay: ${fmt(result.grossPay)}`,
      `Federal Tax: ${fmt(result.federalTax)}`,
      `State Tax: ${fmt(result.stateTax)}`,
      `Social Security: ${fmt(result.socialSecurity)}`,
      `Medicare: ${fmt(result.medicare)}`,
      `Net Pay (verified): ${fmt(result.netPay)}`,
      `Effective Tax Rate: ${pct(result.effectiveTaxRate)}`,
      `Employer Total Cost: ${fmt(result.employerCost)}`,
      "---",
      "Estimates only. Consult a tax professional for advice specific to your situation.",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownloadPDF() {
    if (!result) return;
    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const doc = new jsPDF();
    const lineH = 8;
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("NetMoneyTools", 14, y);
    y += lineH + 2;

    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Gross Up Calculator Results", 14, y);
    y += lineH + 4;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, y);
    y += lineH + 6;

    const inputs = [
      ["Desired Net Pay", fmt(parseFloat(form.desiredNet))],
      ["State", stateInfo?.name ?? form.state],
      ["Filing Status", form.filingStatus === "hoh" ? "Head of Household" : form.filingStatus === "married" ? "Married Filing Jointly" : "Single"],
      ["Pay Frequency", form.frequency.charAt(0).toUpperCase() + form.frequency.slice(1)],
    ];

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Inputs", 14, y);
    y += lineH;
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    for (const [label, val] of inputs) {
      doc.text(`${label}:`, 14, y);
      doc.text(val, 90, y);
      y += lineH;
    }

    y += 4;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Results", 14, y);
    y += lineH;

    const rows: [string, string, boolean][] = [
      ["Required Gross Pay", fmt(result.grossPay), true],
      ["Federal Tax Withheld", fmt(result.federalTax), false],
      ["State Tax Withheld", fmt(result.stateTax), false],
      ["Social Security (6.2%)", fmt(result.socialSecurity), false],
      ["Medicare (1.45%)", fmt(result.medicare), false],
      ["Net Pay (verified)", fmt(result.netPay), false],
      ["Effective Tax Rate", pct(result.effectiveTaxRate), false],
      ["Employer Total Cost", fmt(result.employerCost), true],
    ];

    for (const [label, val, bold] of rows) {
      doc.setFontSize(9);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(bold ? 16 : 71, bold ? 185 : 85, bold ? 129 : 105);
      doc.text(label + ":", 14, y);
      doc.setTextColor(15, 23, 42);
      doc.text(val, 90, y);
      y += lineH;
    }

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Estimates only. Consult a qualified tax professional for advice specific to your situation.", 14, y);

    doc.save("gross-up-calculator-results.pdf");
  }

  const schemaMarkup = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Gross Up Calculator 2026",
    "applicationCategory": "FinanceApplication",
    "description": "Calculate how much gross pay is needed for a desired net amount. Free employer payroll tool with federal, state, and FICA taxes.",
    "url": "https://netmoneytools.com/gross-up-calculator",
    "operatingSystem": "All",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  });

  return (
    <>
      <Helmet>
        <title>Gross Up Calculator 2026 | Net to Gross Pay Calculator</title>
        <meta name="description" content="Calculate how much gross pay is needed for a desired net amount. Free employer payroll tool with federal, state, and FICA taxes." />
        <link rel="canonical" href="https://netmoneytools.com/gross-up-calculator" />
        <meta property="og:title" content="Gross Up Calculator 2026 | Net to Gross Pay Calculator" />
        <meta property="og:description" content="Calculate how much gross pay is needed for a desired net amount. Free, no signup." />
        <meta property="og:url" content="https://netmoneytools.com/gross-up-calculator" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{schemaMarkup}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            Gross Up Calculator 2026
          </h1>
          <p className="text-[#475569]">
            Enter your desired net pay and we will calculate the gross pay required after all taxes.
          </p>
        </header>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-[#0f172a]">
              Desired Net Pay (per paycheck)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 3000"
                value={form.desiredNet}
                onChange={(e) => setForm({ ...form, desiredNet: e.target.value })}
                className="w-full pl-7 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] bg-[#f8fafc]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">State</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                {STATE_TAX_RATES.map((s) => (
                  <option key={s.abbreviation} value={s.abbreviation}>
                    {s.name} ({s.abbreviation})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">Filing Status</label>
              <select
                value={form.filingStatus}
                onChange={(e) => setForm({ ...form, filingStatus: e.target.value as FilingStatus })}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                <option value="single">Single</option>
                <option value="married">Married Filing Jointly</option>
                <option value="hoh">Head of Household</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">Pay Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as PayFrequency })}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                <option value="weekly">Weekly (52x/year)</option>
                <option value="biweekly">Biweekly (26x/year)</option>
                <option value="semimonthly">Semimonthly (24x/year)</option>
                <option value="monthly">Monthly (12x/year)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">Tax Year</label>
              <select className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] bg-[#f8fafc]">
                <option value="2026">2026</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#f43f5e] text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
          >
            <Calculator size={18} />
            Calculate Gross Pay
          </button>
        </form>

        {/* Results Card */}
        {result && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] p-5">
              <p className="text-blue-100 text-sm font-medium mb-1">Required Gross Pay</p>
              <p className="text-4xl font-extrabold text-white">{fmt(result.grossPay)}</p>
              <p className="text-blue-200 text-xs mt-1">per {form.frequency} paycheck</p>
            </div>

            <div className="p-6 space-y-0">
              {[
                { label: "Federal Tax Withheld", value: fmt(result.federalTax), sub: pct(result.federalTax / result.grossPay) },
                { label: "State Tax Withheld", value: fmt(result.stateTax), sub: pct(result.stateTax / result.grossPay) },
                { label: "Social Security (6.2%)", value: fmt(result.socialSecurity), sub: null },
                { label: "Medicare (1.45%)", value: fmt(result.medicare), sub: null },
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-[#e2e8f0]">
                  <span className="text-[#475569] text-sm">{row.label}</span>
                  <div className="text-right">
                    <span className="text-[#f43f5e] font-semibold">-{row.value}</span>
                    {row.sub && <span className="text-xs text-[#94a3b8] ml-1">({row.sub})</span>}
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center py-3 border-b border-[#e2e8f0]">
                <span className="text-[#0f172a] font-semibold">Net Pay (verified)</span>
                <span className="text-[#10b981] font-bold text-lg">{fmt(result.netPay)}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-[#e2e8f0]">
                <span className="text-[#475569] text-sm">Effective Tax Rate</span>
                <span className="text-[#0f172a] font-semibold">{pct(result.effectiveTaxRate)}</span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-[#0f172a] font-semibold">Employer Total Cost</span>
                <span className="text-[#f59e0b] font-bold">{fmt(result.employerCost)}</span>
              </div>
            </div>

            <div className="px-6 pb-6 flex flex-wrap gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                <Copy size={15} />
                {copied ? "Copied!" : "Copy Results"}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                <Download size={15} />
                Download PDF
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#475569] hover:bg-[#f8fafc] transition-colors"
              >
                <RotateCcw size={15} />
                Start Over
              </button>
            </div>

            <div className="mx-6 mb-6 bg-[#fef9ee] border border-[#f59e0b]/30 rounded-lg p-3 text-xs text-[#475569]">
              Estimates only. Based on 2026 federal brackets and simplified state flat rates. Does not include local taxes, pre-tax deductions, or additional Medicare surtax. Consult a tax professional for your specific situation.
            </div>
          </div>
        )}

        {/* Explainer */}
        <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-3">
          <h2 className="text-xl font-bold text-[#0f172a]">What is a Gross Up?</h2>
          <p className="text-[#475569] leading-relaxed text-sm">
            A gross-up is a calculation used to determine the pre-tax gross pay required so that an employee receives a specific desired net (take-home) amount after all taxes are withheld. Employers commonly use gross-up calculations when providing bonuses, relocation allowances, or other supplemental pay where they want to ensure the employee receives the full intended dollar amount.
          </p>
          <p className="text-[#475569] leading-relaxed text-sm">
            For example, if you want to give an employee a $5,000 net bonus, you cannot simply pay $5,000 — taxes will reduce it. Instead, you gross up to roughly $7,000-$8,000 depending on the employee's tax situation, so that after withholding, the employee receives exactly $5,000.
          </p>
        </section>

        {/* FAQ */}
        <section aria-label="Frequently Asked Questions" className="space-y-3">
          <h2 className="text-xl font-bold text-[#0f172a]">Frequently Asked Questions</h2>
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm divide-y divide-[#e2e8f0]">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  className="w-full flex justify-between items-center px-5 py-4 text-left text-[#0f172a] font-semibold text-sm hover:bg-[#f8fafc] transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {faq.q}
                  {openFaq === i ? <ChevronUp size={18} className="shrink-0 text-[#2563eb]" /> : <ChevronDown size={18} className="shrink-0 text-[#94a3b8]" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-[#475569] leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Related Tools */}
        <section className="bg-[#f0f4ff] border border-[#2563eb]/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-[#0f172a] mb-1">Need the forward calculation?</h3>
            <p className="text-sm text-[#475569]">Use our Paycheck Calculator to find your net from a given gross salary.</p>
          </div>
          <Link to="/paycheck-calculator" className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm font-semibold hover:bg-[#1d4ed8] transition-colors whitespace-nowrap">
            Paycheck Calculator <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}
