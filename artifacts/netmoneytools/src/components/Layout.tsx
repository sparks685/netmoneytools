import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Calculator, Menu, X, PiggyBank, ReceiptText, FileText, Home, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Calculator size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-headings">NetMoney<span className="text-primary">Tools</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/gross-up-calculator" className={`hover:text-primary transition-colors ${location.pathname === '/gross-up-calculator' ? 'text-primary' : 'text-muted-foreground'}`}>Gross Up</Link>
            <Link to="/paycheck-calculator" className={`hover:text-primary transition-colors ${location.pathname.startsWith('/paycheck-calculator') ? 'text-primary' : 'text-muted-foreground'}`}>Paycheck</Link>
            <Link to="/pay-stub-generator" className={`hover:text-primary transition-colors ${location.pathname === '/pay-stub-generator' ? 'text-primary' : 'text-muted-foreground'}`}>Pay Stub</Link>
            <Link to="/about" className={`hover:text-primary transition-colors ${location.pathname === '/about' ? 'text-primary' : 'text-muted-foreground'}`}>About</Link>
          </nav>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </header>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background border-b shadow-md flex flex-col p-4 gap-4">
          <Link to="/" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted font-medium" onClick={closeMenu}>
            <Home size={20} className="text-primary" /> Home
          </Link>
          <Link to="/gross-up-calculator" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted font-medium" onClick={closeMenu}>
            <PiggyBank size={20} className="text-secondary" /> Gross Up Calculator
          </Link>
          <Link to="/paycheck-calculator" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted font-medium" onClick={closeMenu}>
            <ReceiptText size={20} className="text-accent" /> Paycheck Calculator
          </Link>
          <Link to="/pay-stub-generator" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted font-medium" onClick={closeMenu}>
            <FileText size={20} className="text-amber-500" /> Pay Stub Generator
          </Link>
          <Link to="/about" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted font-medium" onClick={closeMenu}>
            <Info size={20} className="text-muted-foreground" /> About
          </Link>
          <Link to="/privacy" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted font-medium" onClick={closeMenu}>
            <ShieldCheck size={20} className="text-muted-foreground" /> Privacy
          </Link>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-card py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="font-bold tracking-tight text-headings">NetMoney<span className="text-primary">Tools</span></span>
            <p className="text-sm text-muted-foreground mt-1">© 2026 NetMoneyTools.com — For estimation purposes only.</p>
          </div>
          <div className="flex gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
