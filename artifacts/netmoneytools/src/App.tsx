import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import GrossUpCalculator from "@/pages/GrossUpCalculator";
import PaycheckCalculator from "@/pages/PaycheckCalculator";
import PayStubGenerator from "@/pages/PayStubGenerator";
import ContractorCompare from "@/pages/ContractorCompare";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <HelmetProvider>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="gross-up-calculator" element={<GrossUpCalculator />} />
              <Route path="paycheck-calculator" element={<PaycheckCalculator />} />
              <Route path="paycheck-calculator/:state" element={<PaycheckCalculator />} />
              <Route path="pay-stub-generator" element={<PayStubGenerator />} />
              <Route path="1099-vs-w2" element={<ContractorCompare />} />
              <Route path="about" element={<About />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </HelmetProvider>
  );
}

export default App;
