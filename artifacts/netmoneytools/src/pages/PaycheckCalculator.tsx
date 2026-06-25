import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Calculator, Copy, Download, RotateCcw, ChevronDown, ChevronUp, ArrowRight, AlertCircle } from "lucide-react";
import { calcPaycheck, type FilingStatus, type PayFrequency, type TaxResult } from "@/lib/taxCalc";
import { STATE_TAX_RATES, STATES_BY_ABBR, STATES_BY_SLUG } from "@/data/stateTaxRates";
import jsPDF from "jspdf";

const STORAGE_KEY = "paycheck-inputs";

interface FormState {
  grossPay: string;
  state: string;
  filingStatus: FilingStatus;
  frequency: PayFrequency;
}

const DEFAULT_FORM: FormState = {
  grossPay: "",
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
    q: "How is my federal income tax calculated?",
    a: "Federal income tax uses progressive 2026 tax brackets. Only income within each bracket is taxed at that bracket's rate. This calculator annualizes your per-paycheck gross, applies the brackets, then divides back to a per-paycheck amount.",
  },
  {
    q: "What is FICA and who pays it?",
    a: "FICA stands for the Federal Insurance Contributions Act. It includes Social Security (6.2% up to a $168,600 wage base) and Medicare (1.45% with no cap). Employees pay this, and employers match it — so your employer pays an additional 7.65% on top of your gross pay.",
  },
  {
    q: "Does this include my state taxes accurately?",
    a: "This calculator uses simplified flat-rate approximations for state income tax. Most states use progressive brackets. For precise state withholding, consult your state's department of revenue or a tax professional.",
  },
  {
    q: "Why does my paycheck differ from what my employer withholds?",
    a: "Actual withholding depends on your W-4 elections, pre-tax deductions (401k, health insurance, FSA), local taxes, and other factors not captured here. This tool provides a general estimate, not a replacement for your actual pay stub.",
  },
  {
    q: "What does effective tax rate mean?",
    a: "Your effective tax rate is the total taxes you pay divided by your gross income. It differs from your marginal rate, which is the rate on your last dollar of income. Because of progressive brackets, most people's effective rate is much lower than their marginal rate.",
  },
];

export default function PaycheckCalculator() {
  const { state: stateParam } = useParams<{ state?: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => {
    let initialState = DEFAULT_FORM.state;
    if (stateParam) {
      const match = STATES_BY_SLUG[stateParam.toLowerCase()] ?? STATES_BY_ABBR[stateParam.toUpperCase()];
      if (match) initialState = match.abbreviation;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? { ...DEFAULT_FORM, ...JSON.parse(saved) } : DEFAULT_FORM;
      return { ...parsed, state: initialState };
    } catch {
      return { ...DEFAULT_FORM, state: initialState };
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

  function handleStateChange(abbr: string) {
    setForm({ ...form, state: abbr });
    const stateInfo = STATES_BY_ABBR[abbr];
    if (stateInfo) {
      const slug = stateInfo.name.toLowerCase().replace(/\s+/g, "-");
      navigate(`/paycheck-calculator/${slug}`, { replace: true });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const gross = parseFloat(form.grossPay.replace(/,/g, ""));
    if (!gross || gross <= 0) {
      setError("Please enter a valid gross pay amount.");
      return;
    }
    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const stateRate = stateInfo?.rate ?? 0;
    const res = calcPaycheck(gross, stateRate, form.filingStatus, form.frequency);
    setResult(res);
  }

  function handleReset() {
    setForm(DEFAULT_FORM);
    setResult(null);
    setError("");
    navigate("/paycheck-calculator", { replace: true });
  }

  function handleCopy() {
    if (!result) return;
    const stateInfo = STATE_TAX_RATES.find((s) => s.abbreviation === form.state);
    const text = [
      "NetMoneyTools — Paycheck Calculator Results",
      "---",
      `Gross Pay: ${fmt(result.grossPay)}`,
      `State: ${stateInfo?.name ?? form.state}`,
      `Filing Status: ${form.filingStatus}`,
      `Pay Frequency: ${form.frequency}`,
      "---",
      `Net Take-Home Pay: ${fmt(result.netPay)}`,
      `Federal Tax: ${fmt(result.federalTax)}`,
      `State Tax: ${fmt(result.stateTax)}`,
      `Social Security: ${fmt(result.socialSecurity)}`,
      `Medicare: ${fmt(result.medicare)}`,
      `Total Deductions: ${fmt(result.totalDeductions)}`,
      `Effective Tax Rate: ${pct(result.effectiveTaxRate)}`,
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
    doc.text("Paycheck Calculator Results", 14, y);
    y += lineH + 4;

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, y);
    y += lineH + 6;

    const inputs = [
      ["Gross Pay", fmt(result.grossPay)],
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
      ["Net Take-Home Pay", fmt(result.netPay), true],
      ["Federal Income Tax", fmt(result.federalTax), false],
      ["State Income Tax", fmt(result.stateTax), false],
      ["Social Security (6.2%)", fmt(result.socialSecurity), false],
      ["Medicare (1.45%)", fmt(result.medicare), false],
      ["Total Deductions", fmt(result.totalDeductions), false],
      ["Effective Tax Rate", pct(result.effectiveTaxRate), false],
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

    doc.save("paycheck-calculator-results.pdf");
  }

  const stateInfo = STATES_BY_ABBR[form.state];
  const canonicalUrl = stateInfo
    ? `https://netmoneytools.com/paycheck-calculator/${stateInfo.name.toLowerCase().replace(/\s+/g, "-")}`
    : "https://netmoneytools.com/paycheck-calculator";

  const schemaMarkup = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Paycheck Calculator 2026",
    "applicationCategory": "FinanceApplication",
    "description": "Calculate your exact take-home pay after federal, state, and FICA taxes. Free paycheck calculator for 2026.",
    "url": "https://netmoneytools.com/paycheck-calculator",
    "operatingSystem": "All",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  });

  return (
    <>
      <Helmet>
        <title>Paycheck Calculator 2026 | Free Take-Home Pay Calculator</title>
        <meta name="description" content="Calculate your exact take-home pay after federal, state, and FICA taxes. Free paycheck calculator for every state. No signup." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Paycheck Calculator 2026 | Free Take-Home Pay Calculator" />
        <meta property="og:description" content="Calculate your take-home pay after all taxes. Free, no signup, 2026 tax brackets." />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{schemaMarkup}</script>
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            Paycheck Calculator 2026
          </h1>
          <p className="text-[#475569]">
            Enter your gross pay to see exactly how much you take home after federal, state, and FICA taxes.
          </p>
        </header>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-[#0f172a]">
              Gross Pay (per paycheck)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 4000"
                value={form.grossPay}
                onChange={(e) => setForm({ ...form, grossPay: e.target.value })}
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
                onChange={(e) => handleStateChange(e.target.value)}
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
            Calculate Take-Home Pay
          </button>
        </form>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-5">
              <p className="text-emerald-100 text-sm font-medium mb-1">Net Take-Home Pay</p>
              <p className="text-4xl font-extrabold text-white">{fmt(result.netPay)}</p>
              <p className="text-emerald-200 text-xs mt-1">per {form.frequency} paycheck</p>
            </div>

            <div className="p-6 space-y-0">
              <div className="flex justify-between items-center py-3 border-b border-[#e2e8f0]">
                <span className="text-[#0f172a] font-semibold">Gross Pay</span>
                <span className="text-[#0f172a] font-bold">{fmt(result.grossPay)}</span>
              </div>

              {[
                { label: "Federal Income Tax", value: fmt(result.federalTax), sub: pct(result.federalTax / result.grossPay) },
                { label: "State Income Tax", value: fmt(result.stateTax), sub: pct(result.stateTax / result.grossPay) },
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
                <span className="text-[#475569] text-sm font-semibold">Total Deductions</span>
                <span className="text-[#f43f5e] font-bold">-{fmt(result.totalDeductions)}</span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-[#475569] text-sm">Effective Tax Rate</span>
                <span className="text-[#0f172a] font-semibold">{pct(result.effectiveTaxRate)}</span>
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
              Estimates only. Based on 2026 federal brackets and simplified state flat rates. Does not include local taxes, pre-tax deductions (401k, HSA), or additional Medicare surtax. Consult a tax professional for your specific situation.
            </div>
          </div>
        )}

        {/* Explainer */}
        <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-3">
          <h2 className="text-xl font-bold text-[#0f172a]">How Your Paycheck is Calculated</h2>
          <p className="text-[#475569] leading-relaxed text-sm">
            Your employer withholds taxes from each paycheck based on your W-4 elections and applicable tax rates. The major deductions are federal income tax (calculated using progressive 2026 brackets), state income tax (varies by state), Social Security (6.2% up to $168,600 in wages), and Medicare (1.45% with no cap).
          </p>
          <p className="text-[#475569] leading-relaxed text-sm">
            Pre-tax deductions like 401(k) contributions, health insurance premiums, and HSA deposits reduce your taxable income and are not reflected in this estimate. Your actual take-home pay may be higher if you have significant pre-tax benefits.
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
        <section className="bg-[#f0fdf4] border border-[#10b981]/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-[#0f172a] mb-1">Need to calculate gross from a net target?</h3>
            <p className="text-sm text-[#475569]">Use our Gross Up Calculator to find how much you need to earn to hit a specific take-home.</p>
          </div>
          <Link to="/gross-up-calculator" className="flex items-center gap-2 px-4 py-2 bg-[#10b981] text-white rounded-lg text-sm font-semibold hover:bg-[#059669] transition-colors whitespace-nowrap">
            Gross Up Calculator <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}
