document.addEventListener('DOMContentLoaded', () => {
  const countEl = document.getElementById('card-count');
  const exportBtn = document.getElementById('export-btn');
  const clearBtn = document.getElementById('clear-btn');
  const cardsContainer = document.getElementById('cards-container');

  let currentCards = [];

  function imageOcclusionPreview(card) {
    const occlusion = card.imageOcclusion;
    if (!occlusion?.image) return '';
    const masks = (occlusion.masks || []).map(mask =>
      `<span style="position:absolute;left:${mask.left * 100}%;top:${mask.top * 100}%;width:${mask.width * 100}%;height:${mask.height * 100}%;background:rgba(37,99,235,.42);border:2px solid #1d4ed8;border-radius:${mask.shape === 'ellipse' ? '50%' : '3px'};"></span>`
    ).join('');
    return `<div style="position:relative;display:inline-block;max-width:100%;"><img src="${occlusion.image}" style="display:block;max-width:100%;border-radius:4px;">${masks}</div>`;
  }

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

      renderCards();
    });
  }

  function createToolbar(getTargetEl) {
    const getTarget = typeof getTargetEl === 'function' ? getTargetEl : () => getTargetEl;
    const toolbar = document.createElement('div');
    toolbar.className = 'anki-editor-toolbar';

    toolbar.innerHTML = `
      <!-- Group 1: B, I, U -->
      <div class="btn-group">
        <button type="button" class="anki-tool-btn" data-command="bold" title="Bold (Ctrl+B)"><b style="font-size: 14px;">B</b></button>
        <button type="button" class="anki-tool-btn" data-command="italic" title="Italic (Ctrl+I)"><i style="font-size: 14px; font-family: serif;">I</i></button>
        <button type="button" class="anki-tool-btn" data-command="underline" title="Underline (Ctrl+U)"><u style="font-size: 14px;">U</u></button>
      </div>

      <!-- Group 2: X², X₂ -->
      <div class="btn-group">
        <button type="button" class="anki-tool-btn" data-command="superscript" title="Superscript">
          <span class="script-wrap"><span class="script-base">X</span><span class="script-super">2</span></span>
        </button>
        <button type="button" class="anki-tool-btn" data-command="subscript" title="Subscript">
          <span class="script-wrap"><span class="script-base">X</span><span class="script-sub">2</span></span>
        </button>
      </div>

      <!-- Group 3: Text Color -->
      <div class="btn-group color-tool-wrap">
        <button type="button" class="anki-tool-btn" data-action="foreColorApply" title="Apply Text Color">
          <span class="color-indicator-wrap">
            <span class="color-letter">A</span>
            <span class="color-bar fore-bar" style="background-color: #2563eb;"></span>
          </span>
        </button>
        <button type="button" class="anki-tool-btn anki-arrow-btn" data-action="foreColorDropdown" title="Choose Text Color">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </button>
        <div class="color-picker-dropdown fore-dropdown" style="display: none;">
          <div class="color-palette">
            <div class="color-swatch" style="background: #2563eb;" data-color="#2563eb" title="Blue"></div>
            <div class="color-swatch" style="background: #dc2626;" data-color="#dc2626" title="Red"></div>
            <div class="color-swatch" style="background: #16a34a;" data-color="#16a34a" title="Green"></div>
            <div class="color-swatch" style="background: #ea580c;" data-color="#ea580c" title="Orange"></div>
            <div class="color-swatch" style="background: #9333ea;" data-color="#9333ea" title="Purple"></div>
            <div class="color-swatch" style="background: #db2777;" data-color="#db2777" title="Pink"></div>
            <div class="color-swatch" style="background: #111827;" data-color="#111827" title="Black"></div>
            <div class="color-swatch" style="background: #6b7280;" data-color="#6b7280" title="Gray"></div>
          </div>
          <div class="custom-color-row">
            <span>Custom:</span>
            <input type="color" class="custom-fore-input" value="#2563eb">
          </div>
        </div>
      </div>

      <!-- Group 4: Highlight Color -->
      <div class="btn-group color-tool-wrap">
        <button type="button" class="anki-tool-btn" data-action="hiliteColorApply" title="Apply Highlight Color">
          <span class="color-indicator-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83a.996.996 0 0 0 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>
            <span class="color-bar hilite-bar" style="background-color: #fef08a;"></span>
          </span>
        </button>
        <button type="button" class="anki-tool-btn anki-arrow-btn" data-action="hiliteColorDropdown" title="Choose Highlight Color">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
        </button>
        <div class="color-picker-dropdown hilite-dropdown" style="display: none;">
          <div class="color-palette">
            <div class="color-swatch" style="background: #fef08a;" data-color="#fef08a" title="Yellow"></div>
            <div class="color-swatch" style="background: #bbf7d0;" data-color="#bbf7d0" title="Green"></div>
            <div class="color-swatch" style="background: #bfdbfe;" data-color="#bfdbfe" title="Blue"></div>
            <div class="color-swatch" style="background: #fed7aa;" data-color="#fed7aa" title="Orange"></div>
            <div class="color-swatch" style="background: #fbcfe8;" data-color="#fbcfe8" title="Pink"></div>
            <div class="color-swatch" style="background: #e9d5ff;" data-color="#e9d5ff" title="Purple"></div>
            <div class="color-swatch" style="background: #fecaca;" data-color="#fecaca" title="Red"></div>
            <div class="color-swatch" style="background: #e5e7eb;" data-color="#e5e7eb" title="Gray"></div>
          </div>
          <div class="custom-color-row">
            <span>Custom:</span>
            <input type="color" class="custom-hilite-input" value="#fef08a">
          </div>
        </div>
      </div>

      <!-- Group 5: Eraser -->
      <div class="btn-group">
        <button type="button" class="anki-tool-btn" data-command="removeFormat" title="Clear Formatting">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
        </button>
      </div>

      <!-- Group 6: Lists & Alignment -->
      <div class="btn-group">
        <button type="button" class="anki-tool-btn" data-command="insertUnorderedList" title="Bullet List">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="9" y1="6" x2="20" y2="6"></line><line x1="9" y1="12" x2="20" y2="12"></line><line x1="9" y1="18" x2="20" y2="18"></line><circle cx="4" cy="6" r="1.5" fill="currentColor"></circle><circle cx="4" cy="12" r="1.5" fill="currentColor"></circle><circle cx="4" cy="18" r="1.5" fill="currentColor"></circle></svg>
        </button>
        <button type="button" class="anki-tool-btn" data-command="insertOrderedList" title="Numbered List">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="10" y1="6" x2="20" y2="6"></line><line x1="10" y1="12" x2="20" y2="12"></line><line x1="10" y1="18" x2="20" y2="18"></line><text x="1" y="7" font-size="7" font-family="sans-serif" font-weight="bold" fill="currentColor">1</text><text x="1" y="13" font-size="7" font-family="sans-serif" font-weight="bold" fill="currentColor">2</text><text x="1" y="19" font-size="7" font-family="sans-serif" font-weight="bold" fill="currentColor">3</text></svg>
        </button>
        <button type="button" class="anki-tool-btn" data-action="align" title="Text Alignment">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg>
        </button>
      </div>

      <!-- Group 7: Media -->
      <div class="btn-group">
        <button type="button" class="anki-tool-btn" data-action="attach" title="Attach Media / Image">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        </button>
      </div>
      <input type="file" class="card-file-input" accept="image/*,audio/*" style="display:none;">
    `;

    // Standard commands
    toolbar.querySelectorAll('.anki-tool-btn[data-command]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const targetEl = getTarget();
        if (targetEl) {
          targetEl.focus();
          document.execCommand(btn.dataset.command, false, null);
        }
      });
    });

    const closeDropdowns = () => {
      toolbar.querySelectorAll('.color-picker-dropdown').forEach(dd => dd.style.display = 'none');
    };

    // Text Color
    const foreApplyBtn = toolbar.querySelector('[data-action="foreColorApply"]');
    const foreArrowBtn = toolbar.querySelector('[data-action="foreColorDropdown"]');
    const foreDropdown = toolbar.querySelector('.fore-dropdown');
    const foreBar = toolbar.querySelector('.fore-bar');
    const customForeInput = toolbar.querySelector('.custom-fore-input');

    let activeForeColor = '#2563eb';

    if (foreApplyBtn) {
      foreApplyBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const targetEl = getTarget();
        if (targetEl) {
          targetEl.focus();
          document.execCommand('foreColor', false, activeForeColor);
        }
      });
    }

    if (foreArrowBtn && foreDropdown) {
      foreArrowBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isHidden = foreDropdown.style.display === 'none';
        closeDropdowns();
        if (isHidden) foreDropdown.style.display = 'flex';
      });

      foreDropdown.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          activeForeColor = swatch.dataset.color;
          foreBar.style.backgroundColor = activeForeColor;
          customForeInput.value = activeForeColor;
          const targetEl = getTarget();
          if (targetEl) {
            targetEl.focus();
            document.execCommand('foreColor', false, activeForeColor);
          }
          closeDropdowns();
        });
      });

      customForeInput.addEventListener('input', (e) => {
        activeForeColor = e.target.value;
        foreBar.style.backgroundColor = activeForeColor;
        const targetEl = getTarget();
        if (targetEl) {
          targetEl.focus();
          document.execCommand('foreColor', false, activeForeColor);
        }
      });
    }

    // Highlight Color
    const hiliteApplyBtn = toolbar.querySelector('[data-action="hiliteColorApply"]');
    const hiliteArrowBtn = toolbar.querySelector('[data-action="hiliteColorDropdown"]');
    const hiliteDropdown = toolbar.querySelector('.hilite-dropdown');
    const hiliteBar = toolbar.querySelector('.hilite-bar');
    const customHiliteInput = toolbar.querySelector('.custom-hilite-input');

    let activeHiliteColor = '#fef08a';

    if (hiliteApplyBtn) {
      hiliteApplyBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const targetEl = getTarget();
        if (targetEl) {
          targetEl.focus();
          document.execCommand('hiliteColor', false, activeHiliteColor);
        }
      });
    }

    if (hiliteArrowBtn && hiliteDropdown) {
      hiliteArrowBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isHidden = hiliteDropdown.style.display === 'none';
        closeDropdowns();
        if (isHidden) hiliteDropdown.style.display = 'flex';
      });

      hiliteDropdown.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          activeHiliteColor = swatch.dataset.color;
          hiliteBar.style.backgroundColor = activeHiliteColor;
          customHiliteInput.value = activeHiliteColor;
          const targetEl = getTarget();
          if (targetEl) {
            targetEl.focus();
            document.execCommand('hiliteColor', false, activeHiliteColor);
          }
          closeDropdowns();
        });
      });

      customHiliteInput.addEventListener('input', (e) => {
        activeHiliteColor = e.target.value;
        hiliteBar.style.backgroundColor = activeHiliteColor;
        const targetEl = getTarget();
        if (targetEl) {
          targetEl.focus();
          document.execCommand('hiliteColor', false, activeHiliteColor);
        }
      });
    }

    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.color-tool-wrap')) {
        closeDropdowns();
      }
    });

    // Align
    const alignBtn = toolbar.querySelector('[data-action="align"]');
    let alignState = 0;
    if (alignBtn) {
      alignBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const targetEl = getTarget();
        if (targetEl) {
          targetEl.focus();
          alignState = (alignState + 1) % 3;
          if (alignState === 0) document.execCommand('justifyLeft', false, null);
          else if (alignState === 1) document.execCommand('justifyCenter', false, null);
          else if (alignState === 2) document.execCommand('justifyRight', false, null);
        }
      });
    }

    // Attachment
    const attachBtn = toolbar.querySelector('[data-action="attach"]');
    const fileInput = toolbar.querySelector('.card-file-input');
    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const targetEl = getTarget();
            if (targetEl) {
              targetEl.focus();
              if (file.type.startsWith('image/')) {
                document.execCommand('insertHTML', false, `<img src="${e.target.result}" style="max-width:100%; border-radius:4px;">`);
              } else if (file.type.startsWith('audio/')) {
                document.execCommand('insertHTML', false, `<audio controls src="${e.target.result}"></audio>`);
              }
            }
          };
          reader.readAsDataURL(file);
          fileInput.value = '';
        }
      });
    }

    return toolbar;
  }

  function renderCards() {
    cardsContainer.innerHTML = '';

    if (currentCards.length === 0) {
      cardsContainer.innerHTML = '<div class="empty-state"><h2>No pending cards!</h2><p>Use the extension to add some cards first.</p></div>';
      cardsContainer.style.display = 'block';
      return;
    }

    cardsContainer.style.display = 'flex';

    currentCards.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'card';

      const frontHeaderRow = document.createElement('div');
      frontHeaderRow.className = 'card-header-row';
      const frontHeader = document.createElement('div');
      frontHeader.className = 'card-header';
      frontHeader.textContent = card.type === 'image-occlusion' ? 'Image occlusion' : 'Front · Basic';
      frontHeaderRow.appendChild(frontHeader);

      const frontEl = document.createElement('div');
      frontEl.className = 'card-front';
      frontEl.innerHTML = card.type === 'image-occlusion' ? `${imageOcclusionPreview(card)}${card.front ? `<div>${card.front}</div>` : ''}` : card.front;

      const backHeaderRow = document.createElement('div');
      backHeaderRow.className = 'card-header-row';
      const backHeader = document.createElement('div');
      backHeader.className = 'card-header';
      backHeader.textContent = 'Back';
      backHeaderRow.appendChild(backHeader);

      const backEl = document.createElement('div');
      backEl.className = 'card-back';
      backEl.innerHTML = card.type === 'image-occlusion' ? `${imageOcclusionPreview(card)}${card.back ? `<div>${card.back}</div>` : ''}` : card.back;

      const actionsEl = document.createElement('div');
      actionsEl.className = 'card-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-small';
      editBtn.textContent = 'Edit';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-small';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.display = 'none';

      let isEditing = false;
      let cardToolbar = null;
      let activeEditingField = frontEl;
      let originalFront = '';
      let originalBack = '';

      frontEl.addEventListener('focus', () => { activeEditingField = frontEl; });
      backEl.addEventListener('focus', () => { activeEditingField = backEl; });

      const exitEditMode = () => {
        isEditing = false;
        frontEl.contentEditable = 'false';
        backEl.contentEditable = 'false';
        frontEl.classList.remove('editing');
        backEl.classList.remove('editing');
        editBtn.textContent = 'Edit';
        editBtn.classList.remove('btn-primary');
        cancelBtn.style.display = 'none';

        if (cardToolbar) {
          cardToolbar.remove();
          cardToolbar = null;
        }
      };

      editBtn.addEventListener('click', () => {
        if (!isEditing) {
          isEditing = true;
          activeEditingField = frontEl;
          originalFront = frontEl.innerHTML;
          originalBack = backEl.innerHTML;

          frontEl.contentEditable = 'true';
          backEl.contentEditable = 'true';
          frontEl.classList.add('editing');
          backEl.classList.add('editing');
          editBtn.textContent = 'Save';
          editBtn.classList.add('btn-primary');
          cancelBtn.style.display = 'inline-block';

          // Place single toolbar at the top of the card above fields
          cardToolbar = createToolbar(() => activeEditingField);
          cardEl.insertBefore(cardToolbar, frontHeaderRow);

          frontEl.focus();
        } else {
          currentCards[index].front = frontEl.innerHTML;
          currentCards[index].back = backEl.innerHTML;
          chrome.storage.local.set({ pendingCards: currentCards });
          exitEditMode();
        }
      });

      cancelBtn.addEventListener('click', () => {
        frontEl.innerHTML = originalFront;
        backEl.innerHTML = originalBack;
        exitEditMode();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-small btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (confirm("Delete this card?")) {
          currentCards.splice(index, 1);
          chrome.storage.local.set({ pendingCards: currentCards });
        }
      });

      actionsEl.appendChild(editBtn);
      actionsEl.appendChild(cancelBtn);
      actionsEl.appendChild(deleteBtn);

      cardEl.appendChild(frontHeaderRow);
      cardEl.appendChild(frontEl);
      cardEl.appendChild(backHeaderRow);
      cardEl.appendChild(backEl);
      cardEl.appendChild(actionsEl);

      cardsContainer.appendChild(cardEl);
    });
  }

  // Format string for TSV (Anki format)
  function formatForAnki(str) {
    if (!str) return "";
    if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return str;
  }

  // Export logic
  exportBtn.addEventListener('click', () => {
    if (currentCards.length === 0) return;

    let tsvContent = "#separator:tab\n#html:true\n";

    currentCards.forEach(card => {
      const isImageOcclusion = card.type === 'image-occlusion';
      const front = formatForAnki(isImageOcclusion ? imageOcclusionField(card, false) : card.front);
      const back = formatForAnki(isImageOcclusion ? imageOcclusionField(card, true) : card.back);
      tsvContent += `${front}\t${back}\n`;
    });

    const blob = new Blob([tsvContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    if (chrome.downloads) {
      chrome.downloads.download({
        url: url,
        filename: 'anki_export.txt',
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          URL.revokeObjectURL(url);
        }
      });
    } else {
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

  // Listen for changes from other contexts (like background script or popup)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pendingCards) {
      loadCards();
    }
  });

  // Initial load
  loadCards();
});
