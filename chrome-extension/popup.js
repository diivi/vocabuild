function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

chrome.storage.local.get("pendingWords", (data) => {
  const words = data.pendingWords || [];
  document.getElementById("count").textContent = words.length;

  if (words.length === 0) {
    document.getElementById("empty").style.display = "block";
    return;
  }

  const list = document.getElementById("word-list");
  // Show most recent first
  const sorted = [...words].sort((a, b) => (b.capturedAt || 0) - (a.capturedAt || 0));

  for (const entry of sorted) {
    const item = document.createElement("div");
    item.className = "word-item";
    item.innerHTML = `
      <span class="word-name">${entry.word}</span>
      <span class="word-time">${formatTime(entry.capturedAt)}</span>
    `;
    list.appendChild(item);
  }
});
