document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('card-count');
  const exportBtn = document.getElementById('export-btn');
  const clearBtn = document.getElementById('clear-btn');
  
  let currentCards = [];
  
  // Load cards from storage
  function loadCards() {
    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      currentCards = result.pendingCards;
      countEl.textContent = currentCards.length;
      
      exportBtn.disabled = currentCards.length === 0;
      clearBtn.disabled = currentCards.length === 0;
    });
  }
  
  // Format string for TSV (remove literal tabs and newlines that break the format)
  function sanitizeForTSV(str) {
    if (!str) return "";
    return str.replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, '');
  }
  
  // Export logic
  exportBtn.addEventListener('click', () => {
    if (currentCards.length === 0) return;
    
    // Create TSV content
    // Anki format: Front \t Back \t Tags \n
    let tsvContent = "";
    
    currentCards.forEach(card => {
      const front = sanitizeForTSV(card.front);
      const back = sanitizeForTSV(card.back);
      const tags = sanitizeForTSV(card.tags);
      
      tsvContent += `${front}\t${back}\t${tags}\n`;
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
