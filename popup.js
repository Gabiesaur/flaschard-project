document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('card-count');
  const exportBtn = document.getElementById('export-btn');
  const clearBtn = document.getElementById('clear-btn');
  const viewCardsBtn = document.getElementById('view-cards-btn');

  let currentCards = [];

  function imageOcclusionField(card, revealMasks) {
    const occlusion = card.imageOcclusion;
    if (!occlusion || !occlusion.image || !occlusion.masks?.length) return '';
    const maskClass = revealMasks ? 'cloze-highlight' : 'cloze';
    const masks = occlusion.masks.map(mask =>
      `<div class="${maskClass}" data-ordinal="1" data-shape="${mask.shape === 'ellipse' ? 'ellipse' : 'rect'}" data-left="${mask.left.toFixed(4)}" data-top="${mask.top.toFixed(4)}" data-width="${mask.width.toFixed(4)}" data-height="${mask.height.toFixed(4)}" data-occludeInactive="1"></div>`
    ).join('');
    const extra = revealMasks ? card.back : card.front;
    return `<div style="display: none">${masks}</div><div id="err"></div><div id="image-occlusion-container"><img src="${occlusion.image}"><canvas id="image-occlusion-canvas"></canvas></div><script>try { anki.imageOcclusion.setup(); } catch (exc) { document.getElementById("err").innerHTML = "Error loading image occlusion. Is your Anki version up to date?"; }</script>${extra ? `<div>${extra}</div>` : ''}${revealMasks ? '<div><button id="toggle">Toggle Masks</button></div>' : ''}`;
  }

  // Load cards from storage
  function loadCards() {
    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      currentCards = result.pendingCards;
      countEl.textContent = currentCards.length;

      exportBtn.disabled = currentCards.length === 0;
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

  // Export logic
  exportBtn.addEventListener('click', () => {
    if (currentCards.length === 0) return;

    // Create TSV content
    // Anki headers
    let tsvContent = "#separator:tab\n#html:true\n";

    currentCards.forEach(card => {
      const isImageOcclusion = card.type === 'image-occlusion';
      const front = formatForAnki(isImageOcclusion ? imageOcclusionField(card, false) : card.front);
      const back = formatForAnki(isImageOcclusion ? imageOcclusionField(card, true) : card.back);

      tsvContent += `${front}\t${back}\n`;
    });

    // Create Blob and trigger download
    // Using a trick with an anchor tag to trigger the download within the popup context
    const blob = new Blob([tsvContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // In MV3, chrome.downloads API is better if we have the permission
    if (chrome.downloads) {
      chrome.downloads.download({
        url: url,
        filename: 'anki_export.txt',
        saveAs: true // Prompts the user where to save
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          // Success
          URL.revokeObjectURL(url);
        }
      });
    } else {
      // Fallback
      const a = document.createElement('a');
      a.href = url;
      a.download = 'anki_export.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
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
