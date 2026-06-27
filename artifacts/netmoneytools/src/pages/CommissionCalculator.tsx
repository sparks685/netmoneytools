import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Trash2, Copy, Check, AlertCircle } from "lucide-react";

/* ─── Helpers ──────────────────────────────────────────────────────────── */
function fmt(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
}
function pct(n: number, d = 2) { return (n * 100).toFixed(d) + "%"; }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

/* ─── Tab definitions ──────────────────────────────────────────────────── */
type Tab = "realestate" | "salesrep" | "carsales" | "bizbroker";
const TABS: { id: Tab; label: string }[] = [
  { id: "realestate", label: "Real Estate" },
  { id: "salesrep",   label: "Sales Rep"   },
  { id: "carsales",   label: "Car Sales"   },
  { id: "bizbroker",  label: "Business Broker" },
];

/* ══════════════════════════════════════════════════════════════════════════
   TAB 1 — REAL ESTATE
══════════════════════════════════════════════════════════════════════════ */
interface REForm {
  salePrice: string;
  commissionRate: string;
  agentSplitPct: string;
  deskFeeMonthly: string;
  transactionFee: string;
  referralFeePct: string;
  capAmount: string;
  ytdBrokerPaid: string;
}
interface REResult {
  grossCommission: number;
  referralFee: number;
  afterReferral: number;
  brokerSplit: number;
  agentSplitBeforeFees: number;
  deskFeeAnnual: number;
  transactionFee: number;
  netToAgent: number;
  effectivePct: number;
  capRemaining: number;
  isCapped: boolean;
  netIfCapped: number;
}

function calcRE(f: REForm): REResult | null {
  const price = parseFloat(f.salePrice.replace(/,/g, "")) || 0;
  if (price <= 0) return null;
  const commRate = clamp(parseFloat(f.commissionRate) || 5.5, 0, 100) / 100;
  const agentSplit = clamp(parseFloat(f.agentSplitPct) || 70, 0, 100) / 100;
  const deskMonthly = parseFloat(f.deskFeeMonthly.replace(/,/g, "")) || 0;
  const txFee = parseFloat(f.transactionFee.replace(/,/g, "")) || 0;
  const refPct = clamp(parseFloat(f.referralFeePct) || 0, 0, 100) / 100;
  const cap = parseFloat(f.capAmount.replace(/,/g, "")) || 0;
  const ytdPaid = parseFloat(f.ytdBrokerPaid.replace(/,/g, "")) || 0;

  const grossCommission = price * commRate;
  const referralFee = grossCommission * refPct;
  const afterReferral = grossCommission - referralFee;
  const brokerSplit = afterReferral * (1 - agentSplit);
  const agentSplitBeforeFees = afterReferral * agentSplit;
  const deskFeeAnnual = deskMonthly * 12;
  const netToAgent = agentSplitBeforeFees - txFee;
  const effectivePct = grossCommission > 0 ? netToAgent / price : 0;

  const capRemaining = cap > 0 ? Math.max(0, cap - ytdPaid) : 0;
  const isCapped = cap > 0 && ytdPaid >= cap;
  const netIfCapped = afterReferral - txFee;

  return {
    grossCommission, referralFee, afterReferral, brokerSplit,
    agentSplitBeforeFees, deskFeeAnnual, transactionFee: txFee,
    netToAgent, effectivePct, capRemaining, isCapped, netIfCapped,
  };
}

function RealEstateTab() {
  const [f, setF] = useState<REForm>({
    salePrice: "", commissionRate: "5.5", agentSplitPct: "70",
    deskFeeMonthly: "0", transactionFee: "0",
    referralFeePct: "0", capAmount: "16000", ytdBrokerPaid: "0",
  });
  const [res, setRes] = useState<REResult | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  function sf(k: keyof REForm, v: string) { setF((p) => ({ ...p, [k]: v })); setRes(null); }

  function calc(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = calcRE(f);
    if (!r) { setErr("Please enter a valid sale price."); return; }
    setRes(r);
    setTimeout(() => document.getElementById("re-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function copy() {
    if (!res) return;
    const txt = [
      "Real Estate Commission — NetMoneyTools.com",
      `Sale Price: ${fmt(parseFloat(f.salePrice.replace(/,/g, "")))}`,
      `Commission Rate: ${f.commissionRate}%`,
      `Agent Split: ${f.agentSplitPct}%`,
      ``,
      `Gross Commission: ${fmt(res.grossCommission)}`,
      res.referralFee > 0 ? `Referral Fee: (${fmt(res.referralFee)})` : null,
      `Agent Share (before fees): ${fmt(res.agentSplitBeforeFees)}`,
      res.transactionFee > 0 ? `Transaction Fee: (${fmt(res.transactionFee)})` : null,
      `Net to Agent: ${fmt(res.netToAgent)}`,
      `Effective Rate on Sale: ${pct(res.effectivePct)}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  const r = res;
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#475569] bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        Real estate agents typically split the gross commission with their broker. The commission comes from the seller and is negotiated as a percentage of the sale price. Desk fees, transaction fees, and referral fees are deducted to arrive at net agent income.
      </p>

      <form onSubmit={calc} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sale Price" prefix="$" value={f.salePrice} onChange={(v) => sf("salePrice", v)} placeholder="e.g. 450000" type="number" />
          <Field label="Commission Rate" suffix="%" value={f.commissionRate} onChange={(v) => sf("commissionRate", v)} placeholder="5.5" type="number" step="0.1" />
          <Field label="Agent Split" suffix="%" value={f.agentSplitPct} onChange={(v) => sf("agentSplitPct", v)} placeholder="70" type="number" hint="Broker keeps the rest" />
          <Field label="Referral Fee" suffix="%" value={f.referralFeePct} onChange={(v) => sf("referralFeePct", v)} placeholder="0" type="number" step="0.1" />
          <Field label="Transaction Fee (per closing)" prefix="$" value={f.transactionFee} onChange={(v) => sf("transactionFee", v)} placeholder="0" type="number" />
          <Field label="Desk Fee (per month)" prefix="$" value={f.deskFeeMonthly} onChange={(v) => sf("deskFeeMonthly", v)} placeholder="0" type="number" />
        </div>
        <div className="border-t border-[#f1f5f9] pt-4">
          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Cap Tracking (optional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Annual Cap Amount" prefix="$" value={f.capAmount} onChange={(v) => sf("capAmount", v)} placeholder="16000" type="number" hint="After cap, agent keeps 100%" />
            <Field label="YTD Broker Commission Paid" prefix="$" value={f.ytdBrokerPaid} onChange={(v) => sf("ytdBrokerPaid", v)} placeholder="0" type="number" />
          </div>
        </div>
        {err && <ErrMsg msg={err} />}
        <CalcBtn />
      </form>

      {r && (
        <div id="re-results" className="space-y-4">
          <ResultsHeader title="Commission Breakdown" onCopy={copy} copied={copied} />
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="bg-[#2563eb] px-5 py-3 flex justify-between items-center">
              <span className="text-white font-bold">Standard Split ({f.agentSplitPct}/{100 - parseInt(f.agentSplitPct || "70")})</span>
              {r.isCapped && <span className="bg-[#10b981] text-white text-xs font-bold px-2 py-1 rounded">CAP REACHED</span>}
            </div>
            <div className="divide-y divide-[#f8fafc]">
              <RRow label="Gross Commission" value={fmt(r.grossCommission)} />
              {r.referralFee > 0 && <RRow label={`Referral Fee (${f.referralFeePct}%)`} value={`(${fmt(r.referralFee)})`} red />}
              {r.referralFee > 0 && <RRow label="After Referral" value={fmt(r.afterReferral)} />}
              <RRow label={`Broker Split (${100 - parseInt(f.agentSplitPct || "70")}%)`} value={`(${fmt(r.brokerSplit)})`} red />
              <RRow label="Your Share (before fees)" value={fmt(r.agentSplitBeforeFees)} />
              {r.transactionFee > 0 && <RRow label="Transaction Fee" value={`(${fmt(r.transactionFee)})`} red />}
              <RRow label="Net to Agent" value={fmt(r.netToAgent)} bold green />
              <RRow label="Effective Rate on Sale Price" value={pct(r.effectivePct)} />
            </div>
          </div>

          {parseFloat(f.capAmount) > 0 && (
            <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
              <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#e2e8f0]">
                <span className="text-sm font-bold text-[#0f172a] uppercase tracking-wider text-xs">After Cap ({fmt(parseFloat(f.capAmount))} total)</span>
              </div>
              <div className="divide-y divide-[#f8fafc]">
                <RRow label="Cap Remaining This Year" value={r.isCapped ? "Fully paid" : fmt(r.capRemaining)} green={r.isCapped} />
                <RRow label="Net to Agent (if capped)" value={fmt(r.netIfCapped)} bold green />
                <RRow label="Additional vs. uncapped" value={fmt(r.netIfCapped - r.netToAgent)} green />
              </div>
            </div>
          )}

          {parseFloat(f.deskFeeMonthly) > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Annual desk fee: <strong>{fmt(r.deskFeeAnnual)}</strong> — this applies regardless of closings. On this deal alone the desk fee is a sunk cost tracked separately.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 2 — SALES REP
══════════════════════════════════════════════════════════════════════════ */
interface Tier { id: string; minPct: string; maxPct: string; rate: string; }
interface SRForm {
  quota: string;
  baseSalary: string;
  tiers: Tier[];
  acceleratorThreshold: string;
  acceleratorMultiplier: string;
  drawMonthly: string;
  drawRecoverable: boolean;
}

function newTier(min = "0", max = "100", rate = "5"): Tier {
  return { id: Math.random().toString(36).slice(2), minPct: min, maxPct: max, rate };
}

const ATTAINMENTS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

interface SRRow { attainment: number; revenue: number; commission: number; accelerator: number; total: number; draw: number; netTotal: number; }

function calcSR(f: SRForm): SRRow[] | null {
  const quota = parseFloat(f.quota.replace(/,/g, "")) || 0;
  const base = parseFloat(f.baseSalary.replace(/,/g, "")) || 0;
  if (quota <= 0) return null;
  const accelThresh = (parseFloat(f.acceleratorThreshold) || 150) / 100;
  const accelMult = parseFloat(f.acceleratorMultiplier) || 2;
  const drawMonthly = parseFloat(f.drawMonthly.replace(/,/g, "")) || 0;
  const annualDraw = drawMonthly * 12;

  return ATTAINMENTS.map((att) => {
    const revenue = quota * att;
    let commission = 0;

    for (const tier of f.tiers) {
      const tMin = (parseFloat(tier.minPct) / 100) * quota;
      const tMax = (parseFloat(tier.maxPct) / 100) * quota;
      const rate = (parseFloat(tier.rate) || 0) / 100;
      if (revenue <= tMin) continue;
      const inTier = Math.min(revenue, tMax) - tMin;
      commission += inTier * rate;
    }

    let accelerator = 0;
    if (att > accelThresh) {
      const excessRevenue = revenue - quota * accelThresh;
      // find the top tier rate and apply multiplier bonus
      const topTier = f.tiers[f.tiers.length - 1];
      const topRate = (parseFloat(topTier?.rate || "0") / 100);
      // accelerator = extra pay on excess above threshold
      accelerator = excessRevenue * topRate * (accelMult - 1);
    }

    const totalCommission = commission + accelerator;
    const total = base + totalCommission;
    const netTotal = f.drawRecoverable
      ? Math.max(base, total - Math.max(0, annualDraw - totalCommission))
      : total;

    return { attainment: att, revenue, commission, accelerator, total: total, draw: annualDraw, netTotal };
  });
}

function SalesRepTab() {
  const [f, setF] = useState<SRForm>({
    quota: "1000000", baseSalary: "60000",
    tiers: [newTier("0", "100", "5"), newTier("100", "150", "8"), newTier("150", "200", "12")],
    acceleratorThreshold: "150", acceleratorMultiplier: "2",
    drawMonthly: "0", drawRecoverable: true,
  });
  const [res, setRes] = useState<SRRow[] | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  function sfr<K extends keyof SRForm>(k: K, v: SRForm[K]) { setF((p) => ({ ...p, [k]: v })); setRes(null); }
  function addTier() { setF((p) => ({ ...p, tiers: [...p.tiers, newTier(p.tiers.at(-1)?.maxPct ?? "150", "200", "15")] })); }
  function removeTier(id: string) { setF((p) => ({ ...p, tiers: p.tiers.filter((t) => t.id !== id) })); }
  function editTier(id: string, field: keyof Omit<Tier, "id">, val: string) {
    setF((p) => ({ ...p, tiers: p.tiers.map((t) => t.id === id ? { ...t, [field]: val } : t) }));
  }

  function calc(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = calcSR(f);
    if (!r) { setErr("Please enter a valid annual quota."); return; }
    setRes(r);
    setTimeout(() => document.getElementById("sr-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function copy() {
    if (!res) return;
    const txt = ["Sales Rep Commission — NetMoneyTools.com", `Quota: ${fmt(parseFloat(f.quota.replace(/,/g, "")))}`, `Base Salary: ${fmt(parseFloat(f.baseSalary.replace(/,/g, "")))}`, ""].concat(
      res.map((r) => `${(r.attainment * 100).toFixed(0)}% attainment: ${fmt(r.revenue)} revenue → ${fmt(r.total)} total comp`)
    ).join("\n");
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#475569] bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        Sales reps earn a base salary plus tiered commission on revenue generated. Accelerators reward overperformers by boosting commission rates above quota, while draws provide a minimum monthly advance against future commissions.
      </p>

      <form onSubmit={calc} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Annual Quota" prefix="$" value={f.quota} onChange={(v) => sfr("quota", v)} placeholder="1000000" type="number" />
          <Field label="Annual Base Salary" prefix="$" value={f.baseSalary} onChange={(v) => sfr("baseSalary", v)} placeholder="60000" type="number" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-[#0f172a]">Commission Tiers</p>
            <button type="button" onClick={addTier} className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline">
              <Plus size={13} /> Add Tier
            </button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-2">
              <span className="text-xs font-semibold text-[#64748b]">From % Quota</span>
              <span className="text-xs font-semibold text-[#64748b]">To % Quota</span>
              <span className="text-xs font-semibold text-[#64748b]">Commission %</span>
              <span />
            </div>
            {f.tiers.map((t, i) => (
              <div key={t.id} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
                <input type="number" value={t.minPct} onChange={(e) => editTier(t.id, "minPct", e.target.value)}
                  className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] bg-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                <input type="number" value={t.maxPct} onChange={(e) => editTier(t.id, "maxPct", e.target.value)}
                  className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] bg-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                <div className="relative">
                  <input type="number" value={t.rate} onChange={(e) => editTier(t.id, "rate", e.target.value)}
                    className="w-full px-3 py-2 pr-7 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] bg-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xs">%</span>
                </div>
                {i > 0 ? (
                  <button type="button" onClick={() => removeTier(t.id)} className="text-[#f43f5e] hover:text-rose-700">
                    <Trash2 size={15} />
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#f1f5f9] pt-4">
          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Accelerator & Draw</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Accelerator Kicks In At" suffix="% of Quota" value={f.acceleratorThreshold} onChange={(v) => sfr("acceleratorThreshold", v)} type="number" hint="e.g. 150 = kicks in above 150%" />
            <Field label="Accelerator Multiplier" suffix="x" value={f.acceleratorMultiplier} onChange={(v) => sfr("acceleratorMultiplier", v)} type="number" step="0.5" hint="e.g. 2 = 2× rate above threshold" />
            <Field label="Monthly Draw" prefix="$" value={f.drawMonthly} onChange={(v) => sfr("drawMonthly", v)} placeholder="0" type="number" hint="Monthly advance on commissions" />
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#0f172a]">Draw Type</label>
              <div className="flex gap-3">
                {["Recoverable", "Non-Recoverable"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#475569]">
                    <input type="radio" name="drawtype" value={opt}
                      checked={f.drawRecoverable === (opt === "Recoverable")}
                      onChange={() => sfr("drawRecoverable", opt === "Recoverable")}
                      className="text-[#2563eb] focus:ring-[#2563eb]"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {err && <ErrMsg msg={err} />}
        <CalcBtn label="Calculate Earnings" />
      </form>

      {res && (
        <div id="sr-results" className="space-y-4">
          <ResultsHeader title="Earnings at Each Attainment Level" onCopy={copy} copied={copied} />
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#64748b] uppercase">Attainment</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#64748b] uppercase">Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#64748b] uppercase hidden sm:table-cell">Commission</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#64748b] uppercase hidden sm:table-cell">Accelerator</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#64748b] uppercase">Total Comp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8fafc]">
                  {res.map((row) => {
                    const isTarget = row.attainment === 1.0;
                    return (
                      <tr key={row.attainment} className={isTarget ? "bg-blue-50" : ""}>
                        <td className={`px-4 py-3 font-bold ${isTarget ? "text-[#2563eb]" : row.attainment >= 1.5 ? "text-[#10b981]" : "text-[#0f172a]"}`}>
                          {(row.attainment * 100).toFixed(0)}%
                          {isTarget && <span className="ml-1.5 text-xs bg-[#2563eb] text-white px-1.5 py-0.5 rounded">quota</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-[#475569]">{fmt(row.revenue)}</td>
                        <td className="px-4 py-3 text-right text-[#475569] hidden sm:table-cell">{fmt(row.commission)}</td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          {row.accelerator > 0 ? <span className="text-[#10b981] font-semibold">+{fmt(row.accelerator)}</span> : <span className="text-[#94a3b8]">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${isTarget ? "text-[#2563eb]" : "text-[#0f172a]"}`}>{fmt(row.total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-[#94a3b8]">Base salary: {fmt(parseFloat(f.baseSalary.replace(/,/g, "")))} — included in Total Comp. Accelerator applies above {f.acceleratorThreshold}% of quota at {f.acceleratorMultiplier}× rate.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 3 — CAR SALES
══════════════════════════════════════════════════════════════════════════ */
interface CSForm {
  salePrice: string;
  packAmount: string;
  grossProfit: string;
  useManualGross: boolean;
  commissionPct: string;
  miniThreshold: string;
  miniAmount: string;
  carsThisMonth: string;
  volumeThreshold: string;
  volumeBonus: string;
}
interface CSResult {
  grossProfit: number;
  isMini: boolean;
  commission: number;
  volumeBonus: number;
  total: number;
  effectivePctOfSale: number;
}

function calcCS(f: CSForm): CSResult | null {
  const price = parseFloat(f.salePrice.replace(/,/g, "")) || 0;
  if (price <= 0) return null;
  const pack = parseFloat(f.packAmount.replace(/,/g, "")) || 0;
  const manualGross = parseFloat(f.grossProfit.replace(/,/g, "")) || 0;
  const grossProfit = f.useManualGross ? manualGross : Math.max(0, price - pack);
  const commPct = (parseFloat(f.commissionPct) || 25) / 100;
  const miniThreshold = parseFloat(f.miniThreshold.replace(/,/g, "")) || 1200;
  const miniAmount = parseFloat(f.miniAmount.replace(/,/g, "")) || 150;
  const cars = parseInt(f.carsThisMonth) || 0;
  const volThreshold = parseInt(f.volumeThreshold) || 10;
  const volBonus = parseFloat(f.volumeBonus.replace(/,/g, "")) || 500;

  const isMini = grossProfit < miniThreshold;
  const commission = isMini ? miniAmount : grossProfit * commPct;
  const volumeBonus = cars >= volThreshold ? volBonus : 0;
  const total = commission + volumeBonus;

  return { grossProfit, isMini, commission, volumeBonus, total, effectivePctOfSale: price > 0 ? commission / price : 0 };
}

function CarSalesTab() {
  const [f, setF] = useState<CSForm>({
    salePrice: "", packAmount: "1500", grossProfit: "",
    useManualGross: false, commissionPct: "25",
    miniThreshold: "1200", miniAmount: "150",
    carsThisMonth: "0", volumeThreshold: "10", volumeBonus: "500",
  });
  const [res, setRes] = useState<CSResult | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  function sf(k: keyof CSForm, v: string | boolean) { setF((p) => ({ ...p, [k]: v })); setRes(null); }

  function calc(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = calcCS(f);
    if (!r) { setErr("Please enter a valid vehicle sale price."); return; }
    setRes(r);
    setTimeout(() => document.getElementById("cs-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function copy() {
    if (!res) return;
    const txt = [
      "Car Sales Commission — NetMoneyTools.com",
      `Sale Price: ${fmt(parseFloat(f.salePrice.replace(/,/g, "")))}`,
      `Gross Profit: ${fmt(res.grossProfit)}`,
      `Deal Type: ${res.isMini ? "Mini deal" : "Standard"}`,
      `Commission: ${fmt(res.commission)}`,
      res.volumeBonus > 0 ? `Volume Bonus: ${fmt(res.volumeBonus)}` : null,
      `Total: ${fmt(res.total)}`,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  const r = res;
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#475569] bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        Automotive salespeople earn commission on the front-end gross profit of each deal, after the dealer's pack (reserved overhead) is subtracted. Low-gross deals below a threshold pay a fixed "mini" commission rather than a percentage.
      </p>

      <form onSubmit={calc} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vehicle Sale Price" prefix="$" value={f.salePrice} onChange={(v) => sf("salePrice", v)} placeholder="e.g. 35000" type="number" />
          <Field label="Pack Amount" prefix="$" value={f.packAmount} onChange={(v) => sf("packAmount", v)} placeholder="1500" type="number" hint="Dealer overhead reserve" />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
          <input type="checkbox" checked={f.useManualGross} onChange={(e) => sf("useManualGross", e.target.checked)}
            className="h-4 w-4 rounded border-[#e2e8f0] text-[#2563eb]" />
          <span>Enter gross profit manually instead of calculating from sale price − pack</span>
        </label>

        {f.useManualGross && (
          <Field label="Gross Profit" prefix="$" value={f.grossProfit} onChange={(v) => sf("grossProfit", v)} placeholder="e.g. 3500" type="number" />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Commission % of Gross" suffix="%" value={f.commissionPct} onChange={(v) => sf("commissionPct", v)} placeholder="25" type="number" hint="Typical range: 20–30%" />
        </div>

        <div className="border-t border-[#f1f5f9] pt-4">
          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Mini Deal Rules</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mini Threshold (gross below)" prefix="$" value={f.miniThreshold} onChange={(v) => sf("miniThreshold", v)} placeholder="1200" type="number" />
            <Field label="Mini Commission (flat)" prefix="$" value={f.miniAmount} onChange={(v) => sf("miniAmount", v)} placeholder="150" type="number" />
          </div>
        </div>

        <div className="border-t border-[#f1f5f9] pt-4">
          <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Volume Bonus</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Cars Sold This Month" value={f.carsThisMonth} onChange={(v) => sf("carsThisMonth", v)} placeholder="0" type="number" />
            <Field label="Volume Threshold (cars)" value={f.volumeThreshold} onChange={(v) => sf("volumeThreshold", v)} placeholder="10" type="number" />
            <Field label="Volume Bonus" prefix="$" value={f.volumeBonus} onChange={(v) => sf("volumeBonus", v)} placeholder="500" type="number" />
          </div>
        </div>

        {err && <ErrMsg msg={err} />}
        <CalcBtn />
      </form>

      {r && (
        <div id="cs-results" className="space-y-4">
          <ResultsHeader title="Deal Breakdown" onCopy={copy} copied={copied} />
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className={`px-5 py-3 border-b border-[#e2e8f0] flex items-center gap-3 ${r.isMini ? "bg-amber-50" : "bg-[#f8fafc]"}`}>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.isMini ? "bg-amber-500 text-white" : "bg-[#10b981] text-white"}`}>
                {r.isMini ? "MINI DEAL" : "STANDARD"}
              </span>
              <span className="text-sm text-[#475569]">
                {r.isMini ? `Gross below ${fmt(parseFloat(f.miniThreshold.replace(/,/g, "")))} threshold` : `${f.commissionPct}% of gross profit`}
              </span>
            </div>
            <div className="divide-y divide-[#f8fafc]">
              <RRow label="Vehicle Sale Price" value={fmt(parseFloat(f.salePrice.replace(/,/g, "")))} />
              {!f.useManualGross && <RRow label={`Pack Deduction`} value={`(${fmt(parseFloat(f.packAmount.replace(/,/g, "")))})`} red />}
              <RRow label="Front-End Gross Profit" value={fmt(r.grossProfit)} />
              <RRow label={r.isMini ? "Mini Commission (flat)" : `Commission (${f.commissionPct}% of gross)`} value={fmt(r.commission)} />
              {r.volumeBonus > 0 && (
                <RRow label={`Volume Bonus (${f.carsThisMonth} cars ≥ ${f.volumeThreshold})`} value={`+${fmt(r.volumeBonus)}`} green />
              )}
              {r.volumeBonus === 0 && parseInt(f.carsThisMonth) > 0 && (
                <RRow label={`Volume Bonus (need ${parseInt(f.volumeThreshold) - parseInt(f.carsThisMonth)} more cars)`} value="—" />
              )}
              <RRow label="Total Commission" value={fmt(r.total)} bold green />
              <RRow label="Commission as % of Sale" value={pct(r.effectivePctOfSale)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB 4 — BUSINESS BROKER
══════════════════════════════════════════════════════════════════════════ */
type FeeStructure = "lehman" | "double" | "custom";
interface BBTier { id: string; upTo: string; rate: string; }
interface BBForm {
  salePrice: string;
  structure: FeeStructure;
  customTiers: BBTier[];
  minFee: string;
}

const LEHMAN_TIERS = [
  { upTo: 1_000_000, rate: 0.05, label: "First $1M" },
  { upTo: 2_000_000, rate: 0.04, label: "Second $1M" },
  { upTo: 3_000_000, rate: 0.03, label: "Third $1M" },
  { upTo: 4_000_000, rate: 0.02, label: "Fourth $1M" },
  { upTo: Infinity,  rate: 0.01, label: "Above $4M"  },
];
const DOUBLE_LEHMAN_TIERS = [
  { upTo: 1_000_000, rate: 0.10, label: "First $1M" },
  { upTo: 2_000_000, rate: 0.08, label: "Second $1M" },
  { upTo: 3_000_000, rate: 0.06, label: "Third $1M" },
  { upTo: 4_000_000, rate: 0.04, label: "Fourth $1M" },
  { upTo: Infinity,  rate: 0.02, label: "Above $4M"  },
];

function applyTiers(price: number, tiers: { upTo: number; rate: number; label: string }[]) {
  let remaining = price;
  let prev = 0;
  const rows: { label: string; amount: number; rate: number; fee: number }[] = [];
  for (const t of tiers) {
    if (remaining <= 0) break;
    const band = Math.min(remaining, t.upTo - prev);
    const fee = band * t.rate;
    rows.push({ label: t.label, amount: band, rate: t.rate, fee });
    remaining -= band;
    prev = t.upTo;
  }
  return rows;
}

function calcBB(f: BBForm): { rows: { label: string; amount: number; rate: number; fee: number }[]; totalFee: number; effectivePct: number; minFeeApplied: boolean } | null {
  const price = parseFloat(f.salePrice.replace(/,/g, "")) || 0;
  if (price <= 0) return null;
  const minFee = parseFloat(f.minFee.replace(/,/g, "")) || 0;

  let rows: { label: string; amount: number; rate: number; fee: number }[] = [];
  if (f.structure === "lehman") rows = applyTiers(price, LEHMAN_TIERS);
  else if (f.structure === "double") rows = applyTiers(price, DOUBLE_LEHMAN_TIERS);
  else {
    const tiers = f.customTiers.map((t, i) => ({
      upTo: parseFloat(t.upTo.replace(/,/g, "")) || Infinity,
      rate: (parseFloat(t.rate) || 0) / 100,
      label: i === 0 ? `First ${fmt(parseFloat(t.upTo.replace(/,/g, "")))}` : `Up to ${fmt(parseFloat(t.upTo.replace(/,/g, "")))}`,
    })).filter((t) => t.upTo > 0).sort((a, b) => a.upTo - b.upTo);
    if (tiers.length === 0) return null;
    // ensure last tier extends to infinity
    tiers[tiers.length - 1].upTo = Infinity;
    rows = applyTiers(price, tiers);
  }

  const totalFeeRaw = rows.reduce((s, r) => s + r.fee, 0);
  const minFeeApplied = totalFeeRaw < minFee;
  const totalFee = Math.max(totalFeeRaw, minFee);
  return { rows, totalFee, effectivePct: totalFee / price, minFeeApplied };
}

function BusinessBrokerTab() {
  const [f, setF] = useState<BBForm>({
    salePrice: "", structure: "lehman", minFee: "10000",
    customTiers: [
      { id: "c1", upTo: "1000000", rate: "10" },
      { id: "c2", upTo: "5000000", rate: "8"  },
      { id: "c3", upTo: "9999999999", rate: "5"  },
    ],
  });
  const [res, setRes] = useState<ReturnType<typeof calcBB>>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  function sf<K extends keyof BBForm>(k: K, v: BBForm[K]) { setF((p) => ({ ...p, [k]: v })); setRes(null); }
  function addCustomTier() { setF((p) => ({ ...p, customTiers: [...p.customTiers, { id: Math.random().toString(36).slice(2), upTo: "", rate: "5" }] })); }
  function removeCustomTier(id: string) { setF((p) => ({ ...p, customTiers: p.customTiers.filter((t) => t.id !== id) })); }
  function editCustomTier(id: string, field: "upTo" | "rate", val: string) {
    setF((p) => ({ ...p, customTiers: p.customTiers.map((t) => t.id === id ? { ...t, [field]: val } : t) }));
  }

  function calc(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = calcBB(f);
    if (!r) { setErr("Please enter a valid business sale price."); return; }
    setRes(r);
    setTimeout(() => document.getElementById("bb-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function copy() {
    if (!res) return;
    const price = parseFloat(f.salePrice.replace(/,/g, ""));
    const txt = ["Business Broker Fee — NetMoneyTools.com", `Sale Price: ${fmt(price)}`, `Structure: ${f.structure === "lehman" ? "Lehman Formula" : f.structure === "double" ? "Double Lehman" : "Custom"}`, ""]
      .concat(res.rows.map((r) => `${r.label}: ${pct(r.rate)} on ${fmt(r.amount)} = ${fmt(r.fee)}`))
      .concat(["", `Total Fee: ${fmt(res.totalFee)} (${pct(res.effectivePct)})`]).join("\n");
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  const r = res;
  const STRUCTURE_LABELS: Record<FeeStructure, string> = { lehman: "Lehman Formula", double: "Double Lehman", custom: "Custom Tiers" };
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#475569] bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        Business brokers and M&A advisors typically use a tiered fee structure like the Lehman Formula, where higher transaction values carry progressively lower percentage rates. The total fee is calculated by applying each rate to the portion of the sale price within that tier.
      </p>

      <form onSubmit={calc} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Sale Price" prefix="$" value={f.salePrice} onChange={(v) => sf("salePrice", v)} placeholder="e.g. 2500000" type="number" />
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-[#0f172a]">Fee Structure</label>
            <select value={f.structure} onChange={(e) => sf("structure", e.target.value as FeeStructure)}
              className="w-full px-3 py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]">
              {(Object.keys(STRUCTURE_LABELS) as FeeStructure[]).map((k) => (
                <option key={k} value={k}>{STRUCTURE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <Field label="Minimum Fee" prefix="$" value={f.minFee} onChange={(v) => sf("minFee", v)} placeholder="10000" type="number" hint="Applied if calculated fee is lower" />
        </div>

        {f.structure !== "custom" && (
          <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-[#e2e8f0] bg-[#f0f4ff]">
              <p className="text-xs font-bold text-[#475569] uppercase tracking-wider">{STRUCTURE_LABELS[f.structure]} Rate Table</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {(f.structure === "lehman" ? LEHMAN_TIERS : DOUBLE_LEHMAN_TIERS).map((t, i) => (
                  <tr key={i} className="border-b border-[#f1f5f9] last:border-0">
                    <td className="px-4 py-2 text-[#475569]">{t.label}</td>
                    <td className="px-4 py-2 text-right font-semibold text-[#2563eb]">{(t.rate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {f.structure === "custom" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-[#0f172a]">Custom Tiers</p>
              <button type="button" onClick={addCustomTier} className="flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline">
                <Plus size={13} /> Add Tier
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_32px] gap-2 px-2">
                <span className="text-xs font-semibold text-[#64748b]">Up to (price)</span>
                <span className="text-xs font-semibold text-[#64748b]">Rate %</span>
                <span />
              </div>
              {f.customTiers.map((t, i) => (
                <div key={t.id} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xs">$</span>
                    <input type="number" value={t.upTo} onChange={(e) => editCustomTier(t.id, "upTo", e.target.value)}
                      placeholder={i === f.customTiers.length - 1 ? "∞" : "e.g. 1000000"}
                      className="w-full pl-6 pr-3 py-2 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] bg-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                  </div>
                  <div className="relative">
                    <input type="number" value={t.rate} onChange={(e) => editCustomTier(t.id, "rate", e.target.value)}
                      className="w-full px-3 py-2 pr-7 border border-[#e2e8f0] rounded-lg text-sm text-[#0f172a] bg-[#f8fafc] focus:outline-none focus:ring-1 focus:ring-[#2563eb]" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-xs">%</span>
                  </div>
                  {i > 0 ? (
                    <button type="button" onClick={() => removeCustomTier(t.id)} className="text-[#f43f5e] hover:text-rose-700"><Trash2 size={15} /></button>
                  ) : <span />}
                </div>
              ))}
            </div>
          </div>
        )}

        {err && <ErrMsg msg={err} />}
        <CalcBtn label="Calculate Broker Fee" />
      </form>

      {r && (
        <div id="bb-results" className="space-y-4">
          <ResultsHeader title="Fee Breakdown" onCopy={copy} copied={copied} />

          {/* Summary hero */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2563eb] rounded-xl p-4 text-white text-center">
              <p className="text-blue-200 text-xs mb-1">Total Broker Fee</p>
              <p className="text-2xl font-extrabold">{fmt(r.totalFee)}</p>
              {r.minFeeApplied && <p className="text-xs text-blue-200 mt-1">Minimum fee applied</p>}
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center shadow-sm">
              <p className="text-[#94a3b8] text-xs mb-1">Effective Rate</p>
              <p className="text-2xl font-extrabold text-[#0f172a]">{pct(r.effectivePct)}</p>
              <p className="text-xs text-[#94a3b8] mt-1">of sale price</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="bg-[#f8fafc] px-5 py-3 border-b border-[#e2e8f0]">
              <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Tier-by-Tier Breakdown</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#f1f5f9]">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Tranche</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Amount</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Rate</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-[#64748b] uppercase">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f8fafc]">
                  {r.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="px-5 py-2.5 text-[#475569]">{row.label}</td>
                      <td className="px-5 py-2.5 text-right text-[#0f172a]">{fmt(row.amount)}</td>
                      <td className="px-5 py-2.5 text-right text-[#2563eb] font-medium">{pct(row.rate)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-[#0f172a]">{fmt(row.fee)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#f0f4ff] font-bold">
                    <td className="px-5 py-2.5 text-[#0f172a]" colSpan={3}>Total Broker Fee {r.minFeeApplied && <span className="text-xs font-normal text-amber-600 ml-1">(minimum applied)</span>}</td>
                    <td className="px-5 py-2.5 text-right text-[#2563eb] text-base">{fmt(r.totalFee)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ────────────────────────────────────────────── */
function Field({
  label, value, onChange, prefix, suffix, placeholder, type = "text",
  step, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  prefix?: string; suffix?: string; placeholder?: string;
  type?: string; step?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-[#0f172a]">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-[#475569] font-medium text-sm pointer-events-none">{prefix}</span>}
        <input
          type={type} step={step} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${prefix ? "pl-7" : "px-3"} ${suffix ? "pr-10" : "pr-3"} py-2.5 border border-[#e2e8f0] rounded-lg text-[#0f172a] bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-sm`}
        />
        {suffix && <span className="absolute right-3 text-[#94a3b8] text-xs pointer-events-none">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-[#94a3b8]">{hint}</p>}
    </div>
  );
}

function RRow({ label, value, red, green, bold }: { label: string; value: string; red?: boolean; green?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className={`text-sm ${bold ? "font-bold text-[#0f172a]" : "text-[#475569]"}`}>{label}</span>
      <span className={`text-sm font-${bold ? "extrabold" : "semibold"} ${red ? "text-[#f43f5e]" : green ? "text-[#10b981]" : "text-[#0f172a]"}`}>{value}</span>
    </div>
  );
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-[#f43f5e] text-sm bg-rose-50 border border-rose-200 rounded-lg p-3">
      <AlertCircle size={16} className="shrink-0" /> {msg}
    </div>
  );
}

function CalcBtn({ label = "Calculate" }: { label?: string }) {
  return (
    <button type="submit" className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg transition-colors text-base">
      {label}
    </button>
  );
}

function ResultsHeader({ title, onCopy, copied }: { title: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h3 className="font-bold text-[#0f172a] text-lg">{title}</h3>
      <button
        onClick={onCopy}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${copied ? "bg-[#10b981] text-white" : "bg-[#2563eb] hover:bg-[#1d4ed8] text-white"}`}
      >
        {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Results</>}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function CommissionCalculator() {
  const [activeTab, setActiveTab] = useState<Tab>("realestate");

  return (
    <>
      <Helmet>
        <title>Commission Calculator 2026 | Real Estate, Sales, Car, Business Broker | NetMoneyTools</title>
        <meta name="description" content="Free commission calculator for real estate agents, sales reps, car salespeople, and business brokers. Includes tiered rates, splits, caps, and Lehman Formula." />
        <link rel="canonical" href="https://netmoneytools.com/commission-calculator" />
        <meta property="og:title" content="Commission Calculator | NetMoneyTools" />
        <meta property="og:description" content="Calculate commissions for real estate, sales reps, car sales, and business brokers including tiered structures." />
        <meta property="og:url" content="https://netmoneytools.com/commission-calculator" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight mb-2">
            Commission Calculator
          </h1>
          <p className="text-[#475569]">
            Calculate commissions for real estate agents, sales reps, car salespeople, and business brokers — including tiered structures, splits, caps, and the Lehman Formula.
          </p>
        </header>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-[#f1f5f9] rounded-xl overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? "bg-white text-[#2563eb] shadow-sm"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6">
          {activeTab === "realestate" && <RealEstateTab />}
          {activeTab === "salesrep"   && <SalesRepTab />}
          {activeTab === "carsales"   && <CarSalesTab />}
          {activeTab === "bizbroker"  && <BusinessBrokerTab />}
        </div>

        <div className="bg-[#fef9ee] border border-[#f59e0b]/30 rounded-xl p-4">
          <p className="text-xs text-[#92400e] leading-relaxed">
            <strong>Disclaimer:</strong> Estimates only. Commission structures vary widely by brokerage, employer, and contract. Real estate figures do not include buyer agent co-op splits or MLS fees. Sales rep tiers use simplified linear interpolation. Tax withholding on commissions is not calculated here. Consult your broker agreement or compensation plan for exact figures.
          </p>
        </div>
      </div>
    </>
  );
}
