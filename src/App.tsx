import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout/Layout";
import { LandingPage } from "@/pages/LandingPage";
import { SearchTab } from "@/pages/SearchTab";
import { WordBankTab } from "@/pages/WordBankTab";
import { ReviewTab } from "@/pages/ReviewTab";
import { DeckPage } from "@/pages/DeckPage";
import { useTheme } from "@/hooks/useTheme";
import { backgroundPush } from "@/lib/sync";

export default function App() {
  useTheme();

  // Listen for words synced from the Chrome extension → push to gist
  useEffect(() => {
    const handler = () => backgroundPush();
    window.addEventListener("vocabuild-sync", handler);
    return () => window.removeEventListener("vocabuild-sync", handler);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page — outside the app layout */}
        <Route path="/" element={<LandingPage />} />

        {/* Main app — wrapped in Layout (bottom nav, header, etc.) */}
        <Route element={<Layout />}>
          <Route path="home" element={<SearchTab />} />
          <Route path="wordbank" element={<WordBankTab />} />
          <Route path="review" element={<ReviewTab />} />
          <Route path="deck/:id" element={<DeckPage />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
      <Analytics />
    </BrowserRouter>
  );
}
