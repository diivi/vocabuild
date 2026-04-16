import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout/Layout";
import { SearchTab } from "@/pages/SearchTab";
import { WordBankTab } from "@/pages/WordBankTab";
import { ReviewTab } from "@/pages/ReviewTab";
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
        <Route element={<Layout />}>
          <Route index element={<SearchTab />} />
          <Route path="wordbank" element={<WordBankTab />} />
          <Route path="review" element={<ReviewTab />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}
