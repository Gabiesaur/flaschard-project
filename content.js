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
      setTimeout(() => shadowRoot.getElementById('anki-front-field').focus(), 50);
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
    <div class="anki-modal-overlay" id="anki-overlay">
      <div class="card" id="anki-modal-content">
        <button class="close-btn-top" id="anki-close-btn">&times;</button>
        
        <div class="field">
          <div class="field-label" data-field="front">
            <span>Front</span>
            <button class="dropdown-btn" aria-label="Front options" aria-expanded="false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="dropdown-menu">
              <button type="button">Text</button>
              <button type="button">Cloze</button>
              <button type="button">Image</button>
              <button type="button">Audio</button>
            </div>
          </div>
          <div class="field-input" id="anki-front-field" contenteditable="true"></div>
        </div>

        <div class="field">
          <div class="field-label" data-field="back">
            <span>Back</span>
            <button class="dropdown-btn" aria-label="Back options" aria-expanded="false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="dropdown-menu">
              <button type="button">Text</button>
              <button type="button">Cloze</button>
              <button type="button">Image</button>
              <button type="button">Audio</button>
            </div>
          </div>
          <div class="field-input" id="anki-back-field" contenteditable="true"></div>
        </div>

        <div class="spacer"></div>

        <div class="field">
          <div class="field-label" data-field="tags">
            <span>Tags</span>
            <button class="dropdown-btn" aria-label="Tags options" aria-expanded="false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="dropdown-menu">
              <button type="button">Recently used</button>
              <button type="button">Suggested</button>
              <button type="button">Add new tag</button>
            </div>
          </div>
          <div class="field-input" id="anki-tags-field" contenteditable="true"></div>
        </div>

        <div class="footer-actions">
          <button class="add-btn" id="anki-add-btn">Add Card</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  // Event Listeners
  const overlay = shadowRoot.getElementById('anki-overlay');
  const modalContent = shadowRoot.getElementById('anki-modal-content');
  const closeBtn = shadowRoot.getElementById('anki-close-btn');
  const addBtn = shadowRoot.getElementById('anki-add-btn');
  const frontField = shadowRoot.getElementById('anki-front-field');
  const backField = shadowRoot.getElementById('anki-back-field');
  const tagsField = shadowRoot.getElementById('anki-tags-field');
  
  // Prevent closing when clicking inside the modal
  modalContent.addEventListener('click', (e) => e.stopPropagation());
  
  // Close on overlay click or close buttons
  overlay.addEventListener('click', toggleModal);
  closeBtn.addEventListener('click', toggleModal);
  
  // Prevent default formatting on paste to avoid messy HTML, but allow images
  const handlePaste = (e) => {
    // If we want to allow standard pasting for images, it's usually fine.
    // If they paste text, it might bring in weird styles.
    // For now, we'll let default paste handle it so images work seamlessly.
  };
  
  frontField.addEventListener('paste', handlePaste);
  backField.addEventListener('paste', handlePaste);

  // Add Card Logic
  addBtn.addEventListener('click', () => {
    // Use innerHTML to preserve image tags (<img src="data:image/...">)
    const frontHTML = frontField.innerHTML.trim();
    const backHTML = backField.innerHTML.trim();
    const tags = tagsField.textContent.trim(); // Changed to textContent since it's a div now
    
    if (!frontHTML && !backHTML) {
      // Don't add completely empty cards
      return;
    }
    
    const card = {
      front: frontHTML,
      back: backHTML,
      tags: tags,
      timestamp: Date.now()
    };
    
    // Save to local storage
    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      const updatedCards = [...result.pendingCards, card];
      chrome.storage.local.set({ pendingCards: updatedCards }, () => {
        // Visual feedback & clear fields
        frontField.innerHTML = '';
        backField.innerHTML = '';
        frontField.focus();
        
        // Temporarily change button text
        const originalText = addBtn.innerText;
        addBtn.innerText = "Added!";
        setTimeout(() => {
          addBtn.innerText = originalText;
        }, 1000);
      });
    });
  });
  
  // Dropdown Logic
  const buttons = shadowRoot.querySelectorAll('.dropdown-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      const isOpen = menu.classList.contains('show');

      // close all other menus
      shadowRoot.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      shadowRoot.querySelectorAll('.dropdown-btn.open').forEach(b => {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        menu.classList.add('show');
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  shadowRoot.addEventListener('click', () => {
    shadowRoot.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    shadowRoot.querySelectorAll('.dropdown-btn.open').forEach(b => {
      b.classList.remove('open');
      b.setAttribute('aria-expanded', 'false');
    });
  });

  // Focus front field initially
  setTimeout(() => frontField.focus(), 50);
}
