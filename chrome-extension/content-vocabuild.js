// Runs on VocaBuild pages. Reads pending words from chrome.storage.local
// and writes them directly into the vocabuild IndexedDB database.

(function () {
  "use strict";

  function flattenSynonyms(apiData) {
    const synonyms = new Set();
    for (const meaning of apiData.meanings || []) {
      for (const s of meaning.synonyms || []) synonyms.add(s);
      for (const def of meaning.definitions || []) {
        for (const s of def.synonyms || []) synonyms.add(s);
      }
    }
    return [...synonyms];
  }

  function flattenAntonyms(apiData) {
    const antonyms = new Set();
    for (const meaning of apiData.meanings || []) {
      for (const a of meaning.antonyms || []) antonyms.add(a);
      for (const def of meaning.definitions || []) {
        for (const a of def.antonyms || []) antonyms.add(a);
      }
    }
    return [...antonyms];
  }

  function flattenExamples(apiData) {
    const examples = [];
    for (const meaning of apiData.meanings || []) {
      for (const def of meaning.definitions || []) {
        if (def.example) examples.push(def.example);
      }
    }
    return examples;
  }

  function buildWordRecord(entry) {
    const apiData = entry.apiData;
    if (!apiData) return null;

    const allSynonyms = flattenSynonyms(apiData);
    const allAntonyms = flattenAntonyms(apiData);

    // Merge extra synonyms/antonyms from Datamuse
    if (entry.extraSynonyms) {
      for (const s of entry.extraSynonyms) {
        if (!allSynonyms.includes(s)) allSynonyms.push(s);
      }
    }
    if (entry.extraAntonyms) {
      for (const a of entry.extraAntonyms) {
        if (!allAntonyms.includes(a)) allAntonyms.push(a);
      }
    }

    const firstMeaning = apiData.meanings?.[0];
    const primaryDefinition =
      firstMeaning?.definitions?.[0]?.definition ?? "No definition available";
    const primaryPartOfSpeech = firstMeaning?.partOfSpeech ?? "";

    return {
      word: apiData.word || entry.word,
      phonetics: apiData.phonetics || [],
      meanings: apiData.meanings || [],
      sourceUrls: apiData.sourceUrls || [],
      searchedAt: new Date(entry.capturedAt || Date.now()),
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      allSynonyms,
      allAntonyms,
      allExamples: flattenExamples(apiData),
      primaryDefinition,
      primaryPartOfSpeech,
    };
  }

  function writeToIndexedDB(records) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vocabuild");

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;

        // Check if the words store exists
        if (!db.objectStoreNames.contains("words")) {
          db.close();
          resolve(0);
          return;
        }

        const tx = db.transaction("words", "readwrite");
        const store = tx.objectStore("words");
        let added = 0;

        function addNext(i) {
          if (i >= records.length) {
            return;
          }

          const record = records[i];
          // Check if word already exists using the unique index
          const idx = store.index("word");
          const getReq = idx.get(record.word);

          getReq.onsuccess = () => {
            if (!getReq.result) {
              // Word doesn't exist, add it
              store.add(record);
              added++;
            }
            addNext(i + 1);
          };

          getReq.onerror = () => {
            // Index might not exist, try adding anyway
            try {
              store.add(record);
              added++;
            } catch {
              // Ignore duplicates
            }
            addNext(i + 1);
          };
        }

        tx.oncomplete = () => {
          db.close();
          resolve(added);
        };

        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };

        addNext(0);
      };
    });
  }

  function showSyncToast(count) {
    if (count === 0) return;

    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: #6366f1;
      color: white;
      padding: 8px 16px;
      border-radius: 10px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      animation: vocabuild-fade-in 0.3s ease-out;
    `;
    toast.textContent = `${count} word${count > 1 ? "s" : ""} synced from Google`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  async function sync() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_PENDING" }, resolve);
      });

      const pending = response?.words || [];
      if (pending.length === 0) return;

      // Build records from pending words (skip ones without API data)
      const records = pending
        .map(buildWordRecord)
        .filter((r) => r !== null);

      if (records.length === 0) {
        // Clear queue even if no records could be built
        chrome.runtime.sendMessage({ type: "CLEAR_PENDING" });
        return;
      }

      const added = await writeToIndexedDB(records);

      // Clear the queue
      chrome.runtime.sendMessage({ type: "CLEAR_PENDING" });

      // Show toast and reload the page data
      showSyncToast(added);

      // Dispatch a custom event so the React app can refresh
      if (added > 0) {
        window.dispatchEvent(new CustomEvent("vocabuild-sync", { detail: { added } }));
      }
    } catch (err) {
      console.error("[VocaBuild Extension] Sync failed:", err);
    }
  }

  // Run sync after page loads
  if (document.readyState === "complete") {
    setTimeout(sync, 500);
  } else {
    window.addEventListener("load", () => setTimeout(sync, 500));
  }

  // Listen for instant sync pushes from the background worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SYNC_NOW") {
      sync();
    }
  });
})();
