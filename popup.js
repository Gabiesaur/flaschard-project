document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('card-count');
  const syncAnkiBtn = document.getElementById('sync-anki-btn');
  const clearBtn = document.getElementById('clear-btn');
  const viewCardsBtn = document.getElementById('view-cards-btn');
  const deckSelect = document.getElementById('deck-select');
  const changeKeybindBtn = document.getElementById('change-keybind-btn');

  if (changeKeybindBtn) {
    changeKeybindBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  let currentCards = [];

  // Load cards from storage
  function loadCards() {
    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      currentCards = result.pendingCards;
      countEl.textContent = currentCards.length;

      syncAnkiBtn.disabled = currentCards.length === 0;
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

  // Load selected deck
  chrome.storage.local.get({ targetDeck: 'Default' }, (result) => {
    deckSelect.value = result.targetDeck;
  });

  deckSelect.addEventListener('change', (e) => {
    chrome.storage.local.set({ targetDeck: e.target.value });
  });

  // Fetch decks from Anki
  chrome.runtime.sendMessage({ action: 'anki-connect', ankiAction: 'deckNames' }, (response) => {
    if (response && response.success) {
      deckSelect.innerHTML = '';
      response.result.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck;
        option.textContent = deck;
        deckSelect.appendChild(option);
      });
      chrome.storage.local.get({ targetDeck: 'Default' }, (result) => {
        if (response.result.includes(result.targetDeck)) {
          deckSelect.value = result.targetDeck;
        } else {
          deckSelect.value = 'Default';
          chrome.storage.local.set({ targetDeck: 'Default' });
        }
      });
    }
  });

  syncAnkiBtn.addEventListener('click', async () => {
    if (currentCards.length === 0) return;
    
    syncAnkiBtn.disabled = true;
    syncAnkiBtn.textContent = 'Syncing...';
    
    const deckName = deckSelect.value;
    let successCount = 0;
    
    for (const card of currentCards) {
      // We only support Basic cards in pending queue now
      if (card.type === 'basic' || !card.type) {
        const note = {
          deckName: deckName,
          modelName: 'Basic',
          fields: {
            Front: card.front,
            Back: card.back
          },
          options: {
            allowDuplicate: true
          },
          tags: ['anki-quick-adder']
        };
        
        const response = await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: 'anki-connect', ankiAction: 'addNote', params: { note } }, resolve);
        });
        
        if (response && response.success) {
          successCount++;
        } else {
          alert('Failed to sync card: ' + (response?.error || 'Unknown error'));
          break;
        }
      } else {
        // Skip IO cards left over in queue
        successCount++; 
      }
    }
    
    if (successCount === currentCards.length) {
      chrome.storage.local.set({ pendingCards: [] }, () => {
        syncAnkiBtn.textContent = 'Synced!';
        setTimeout(() => {
          syncAnkiBtn.textContent = 'Sync All to Anki';
          syncAnkiBtn.disabled = false;
          window.close();
        }, 1500);
      });
    } else {
      syncAnkiBtn.textContent = 'Sync All to Anki';
      syncAnkiBtn.disabled = false;
      currentCards.splice(0, successCount);
      chrome.storage.local.set({ pendingCards: currentCards }, () => {
        loadCards();
      });
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
