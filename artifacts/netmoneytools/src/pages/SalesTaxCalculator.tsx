import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { ExternalLink, ArrowRight, RotateCcw, AlertCircle, Info, Calculator } from "lucide-react";
import { SALES_TAX_RATES, COMMON_AMOUNTS, type StateInfo } from "@/data/salesTaxRates";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(3).replace(/\.?0+$/, "") + "%";
}

interface CalcResult {
  subtotal: number;
  stateAmount: number;
  localAmount: number;
  totalTax: number;
  total: number;
  stateRate: number;
  localRate: number;
  combinedRate: number;
  isReverse: boolean;
}

function calculate(amount: number, stateInfo: StateInfo, localRate: number, isReverse: boolean): CalcResult {
  const combinedRate = stateInfo.stateRate + localRate;

  if (isReverse) {
    const subtotal = amount / (1 + combinedRate);
    const totalTax = amount - subtotal;
    const stateAmount = subtotal * stateInfo.stateRate;
    const localAmount = subtotal * localRate;
    return { subtotal, stateAmount, localAmount, totalTax, total: amount, stateRate: stateInfo.stateRate, localRate, combinedRate, isReverse };
  } else {
    const subtotal = amount;
    const stateAmount = subtotal * stateInfo.stateRate;
    const localAmount = subtotal * localRate;
    const totalTax = stateAmount + localAmount;
    const total = subtotal + totalTax;
    return { subtotal, stateAmount, localAmount, totalTax, total, stateRate: stateInfo.stateRate, localRate, combinedRate, isReverse };
  }
}

export default function SalesTaxCalculator() {
  const [amount, setAmount] = useState("");
  const [stateAbbr, setStateAbbr] = useState("TX");
  const [zip, setZip] = useState("");
  const [isReverse, setIsReverse] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState("");

  const stateInfo = useMemo(
    () => SALES_TAX_RATES.find((s) => s.abbreviation === stateAbbr) ?? SALES_TAX_RATES[0],
    [stateAbbr]
  );

  const localRate = stateInfo.avgLocalRate > 0 ? stateInfo.avgLocalRate : 0;

  const result = useMemo<CalcResult | null>(() => {
    const val = parseFloat(amount.replace(/,/g, ""));
    if (!val || val <= 0 || !calculated) return null;
    return calculate(val, stateInfo, localRate, isReverse);
  }, [amount, stateInfo, localRate, isReverse, calculated]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const val = parseFloat(amount.replace(/,/g, ""));
    if (!val || val <= 0) { setError("Please enter a valid amount greater than zero."); return; }
    setCalculated(true);
    setTimeout(() => document.getElementById("stc-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function handleReset() {
    setAmount("");
    setZip("");
    setCalculated(false);
    setError("");
  }

  const hasZip = zip.trim().length >= 5;

  return (
    <>
      <Helmet>
        <title>Sales Tax Calculator 2026 | All 50 States | NetMoneyTools</title>
        <meta name="description" content="Free sales tax calculator for all 50 states. Calculate state and local tax, total price, and reverse sales tax. Uses 2026 state rates with local average breakdowns." />
        <link rel="canonical" href="https://netmoneytools.com/sales-tax-calculator" />
        <meta property="og:title" content="Sales Tax Calculator 2026 | NetMoneyTools" />
        <meta property="og:description" content="Calculate sales tax for any state in seconds. Includes state rates, average local rates, and reverse calculator." />
        <meta property="og:url" content="https://netmoneytools.com/sales-tax-calculator" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            Sales Tax Calculator 2026
          </h1>
          <p className="text-[#475569]">
            Calculate sales tax for all 50 states using 2026 rates. Includes state and average local tax with a reverse calculator.
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-5">

          {/* Reverse toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">
              {isReverse ? "Reverse Sales Tax" : "Sales Tax Calculator"}
            </h2>
            <button
              type="button"
              onClick={() => { setIsReverse((v) => !v); setCalculated(false); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${isReverse ? "bg-[#2563eb] text-white border-[#2563eb]" : "border-[#e2e8f0] text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb]"}`}
            >
              <RotateCcw size={14} />
              {isReverse ? "Reverse Mode On" : "Reverse Mode Off"}
            </button>
          </div>

          {isReverse && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-[#1e40af]">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>Enter the <strong>total amount you paid</strong> (including tax) to find the pre-tax price and tax amount.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">
                {isReverse ? "Total Paid (with tax)" : "Purchase Amount (pre-tax)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] font-medium">$</span>
                <input
                  type="number" min="0.01" step="0.01"
                  placeholder={isReverse ? "e.g. 108.25" : "e.g. 100.00"}
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setCalculated(false); }}
                  className="w-full pl-7 pr-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">State</label>
              <select
                value={stateAbbr}
                onChange={(e) => { setStateAbbr(e.target.value); setCalculated(false); }}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              >
                {SALES_TAX_RATES.map((s) => (
                  <option key={s.abbreviation} value={s.abbreviation}>{s.name} ({s.abbreviation})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-[#0f172a]">
                ZIP Code <span className="text-[#94a3b8] font-normal">(optional)</span>
              </label>
              <input
                type="text" maxLength={5} placeholder="e.g. 73301"
                value={zip}
                onChange={(e) => { setZip(e.target.value.replace(/\D/g, "")); setCalculated(false); }}
                className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
              />
              {hasZip && (
                <p className="text-xs text-[#f59e0b] flex items-center gap-1 mt-0.5">
                  <Info size={11} /> Approximate — uses state average local rate
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[#f43f5e] text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Calculator size={17} />
              Calculate Sales Tax
            </button>
            {calculated && (
              <button type="button" onClick={handleReset} className="px-4 py-3 border border-[#e2e8f0] rounded-lg text-[#475569] hover:bg-[#f8fafc] transition-colors font-medium text-sm">
                Reset
              </button>
            )}
          </div>
        </form>

        {/* Live rate card — always visible */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h3 className="font-bold text-[#0f172a]">{stateInfo.name} Sales Tax Rate</h3>
            <a
              href={stateInfo.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#2563eb] hover:underline"
            >
              Official Tax Site <ExternalLink size={11} />
            </a>
          </div>
          {stateInfo.hasNoSalesTax ? (
            <div className="flex items-center gap-2 text-[#10b981] font-semibold text-lg mb-3">
              No general sales tax in {stateInfo.name}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-[#64748b] mb-1">State Rate</p>
                <p className="text-xl font-extrabold text-[#2563eb]">{fmtPct(stateInfo.stateRate)}</p>
              </div>
              <div className="text-center p-3 bg-[#f8fafc] rounded-lg">
                <p className="text-xs text-[#64748b] mb-1">Avg Local</p>
                <p className="text-xl font-extrabold text-[#475569]">{stateInfo.avgLocalRate > 0 ? fmtPct(stateInfo.avgLocalRate) : "None"}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-[#64748b] mb-1">Combined Avg</p>
                <p className="text-xl font-extrabold text-[#10b981]">{fmtPct(stateInfo.combinedAvg)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div id="stc-results" className="space-y-5">
            {/* Main result */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-md overflow-hidden">
              <div className="bg-[#2563eb] px-6 py-4">
                <h2 className="text-white font-bold text-lg">
                  {isReverse ? "Reverse Tax Breakdown" : "Tax Calculation Results"}
                </h2>
              </div>
              <div className="divide-y divide-[#f1f5f9]">
                <ResultRow label="Subtotal (pre-tax)" value={fmt(result.subtotal)} />
                {result.stateRate > 0 && (
                  <ResultRow label={`${stateInfo.name} State Tax (${fmtPct(result.stateRate)})`} value={fmt(result.stateAmount)} muted />
                )}
                {result.localRate > 0 && (
                  <ResultRow label={`Average Local Tax (${fmtPct(result.localRate)})`} value={fmt(result.localAmount)} muted />
                )}
                <ResultRow label={`Total Tax (${fmtPct(result.combinedRate)})`} value={fmt(result.totalTax)} accent />
                <ResultRow label="Total Amount Due" value={fmt(result.total)} bold primary />
              </div>
            </div>

            {/* Tax Breakdown Table */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
                <h3 className="font-bold text-[#0f172a] text-sm uppercase tracking-wider">Tax Rate Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f1f5f9]">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Component</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Rate</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase tracking-wider">Tax on {fmt(result.subtotal)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8fafc]">
                  <tr>
                    <td className="px-5 py-2.5 text-[#0f172a]">{stateInfo.name} State</td>
                    <td className="px-5 py-2.5 text-right text-[#2563eb] font-medium">{fmtPct(result.stateRate)}</td>
                    <td className="px-5 py-2.5 text-right text-[#0f172a] font-medium">{fmt(result.stateAmount)}</td>
                  </tr>
                  <tr className="bg-[#f8fafc]">
                    <td className="px-5 py-2.5 text-[#475569]">
                      Local (avg)
                      {hasZip && <span className="ml-1 text-xs text-[#f59e0b]">~approx.</span>}
                    </td>
                    <td className="px-5 py-2.5 text-right text-[#475569] font-medium">{result.localRate > 0 ? fmtPct(result.localRate) : "—"}</td>
                    <td className="px-5 py-2.5 text-right text-[#475569] font-medium">{result.localRate > 0 ? fmt(result.localAmount) : "$0.00"}</td>
                  </tr>
                  <tr className="font-semibold bg-[#f0f4ff]">
                    <td className="px-5 py-2.5 text-[#0f172a]">Combined Total</td>
                    <td className="px-5 py-2.5 text-right text-[#2563eb]">{fmtPct(result.combinedRate)}</td>
                    <td className="px-5 py-2.5 text-right text-[#2563eb]">{fmt(result.totalTax)}</td>
                  </tr>
                </tbody>
              </table>
              {hasZip && (
                <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
                  <Info size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Local rate shown is the statewide average for {stateInfo.name} — actual rates vary by exact location.
                    {" "}<a href={stateInfo.officialUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">Check official rates <ExternalLink size={10} className="inline" /></a>
                  </p>
                </div>
              )}
            </div>

            {/* Common Scenarios */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
                <h3 className="font-bold text-[#0f172a] text-sm uppercase tracking-wider">Quick Reference — Tax Amounts at {fmtPct(result.combinedRate)}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-[#f1f5f9]">
                {COMMON_AMOUNTS.map((a) => {
                  const tax = a * result.combinedRate;
                  return (
                    <div key={a} className="px-4 py-3">
                      <p className="text-xs text-[#94a3b8] mb-0.5">If you spent</p>
                      <p className="font-bold text-[#0f172a]">{fmt(a)}</p>
                      <p className="text-xs text-[#475569] mt-1">Tax: <span className="font-semibold text-[#2563eb]">{fmt(tax)}</span></p>
                      <p className="text-xs text-[#475569]">Total: {fmt(a + tax)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* State Info */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-bold text-[#0f172a]">{stateInfo.name} Sales Tax — What You Should Know</h3>
            <a
              href={stateInfo.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-[#2563eb] hover:underline font-medium"
            >
              {stateInfo.name} Tax Authority <ExternalLink size={13} />
            </a>
          </div>
          <p className="text-sm text-[#475569] leading-relaxed">{stateInfo.description}</p>
          {!stateInfo.hasNoSalesTax && (
            <div className="flex flex-wrap gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#1e40af] rounded-full text-xs font-semibold">
                State Rate: {fmtPct(stateInfo.stateRate)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8fafc] text-[#475569] rounded-full text-xs font-semibold border border-[#e2e8f0]">
                Avg Combined: {fmtPct(stateInfo.combinedAvg)}
              </span>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-[#fef9ee] border border-[#f59e0b]/30 rounded-xl p-4">
          <p className="text-xs text-[#92400e] leading-relaxed">
            <strong>Disclaimer:</strong> Rates reflect 2026 state sales tax rates. Local rates shown are statewide averages and may differ from your exact location. Some items (groceries, prescription drugs, clothing) may be taxed at reduced rates or be exempt. Actual tax at any specific address may vary. Always confirm rates with your{" "}
            <a href={stateInfo.officialUrl} target="_blank" rel="noopener noreferrer" className="underline">state's official tax authority</a>.
          </p>
        </div>
      </div>
    </>
  );
}

function ResultRow({
  label, value, muted, accent, bold, primary,
}: {
  label: string; value: string;
  muted?: boolean; accent?: boolean; bold?: boolean; primary?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-6 py-3.5 ${primary ? "bg-[#f0f4ff]" : ""}`}>
      <span className={`text-sm ${muted ? "text-[#64748b]" : bold ? "font-bold text-[#0f172a]" : "text-[#0f172a]"}`}>{label}</span>
      <span className={`text-sm font-${bold ? "extrabold" : "semibold"} ${accent ? "text-[#f43f5e]" : primary ? "text-[#2563eb] text-base" : "text-[#0f172a]"}`}>{value}</span>
    </div>
  );
}
