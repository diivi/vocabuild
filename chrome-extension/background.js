// Service worker: fetches Dictionary API and queues words for VocaBuild sync.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "WORD_DETECTED") {
    handleWordDetected(message.word).then((result) => {
      sendResponse(result);
      updateBadge();
      // Push to any open VocaBuild tabs for instant sync
      if (result.success && !result.alreadyExists) {
        notifyVocaBuildTabs();
      }
    });
    return true; // keep channel open for async response
  }

  if (message.type === "GET_PENDING") {
    chrome.storage.local.get("pendingWords", (data) => {
      sendResponse({ words: data.pendingWords || [] });
    });
    return true;
  }

  if (message.type === "CLEAR_PENDING") {
    chrome.storage.local.set({ pendingWords: [] }, () => {
      updateBadge();
      sendResponse({ success: true });
    });
    return true;
  }
});

async function handleWordDetected(word) {
  const cleaned = word.trim().toLowerCase();
  if (!cleaned) return { success: false };

  // Check if already queued
  const stored = await chrome.storage.local.get("pendingWords");
  const pending = stored.pendingWords || [];

  if (pending.some((w) => w.word === cleaned)) {
    return { success: true, alreadyExists: true };
  }

  // Fetch from Dictionary API
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleaned)}`
    );
    if (!res.ok) {
      // Still queue the word even if API fails — VocaBuild will re-fetch
      pending.push({ word: cleaned, apiData: null, capturedAt: Date.now() });
      await chrome.storage.local.set({ pendingWords: pending });
      return { success: true };
    }

    const apiData = await res.json();

    // Also fetch supplementary synonyms/antonyms from Datamuse
    let extraSynonyms = [];
    let extraAntonyms = [];
    try {
      const [synRes, antRes] = await Promise.all([
        fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleaned)}&max=10`),
        fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(cleaned)}&max=10`),
      ]);
      if (synRes.ok) {
        const synData = await synRes.json();
        extraSynonyms = synData.map((d) => d.word);
      }
      if (antRes.ok) {
        const antData = await antRes.json();
        extraAntonyms = antData.map((d) => d.word);
      }
    } catch {
      // Non-critical, continue
    }

    pending.push({
      word: cleaned,
      apiData: apiData[0],
      extraSynonyms,
      extraAntonyms,
      capturedAt: Date.now(),
    });

    await chrome.storage.local.set({ pendingWords: pending });
    return { success: true };
  } catch {
    // Queue word without data
    pending.push({ word: cleaned, apiData: null, capturedAt: Date.now() });
    await chrome.storage.local.set({ pendingWords: pending });
    return { success: true };
  }
}

async function updateBadge() {
  const data = await chrome.storage.local.get("pendingWords");
  const count = (data.pendingWords || []).length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
}

// Notify any open VocaBuild tabs to sync immediately
async function notifyVocaBuildTabs() {
  const tabs = await chrome.tabs.query({
    url: [
      "http://localhost:5173/*",
      "http://localhost:4173/*",
      "https://vocabuild.vercel.app/*",
    ],
  });
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "SYNC_NOW" }).catch(() => {});
    }
  }
}

// Set initial badge on install
chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);
