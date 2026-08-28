let shadowRoot = null;
let modalContainer = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-modal") {
    toggleModal();
  }
});

function toggleModal() {
  if (!modalContainer) {
    createModal();
  } else {
    const isVisible = modalContainer.style.display !== "none";
    modalContainer.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      shadowRoot.getElementById('anki-selection-overlay').style.display = 'flex';
      shadowRoot.getElementById('anki-editor-overlay').style.display = 'none';
      shadowRoot.getElementById('anki-crop-overlay').style.display = 'none';
    }
  }
}

function createModal() {
  modalContainer = document.createElement('div');
  modalContainer.id = "anki-quick-adder-host";
  
  // Use shadow DOM to isolate CSS
  shadowRoot = modalContainer.attachShadow({ mode: 'open' });
  
  const cssUrl = chrome.runtime.getURL('content.css');
  
  shadowRoot.innerHTML = `
    <link rel="stylesheet" href="${cssUrl}">
    
    <div class="anki-modal-overlay" id="anki-selection-overlay">
      <div class="card" id="anki-selection-content">
        <div class="modal-top-bar">
          <button class="close-btn-top" id="anki-sel-close-btn" title="Close (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="type-selection">
          <div class="type-selection-title">Choose Card Type</div>
          <button type="button" class="type-btn" id="anki-type-basic">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Basic Card
          </button>
          <button type="button" class="type-btn" id="anki-type-occlusion">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Image Occlusion (Screenshot)
          </button>
        </div>
      </div>
    </div>

    <div class="crop-overlay-container" id="anki-crop-overlay" style="display: none;">
      <div class="crop-overlay-mask"></div>
      <div class="crop-box" id="anki-crop-box" style="display: none;"></div>
    </div>

    <div class="anki-modal-overlay" id="anki-editor-overlay" style="display: none;">
      <div class="card" id="anki-editor-content">
        <div class="modal-top-bar">
          <button class="close-btn-top" id="anki-editor-close-btn" title="Close (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="anki-editor-toolbar" id="anki-editor-toolbar">
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
            <button type="button" class="anki-tool-btn" id="anki-forecolor-btn" title="Apply Text Color">
              <span class="color-indicator-wrap">
                <span class="color-letter">A</span>
                <span class="color-bar" id="anki-forecolor-bar" style="background-color: #2563eb;"></span>
              </span>
            </button>
            <button type="button" class="anki-tool-btn anki-arrow-btn" id="anki-forecolor-arrow" title="Choose Text Color">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div class="color-picker-dropdown" id="anki-forecolor-dropdown" style="display: none;">
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
                <input type="color" id="anki-forecolor-input" value="#2563eb">
              </div>
            </div>
          </div>

          <!-- Group 4: Highlight Color -->
          <div class="btn-group color-tool-wrap">
            <button type="button" class="anki-tool-btn" id="anki-hilitecolor-btn" title="Apply Highlight Color">
              <span class="color-indicator-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83a.996.996 0 0 0 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/></svg>
                <span class="color-bar" id="anki-hilitecolor-bar" style="background-color: #fef08a;"></span>
              </span>
            </button>
            <button type="button" class="anki-tool-btn anki-arrow-btn" id="anki-hilitecolor-arrow" title="Choose Highlight Color">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div class="color-picker-dropdown" id="anki-hilitecolor-dropdown" style="display: none;">
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
                <input type="color" id="anki-hilitecolor-input" value="#fef08a">
              </div>
            </div>
          </div>

          <!-- Group 5: Eraser -->
          <div class="btn-group">
            <button type="button" class="anki-tool-btn" id="anki-eraser-btn" title="Clear Formatting">
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
            <button type="button" class="anki-tool-btn" id="anki-align-btn" title="Text Alignment">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg>
            </button>
          </div>

          <!-- Group 7: Media -->
          <div class="btn-group">
            <button type="button" class="anki-tool-btn" id="anki-attach-btn" title="Attach Media / Image">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            </button>
            <button type="button" class="anki-tool-btn" id="anki-mic-btn" title="Record Audio">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
            </button>
          </div>
        </div>

        <!-- Hidden input for file picking -->
        <input type="file" id="anki-file-input" accept="image/*,audio/*" style="display:none;">

        <div class="field">
          <div class="field-label" data-field="front">
            <button class="dropdown-btn" aria-label="Front options" aria-expanded="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <span>Front</span>
          </div>
          <div class="field-input" id="anki-front-field" contenteditable="true"></div>
        </div>

        <div class="field">
          <div class="field-label" data-field="back">
            <button class="dropdown-btn" aria-label="Back options" aria-expanded="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <span>Back</span>
          </div>
          <div class="field-input" id="anki-back-field" contenteditable="true"></div>
        </div>

        <div class="footer-actions">
          <button class="add-btn" id="anki-add-btn">Add Card</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  // Event Listeners
  const selOverlay = shadowRoot.getElementById('anki-selection-overlay');
  const selCloseBtn = shadowRoot.getElementById('anki-sel-close-btn');
  const typeBasicBtn = shadowRoot.getElementById('anki-type-basic');
  const typeOcclusionBtn = shadowRoot.getElementById('anki-type-occlusion');

  const cropOverlay = shadowRoot.getElementById('anki-crop-overlay');
  const cropBox = shadowRoot.getElementById('anki-crop-box');

  const editorOverlay = shadowRoot.getElementById('anki-editor-overlay');
  const editorCloseBtn = shadowRoot.getElementById('anki-editor-close-btn');
  const editorContent = shadowRoot.getElementById('anki-editor-content');

  const frontField = shadowRoot.getElementById('anki-front-field');
  const backField = shadowRoot.getElementById('anki-back-field');
  const addBtn = shadowRoot.getElementById('anki-add-btn');

  selCloseBtn.addEventListener('click', toggleModal);
  selOverlay.addEventListener('click', toggleModal);
  shadowRoot.getElementById('anki-selection-content').addEventListener('click', (e) => e.stopPropagation());

  editorCloseBtn.addEventListener('click', toggleModal);
  editorOverlay.addEventListener('click', toggleModal);
  editorContent.addEventListener('click', (e) => e.stopPropagation());

  typeBasicBtn.addEventListener('click', () => {
    selOverlay.style.display = 'none';
    editorOverlay.style.display = 'flex';
    setTimeout(() => frontField.focus(), 50);
  });

  typeOcclusionBtn.addEventListener('click', () => {
    selOverlay.style.display = 'none';
    cropOverlay.style.display = 'block';
    document.body.style.userSelect = 'none'; // prevent text selection while cropping
  });

  // Crop Logic
  let isCropping = false;
  let startX, startY;

  cropOverlay.addEventListener('pointerdown', (e) => {
    isCropping = true;
    startX = e.clientX;
    startY = e.clientY;
    cropBox.style.display = 'block';
    cropBox.style.left = startX + 'px';
    cropBox.style.top = startY + 'px';
    cropBox.style.width = '0px';
    cropBox.style.height = '0px';
  });

  cropOverlay.addEventListener('pointermove', (e) => {
    if (!isCropping) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    cropBox.style.left = left + 'px';
    cropBox.style.top = top + 'px';
    cropBox.style.width = width + 'px';
    cropBox.style.height = height + 'px';
  });

  cropOverlay.addEventListener('pointerup', (e) => {
    if (!isCropping) return;
    isCropping = false;
    document.body.style.userSelect = '';
    
    const currentX = Math.max(0, Math.min(window.innerWidth, e.clientX));
    const currentY = Math.max(0, Math.min(window.innerHeight, e.clientY));
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    cropOverlay.style.display = 'none';
    cropBox.style.display = 'none';

    if (width < 10 || height < 10) {
      // Crop area too small, cancel
      toggleModal();
      return;
    }

    // Hide everything to take a clean screenshot
    modalContainer.style.display = 'none';

    // Wait a tiny bit for the UI to hide
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'capture-screen' }, (response) => {
        if (response && response.dataUrl) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // devicePixelRatio is important if taking screenshot on retina displays
            const ratio = window.devicePixelRatio || 1;
            ctx.drawImage(img, left * ratio, top * ratio, width * ratio, height * ratio, 0, 0, width, height);
            
            const croppedDataUrl = canvas.toDataURL('image/png');
            
            // Save directly
            chrome.storage.local.get({ pendingCards: [] }, (result) => {
              const cards = result.pendingCards || [];
              cards.push({
                front: '',
                back: '',
                type: 'image-occlusion',
                imageOcclusion: { image: croppedDataUrl, masks: [] },
                createdAt: new Date().toISOString()
              });
              chrome.storage.local.set({ pendingCards: cards }, () => {
                // Done
              });
            });
          };
          img.src = response.dataUrl;
        } else {
          alert('Failed to capture screen.');
          toggleModal();
        }
      });
    }, 150);
  });

  let activeField = frontField;
  
  frontField.addEventListener('focus', () => { activeField = frontField; });
  backField.addEventListener('focus', () => { activeField = backField; });
  
  // Add Card action
  const handleAddCard = () => {
    const frontHTML = frontField.innerHTML.trim();
    const backHTML = backField.innerHTML.trim();

    // Prevent adding if both fields are empty or only whitespace/empty tags
    const cleanFront = frontField.innerText.trim();
    const cleanBack = backField.innerText.trim();
    const hasMedia = frontField.querySelector('img, audio, video') || backField.querySelector('img, audio, video');

    if (!cleanFront && !cleanBack && !hasMedia && !frontHTML && !backHTML) {
      frontField.focus();
      return;
    }

    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      const cards = result.pendingCards || [];
      cards.push({
        front: frontHTML,
        back: backHTML,
        type: 'basic',
        createdAt: new Date().toISOString()
      });
      chrome.storage.local.set({ pendingCards: cards }, () => {
        frontField.innerHTML = '';
        backField.innerHTML = '';
        toggleModal();
      });
    });
  };

  addBtn.addEventListener('click', handleAddCard);

  // Shortcut to save card with Ctrl+Enter or Cmd+Enter
  [frontField, backField].forEach(field => {
    field.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleAddCard();
      }
    });
  });
  
  // Standard formatting command buttons
  const commandBtns = shadowRoot.querySelectorAll('.anki-tool-btn[data-command]');
  commandBtns.forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      activeField.focus();
      const cmd = btn.dataset.command;
      document.execCommand(cmd, false, null);
    });
  });

  // Helper to close all color dropdowns
  function closeColorDropdowns() {
    shadowRoot.querySelectorAll('.color-picker-dropdown').forEach(dd => dd.style.display = 'none');
  }

  // Text Color
  const foreColorBtn = shadowRoot.getElementById('anki-forecolor-btn');
  const foreColorArrow = shadowRoot.getElementById('anki-forecolor-arrow');
  const foreColorDropdown = shadowRoot.getElementById('anki-forecolor-dropdown');
  const foreColorBar = shadowRoot.getElementById('anki-forecolor-bar');
  const foreColorInput = shadowRoot.getElementById('anki-forecolor-input');
  
  let currentForeColor = '#2563eb';

  foreColorBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    activeField.focus();
    document.execCommand('foreColor', false, currentForeColor);
  });

  foreColorArrow.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isHidden = foreColorDropdown.style.display === 'none';
    closeColorDropdowns();
    if (isHidden) {
      foreColorDropdown.style.display = 'flex';
    }
  });

  foreColorDropdown.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentForeColor = swatch.dataset.color;
      foreColorBar.style.backgroundColor = currentForeColor;
      foreColorInput.value = currentForeColor;
      activeField.focus();
      document.execCommand('foreColor', false, currentForeColor);
      closeColorDropdowns();
    });
  });

  foreColorInput.addEventListener('input', (e) => {
    currentForeColor = e.target.value;
    foreColorBar.style.backgroundColor = currentForeColor;
    activeField.focus();
    document.execCommand('foreColor', false, currentForeColor);
  });

  // Highlight Color
  const hiliteColorBtn = shadowRoot.getElementById('anki-hilitecolor-btn');
  const hiliteColorArrow = shadowRoot.getElementById('anki-hilitecolor-arrow');
  const hiliteColorDropdown = shadowRoot.getElementById('anki-hilitecolor-dropdown');
  const hiliteColorBar = shadowRoot.getElementById('anki-hilitecolor-bar');
  const hiliteColorInput = shadowRoot.getElementById('anki-hilitecolor-input');
  
  let currentHiliteColor = '#fef08a';

  hiliteColorBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    activeField.focus();
    document.execCommand('hiliteColor', false, currentHiliteColor);
  });

  hiliteColorArrow.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isHidden = hiliteColorDropdown.style.display === 'none';
    closeColorDropdowns();
    if (isHidden) {
      hiliteColorDropdown.style.display = 'flex';
    }
  });

  hiliteColorDropdown.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentHiliteColor = swatch.dataset.color;
      hiliteColorBar.style.backgroundColor = currentHiliteColor;
      hiliteColorInput.value = currentHiliteColor;
      activeField.focus();
      document.execCommand('hiliteColor', false, currentHiliteColor);
      closeColorDropdowns();
    });
  });

  hiliteColorInput.addEventListener('input', (e) => {
    currentHiliteColor = e.target.value;
    hiliteColorBar.style.backgroundColor = currentHiliteColor;
    activeField.focus();
    document.execCommand('hiliteColor', false, currentHiliteColor);
  });

  editorContent.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.color-tool-wrap')) {
      closeColorDropdowns();
    }
  });

  // Eraser / Clear formatting
  const eraserBtn = shadowRoot.getElementById('anki-eraser-btn');
  eraserBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    activeField.focus();
    document.execCommand('removeFormat', false, null);
  });

  // Text Alignment
  const alignBtn = shadowRoot.getElementById('anki-align-btn');
  let alignState = 0; // 0: left, 1: center, 2: right
  alignBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    activeField.focus();
    alignState = (alignState + 1) % 3;
    if (alignState === 0) document.execCommand('justifyLeft', false, null);
    else if (alignState === 1) document.execCommand('justifyCenter', false, null);
    else if (alignState === 2) document.execCommand('justifyRight', false, null);
  });

  // Attachment (Paperclip)
  const attachBtn = shadowRoot.getElementById('anki-attach-btn');
  const fileInput = shadowRoot.getElementById('anki-file-input');
  attachBtn.addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        activeField.focus();
        if (file.type.startsWith('image/')) {
          document.execCommand('insertHTML', false, `<img src="${e.target.result}" style="max-width:100%; border-radius:4px;">`);
        } else if (file.type.startsWith('audio/')) {
          document.execCommand('insertHTML', false, `<audio controls src="${e.target.result}"></audio>`);
        }
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    }
  });

  // Microphone (Audio Recording)
  const micBtn = shadowRoot.getElementById('anki-mic-btn');
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  micBtn.addEventListener('click', async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = () => {
            activeField.focus();
            document.execCommand('insertHTML', false, `<audio controls src="${reader.result}"></audio>`);
          };
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        isRecording = true;
        micBtn.style.color = '#ef4444';
        micBtn.style.backgroundColor = '#fee2e2';
      } catch (err) {
        alert('Microphone access is required to record audio.');
      }
    } else {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      isRecording = false;
      micBtn.style.color = '';
      micBtn.style.backgroundColor = '';
    }
  });

  // Accordion Logic
  const buttons = shadowRoot.querySelectorAll('.dropdown-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = btn.closest('.field');
      const fieldInput = field.querySelector('.field-input');
      const toolbar = field.querySelector('.rich-toolbar');
      const isCollapsed = fieldInput.classList.contains('collapsed');

      if (isCollapsed) {
        fieldInput.classList.remove('collapsed');
        if (toolbar) toolbar.classList.remove('collapsed');
        btn.classList.remove('collapsed');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        fieldInput.classList.add('collapsed');
        if (toolbar) toolbar.classList.add('collapsed');
        btn.classList.add('collapsed');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });
}
