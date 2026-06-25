import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ShieldAlert, Target, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About NetMoneyTools | Free Payroll Calculator Tools</title>
        <meta name="description" content="Built by a pharmacist with $300K in student loans who needed real payroll answers. Free, accurate, no signup." />
        <link rel="canonical" href="https://netmoneytools.com/about" />
        <meta property="og:title" content="About NetMoneyTools" />
        <meta property="og:description" content="Built by a pharmacist who needed honest, free payroll tools." />
        <meta property="og:url" content="https://netmoneytools.com/about" />
        <meta property="og:type" content="website" />
      </Helmet>

      <article className="max-w-3xl mx-auto space-y-10">
        <header>
          <h1 className="text-4xl font-extrabold text-[#0f172a] tracking-tight mb-4">About NetMoneyTools</h1>
          <p className="text-lg text-[#475569] leading-relaxed">
            Free, accurate payroll calculators built by someone who actually needed them.
          </p>
        </header>

        <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#0f172a]">Our Story</h2>
          <p className="text-[#475569] leading-relaxed">
            I am a pharmacist who built this site after struggling with over $300,000 in student loans and a complicated mix of W-2 employment and 1099 side gig income. Every time I needed to figure out my true take-home pay, or how much gross salary I actually needed to hit a net income target, I ran into the same problem: every tool online was either locked behind a paywall, required creating an account, or gave vague estimates buried in advertising.
          </p>
          <p className="text-[#475569] leading-relaxed">
            So I built the tool I wished existed. Fast, clear, no friction. Enter your numbers, get your answer. Done.
          </p>
          <p className="text-[#475569] leading-relaxed">
            NetMoneyTools is designed for employees negotiating salaries, freelancers planning quarterly taxes, and employers budgeting total compensation — anyone who needs honest numbers without jumping through hoops.
          </p>
        </section>

        <section className="bg-white rounded-xl border border-[#e2e8f0] shadow-md p-8 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-[#2563eb]" size={24} />
            <h2 className="text-2xl font-bold text-[#0f172a]">Our Mission</h2>
          </div>
          <ul className="space-y-3 text-[#475569]">
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">Free forever.</strong> No subscriptions, no "premium" features, no bait-and-switch.</span></li>
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">No signup required.</strong> Your time is valuable. Get your answer in seconds.</span></li>
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">Updated annually.</strong> Tax brackets and FICA rates are updated each year.</span></li>
            <li className="flex items-start gap-2"><ArrowRight size={16} className="text-[#10b981] mt-1 shrink-0" /><span><strong className="text-[#0f172a]">Private by design.</strong> All calculations happen in your browser. We never see your numbers.</span></li>
          </ul>
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
