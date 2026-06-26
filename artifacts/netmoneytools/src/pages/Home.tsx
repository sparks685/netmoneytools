import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PiggyBank, ReceiptText, FileText, Scale, CheckCircle2, Shield, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>NetMoneyTools | Free Payroll & Tax Calculators</title>
        <meta name="description" content="Calculate your take-home pay, gross-up, and taxes. Free payroll calculators for every state. No signup required." />
        <link rel="canonical" href="https://netmoneytools.com/" />
        <meta property="og:title" content="NetMoneyTools | Free Payroll & Tax Calculators" />
        <meta property="og:description" content="Calculate your take-home pay, gross-up, and taxes. Free payroll calculators for every state." />
        <meta property="og:url" content="https://netmoneytools.com/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="flex flex-col gap-12 max-w-5xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-12 md:py-20">
          <h1 className="text-4xl md:text-6xl font-extbold tracking-tight text-headings">
            Free Payroll & Tax Calculators <br className="hidden md:block" />
            <span className="text-primary">for Every State</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Calculate your take-home pay, gross-up, and taxes. No signup required. Fast, free, and accurate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="w-full sm:w-auto text-base font-semibold">
              <Link to="/gross-up-calculator">Try Gross Up Calculator</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold border-2 hover:bg-muted">
              <Link to="/paycheck-calculator">Try Paycheck Calculator</Link>
            </Button>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          <Link to="/gross-up-calculator" className="group block h-full">
            <div className="bg-card border rounded-xl p-6 h-full shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="bg-secondary/10 p-3 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <PiggyBank className="text-secondary" size={24} />
              </div>
              <h2 className="text-xl font-bold text-headings mb-2">Gross Up Calculator</h2>
              <p className="text-muted-foreground mb-4 flex-1">
                Find out exactly how much gross pay you need to offer to hit a specific net take-home amount after taxes.
              </p>
              <div className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Tool &rarr;
              </div>
            </div>
          </Link>

          <Link to="/paycheck-calculator" className="group block h-full">
            <div className="bg-card border rounded-xl p-6 h-full shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="bg-primary/10 p-3 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ReceiptText className="text-primary" size={24} />
              </div>
              <h2 className="text-xl font-bold text-headings mb-2">Paycheck Calculator</h2>
              <p className="text-muted-foreground mb-4 flex-1">
                Calculate your exact take-home pay after federal, state, and local taxes. See where every dollar goes.
              </p>
              <div className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Tool &rarr;
              </div>
            </div>
          </Link>

          <Link to="/pay-stub-generator" className="group block h-full">
            <div className="bg-card border rounded-xl p-6 h-full shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="bg-amber-500/10 p-3 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="text-amber-500" size={24} />
              </div>
              <h2 className="text-xl font-bold text-headings mb-2">Pay Stub Generator</h2>
              <p className="text-muted-foreground mb-4 flex-1">
                Generate professional, compliant pay stubs with automatic tax calculations for your employees.
              </p>
              <div className="text-primary font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Open Tool &rarr;
              </div>
            </div>
          </Link>

          <div className="bg-card border rounded-xl p-6 h-full shadow-sm flex flex-col opacity-70 cursor-not-allowed">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-muted p-3 w-12 h-12 rounded-lg flex items-center justify-center">
                <Scale className="text-muted-foreground" size={24} />
              </div>
              <span className="bg-accent/20 text-accent font-semibold text-xs px-2 py-1 rounded">Coming Soon</span>
            </div>
            <h2 className="text-xl font-bold text-headings mb-2">1099 vs W-2 Compare</h2>
            <p className="text-muted-foreground flex-1">
              Compare independent contractor vs employee compensation to see true take-home and employer costs.
            </p>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="py-8 border-t border-b">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <CheckCircle2 className="text-secondary" size={20} />
              <span>Free Forever</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Zap className="text-accent" size={20} />
              <span>No Signup Required</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Shield className="text-primary" size={20} />
              <span>Browser-Only — Private</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <Smartphone className="text-muted-foreground" size={20} />
              <span>Mobile Friendly</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
