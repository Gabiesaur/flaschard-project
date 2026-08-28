document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('card-count');
  const exportBasicBtn = document.getElementById('export-basic-btn');
  const clearBtn = document.getElementById('clear-btn');
  const viewCardsBtn = document.getElementById('view-cards-btn');

  let currentCards = [];

  // Load cards from storage
  function loadCards() {
    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      currentCards = result.pendingCards;
      countEl.textContent = currentCards.length;

      exportBasicBtn.disabled = currentCards.filter(c => c.type !== 'image-occlusion').length === 0;
      clearBtn.disabled = currentCards.length === 0;
      viewCardsBtn.disabled = currentCards.length === 0;
    });
  }

  // Format string for TSV (Anki format)
  function formatForAnki(str) {
    if (!str) return "";
    // If the field contains tabs, newlines, or quotes, we must wrap it in quotes
    // and escape internal quotes by doubling them (standard CSV/TSV rule)
    if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return str;
  }

  const downloadTsv = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    if (chrome.downloads) {
      chrome.downloads.download({ url: url, filename: filename, saveAs: true }, () => {
        URL.revokeObjectURL(url);
      });
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const saveToFolder = async (folder, filename, content) => {
    const file = await folder.getFileHandle(filename, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
  };

  exportBasicBtn.addEventListener('click', () => {
    const basicCards = currentCards.filter(c => c.type !== 'image-occlusion');
    if (basicCards.length === 0) return;

    let basicContent = "#separator:tab\n#html:true\n";
    basicCards.forEach(card => {
      basicContent += `${formatForAnki(card.front)}\t${formatForAnki(card.back)}\n`;
    });
    downloadTsv(basicContent, 'anki_export_basic.txt');
  });

  // View cards logic
  viewCardsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'cards.html' });
  });

  // Clear logic
  clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all pending cards? Make sure you exported them first!")) {
      chrome.storage.local.set({ pendingCards: [] }, () => {
        loadCards();
      });
    }
  });

  // Initial load
  loadCards();
});
