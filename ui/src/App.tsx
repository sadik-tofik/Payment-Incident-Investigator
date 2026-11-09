// ui/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SkipLink } from "./components/SkipLink";
import { SiteHeader } from "./components/SiteHeader";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Investigate } from "./pages/Investigate";
import { Cases } from "./pages/Cases";
import { HowItWorks } from "./pages/HowItWorks";
import { Evidence } from "./pages/Evidence";
import { Data } from "./pages/Data";
import { Terms } from "./pages/Terms";
import { About } from "./pages/About";
import { Audit } from "./pages/Audit";
import { NotFound } from "./pages/NotFound";
import { Kit } from "./pages/Kit";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <SkipLink />
        <SiteHeader />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/investigate" element={<Investigate />} />
            <Route path="/investigate/:id" element={<Investigate />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/data" element={<Data />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/_kit" element={<Kit />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
};
