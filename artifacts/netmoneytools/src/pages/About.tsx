import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ShieldAlert, Target, ArrowRight, Wrench, Clock } from "lucide-react";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About NetMoneyTools | Free Payroll & Tax Calculators</title>
        <meta name="description" content="NetMoneyTools builds free, accurate financial calculators for anyone who needs fast answers without signing up or jumping through paywalls." />
        <link rel="canonical" href="https://netmoneytools.com/about" />
        <meta property="og:title" content="About NetMoneyTools" />
        <meta property="og:description" content="Free, accurate financial calculators. No signup. No paywalls. Built for real-life use." />
        <meta property="og:url" content="https://netmoneytools.com/about" />
        <meta property="og:type" content="website" />
      </Helmet>

      <article className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-4xl font-extrabold text-[#0f172a] tracking-tight mb-4">About NetMoneyTools</h1>
          <p className="text-lg text-[#475569] leading-relaxed">
            NetMoneyTools builds free, accurate financial calculators for anyone who needs fast answers without signing up or jumping through paywalls.
          </p>
          <p className="text-[#475569] leading-relaxed mt-3">
            We started with a simple frustration: most payroll and tax tools online are either buried behind registration walls, packed with ads, or give vague estimates that don't match real-world paychecks. So we built something better.
          </p>
        </header>

        <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#0f172a]">What We Do</h2>
          <p className="text-[#475569] leading-relaxed">
            Our calculators are designed for real-life use. Whether you're an employee negotiating salary, a freelancer planning quarterly taxes, or an employer budgeting total compensation, our tools give you precise numbers you can act on.
          </p>
          <p className="text-[#475569] leading-relaxed">
            Every calculator is built in-house with current federal and state tax data, and we keep them updated as tax laws change.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="text-[#2563eb]" size={20} />
              <h2 className="text-xl font-bold text-[#0f172a]">Current Tools</h2>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <ArrowRight size={15} className="text-[#10b981] mt-0.5 shrink-0" />
                <span className="text-sm text-[#475569]"><strong className="text-[#0f172a]">Gross Up Calculator</strong> — Find the gross salary needed to hit a specific net take-home amount after taxes.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight size={15} className="text-[#10b981] mt-0.5 shrink-0" />
                <span className="text-sm text-[#475569]"><strong className="text-[#0f172a]">Paycheck Calculator</strong> — Calculate exact take-home pay after federal, state, and local taxes for all 50 states.</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="text-[#f59e0b]" size={20} />
              <h2 className="text-xl font-bold text-[#0f172a]">Coming Soon</h2>
            </div>
            <ul className="space-y-2">
              {[
                "Pay Stub Generator",
                "1099 vs W-2 Compensation Compare",
                "Currency & Money Converters",
                "Additional financial and tax planning tools",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ArrowRight size={15} className="text-[#94a3b8] mt-0.5 shrink-0" />
                  <span className="text-sm text-[#475569]">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-8 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-[#2563eb]" size={22} />
            <h2 className="text-2xl font-bold text-[#0f172a]">Our Approach</h2>
          </div>
          <ul className="space-y-3 text-[#475569]">
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">No signup required.</strong> Get your answer without creating an account.</span></li>
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">No paywalls.</strong> Every tool is free, with no locked "premium" tiers.</span></li>
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">Fast, clean, and mobile-friendly.</strong> Built to work on any device with no friction.</span></li>
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">Accurate, up-to-date tax calculations.</strong> Federal brackets and state rates are maintained for the current tax year.</span></li>
          </ul>
          <p className="text-sm text-[#475569] pt-2 border-t border-[#e2e8f0]">
            NetMoneyTools is independently developed and operated by a team of finance and technology professionals. We plan to expand our toolset regularly based on what users actually need.
          </p>
        </section>

        <section className="bg-[#fef9ee] border border-[#f59e0b]/30 rounded-xl p-6 flex gap-4">
          <ShieldAlert className="text-[#f59e0b] shrink-0 mt-1" size={22} />
          <div>
            <h3 className="font-semibold text-[#0f172a] mb-1">Important Disclaimer</h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              NetMoneyTools provides estimates only. Tax calculations are based on simplified federal and state tax rates for illustrative purposes. Actual withholding may differ based on additional deductions, pre-tax benefits, local taxes, and other factors. Tax laws change frequently. Always consult a qualified tax professional or CPA for advice specific to your situation.
            </p>
          </div>
        </section>

        <section className="flex gap-4 flex-wrap">
          <Link to="/gross-up-calculator" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] text-white rounded-lg font-semibold hover:bg-[#1d4ed8] transition-colors text-sm">
            Try Gross Up Calculator <ArrowRight size={16} />
          </Link>
          <Link to="/paycheck-calculator" className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#2563eb] text-[#2563eb] rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm">
            Try Paycheck Calculator <ArrowRight size={16} />
          </Link>
        </section>
      </article>
    </>
  );
}
