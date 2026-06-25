import React from "react";
import { Helmet } from "react-helmet-async";
import { ShieldCheck } from "lucide-react";

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | NetMoneyTools</title>
        <meta name="description" content="NetMoneyTools privacy policy. We do not store personal data on servers. All calculations happen in your browser." />
        <link rel="canonical" href="https://netmoneytools.com/privacy" />
        <meta property="og:title" content="Privacy Policy | NetMoneyTools" />
        <meta property="og:url" content="https://netmoneytools.com/privacy" />
        <meta property="og:type" content="website" />
      </Helmet>

      <article className="max-w-3xl mx-auto space-y-8">
        <header>
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="text-[#10b981]" size={28} />
            <h1 className="text-4xl font-extrabold text-[#0f172a] tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-sm text-[#475569]">Effective Date: January 1, 2026</p>
          <p className="mt-3 text-[#475569] leading-relaxed">
            Your privacy matters. Here is exactly what we do and do not do with your information — in plain language.
          </p>
        </header>

        <div className="bg-[#f0fdf4] border border-[#10b981]/30 rounded-xl p-5 flex gap-3">
          <ShieldCheck className="text-[#10b981] shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-[#0f172a] font-medium leading-relaxed">
            We do not store personal data on servers. All calculations happen in your browser. Your numbers never leave your device.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-md divide-y divide-[#e2e8f0]">
          {[
            {
              title: "Information We Collect",
              content: "We do not collect personally identifiable information. When you use our calculators, your inputs (such as income amounts and filing status) are processed entirely within your browser and are stored locally on your device using localStorage solely to preserve your convenience. This data never reaches our servers."
            },
            {
              title: "How We Use Information",
              content: "We may collect aggregate, anonymized analytics data (such as page views and general geographic region) to understand how the tools are used and to improve them. This data cannot be used to identify you."
            },
            {
              title: "Cookies",
              content: "We may use minimal, non-identifying cookies for analytics purposes. We do not use cookies to track individuals across websites or to serve targeted advertising."
            },
            {
              title: "Third-Party Services",
              content: "We may use third-party analytics services (such as Google Analytics or similar tools) that collect anonymized usage data. These services have their own privacy policies. We do not sell or share your data with advertisers."
            },
            {
              title: "Children's Privacy",
              content: "NetMoneyTools is not directed at children under 13. We do not knowingly collect information from children."
            },
            {
              title: "Changes to This Policy",
              content: "We may update this privacy policy from time to time. Changes will be posted on this page with an updated effective date."
            },
            {
              title: "Contact",
              content: "If you have questions about this privacy policy, you can reach us through our website. We will do our best to respond promptly."
            }
          ].map((section) => (
            <div key={section.title} className="p-6">
              <h2 className="text-lg font-bold text-[#0f172a] mb-2">{section.title}</h2>
              <p className="text-[#475569] leading-relaxed text-sm">{section.content}</p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}
