// Detects Google's dictionary card and captures the word.
// Strategy: find the dictionary container first (anchored by "Definitions from"),
// then extract the word ONLY from within that container.

(function () {
  "use strict";

  let captured = false;

  /**
   * Finds the dictionary card container element.
   * Looks for the "Definitions from" text and walks up to find
   * the enclosing card/panel.
   */
  function findDictionaryContainer() {
    // Find the "Definitions from" anchor text
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let anchorNode = null;
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (text.startsWith("Definitions from")) {
        anchorNode = walker.currentNode;
        break;
      }
    }

    if (!anchorNode) return null;

    // Walk up from the anchor to find a reasonably-sized container.
    // The dictionary card is typically a div a few levels up that
    // contains the word, phonetic, definitions, and synonyms.
    let container = anchorNode.parentElement;
    for (let i = 0; i < 8 && container; i++) {
      // A good container will have the phonetic text inside it
      const text = container.innerText || "";
      if (
        text.includes("Definitions from") &&
        /\/[^/]+\//.test(text) && // has phonetic
        container.offsetHeight > 150
      ) {
        return container;
      }
      container = container.parentElement;
    }

    return null;
  }

  /**
   * Extracts the word from within the dictionary container.
   * The word sits right above/near the phonetic text and is rendered
   * in a large font.
   */
  function extractWord(container) {
    // Primary: find the phonetic text (e.g., /mɪˈtɪkjʊləs/) within the
    // container, then look at nearby elements for the word.
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let phoneticNode = null;
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (/^\/[^/]+\/$/.test(text)) {
        phoneticNode = walker.currentNode;
        break;
      }
    }

    if (phoneticNode) {
      // The word is in a sibling or nearby ancestor element.
      // Walk up a few levels and look for a single-word text node
      // rendered in a large font.
      let parent = phoneticNode.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        parent = parent.parentElement;
        if (!parent || !container.contains(parent)) break;

        const candidates = parent.querySelectorAll("span, div, h2, h3");
        for (const el of candidates) {
          // Must be a direct text (not a deep container)
          const t = el.textContent.trim().toLowerCase();
          if (
            t.length >= 2 &&
            t.length < 30 &&
            !/\//.test(t) &&        // not phonetic
            !/\s/.test(t) &&        // single word
            t !== "dictionary" &&
            t !== "english" &&
            t !== "noun" && t !== "verb" && t !== "adjective" &&
            t !== "adverb" && t !== "pronoun"
          ) {
            const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            if (fontSize >= 20) {
              return t;
            }
          }
        }
      }
    }

    // Fallback: use the search query, but ONLY if the dictionary
    // container was found (so we know it's a definition search).
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim().toLowerCase();

    // "define X", "X meaning", "X definition", or just a single word
    const patterns = [
      /^define\s+(\S+)$/,
      /^(\S+)\s+meaning$/,
      /^(\S+)\s+definition$/,
      /^(\S+)\s+synonym$/,
      /^(\S+)$/,
    ];
    for (const pat of patterns) {
      const m = q.match(pat);
      if (m && m[1] !== "define" && m[1] !== "meaning") {
        return m[1];
      }
    }

    return null;
  }

  function detectDictionaryCard() {
    if (captured) return null;

    const container = findDictionaryContainer();
    if (!container) return null;

    return extractWord(container);
  }

  function showBadge(word) {
    const existing = document.getElementById("vocabuild-badge");
    if (existing) existing.remove();

    const badge = document.createElement("div");
    badge.id = "vocabuild-badge";
    badge.innerHTML = `
      <div class="vocabuild-badge-inner">
        <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#6366f1"/>
          <text x="16" y="23" text-anchor="middle" font-family="system-ui" font-weight="700" font-size="20" fill="white">V</text>
        </svg>
        <span>Added "<strong>${word}</strong>" to VocaBuild</span>
      </div>
    `;
    document.body.appendChild(badge);

    setTimeout(() => {
      badge.classList.add("vocabuild-badge-hide");
      setTimeout(() => badge.remove(), 300);
    }, 4000);
  }

  function captureWord() {
    const word = detectDictionaryCard();
    if (!word || captured) return;

    captured = true;

    chrome.runtime.sendMessage(
      { type: "WORD_DETECTED", word },
      (response) => {
        if (response && response.success && !response.alreadyExists) {
          showBadge(word);
        }
      }
    );
  }

  // Google loads content dynamically, so retry a few times
  let attempts = 0;
  const maxAttempts = 10;

  function tryCapture() {
    captureWord();
    attempts++;
    if (!captured && attempts < maxAttempts) {
      setTimeout(tryCapture, 1000);
    }
  }

  setTimeout(tryCapture, 1500);

  // Watch for dynamic content changes (Google SPA navigation)
  const observer = new MutationObserver(() => {
    if (!captured) captureWord();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
})();
