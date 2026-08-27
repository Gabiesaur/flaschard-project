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
  const overlay = shadowRoot.getElementById('anki-overlay');
  const modalContent = shadowRoot.getElementById('anki-modal-content');
  const closeBtn = shadowRoot.getElementById('anki-close-btn');
  const addBtn = shadowRoot.getElementById('anki-add-btn');
  const frontField = shadowRoot.getElementById('anki-front-field');
  const backField = shadowRoot.getElementById('anki-back-field');
  
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
    
    if (!frontHTML || !backHTML) {
      // Highlight empty fields
      if (!frontHTML) {
        frontField.style.borderColor = '#d32f2f';
      }
      if (!backHTML) {
        backField.style.borderColor = '#d32f2f';
      }
      
      // Remove highlight after 2 seconds
      setTimeout(() => {
        frontField.style.borderColor = '';
        backField.style.borderColor = '';
      }, 2000);
      
      return;
    }
    
    const card = {
      front: frontHTML,
      back: backHTML,
      timestamp: Date.now()
    };
    
    // Save to local storage
    chrome.storage.local.get({ pendingCards: [] }, (result) => {
      const updatedCards = [...result.pendingCards, card];
      chrome.storage.local.set({ pendingCards: updatedCards }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving card:", chrome.runtime.lastError);
          const originalText = addBtn.innerText;
          addBtn.innerText = "Error Saving!";
          addBtn.style.backgroundColor = "#d32f2f";
          setTimeout(() => {
            addBtn.innerText = originalText;
            addBtn.style.backgroundColor = "";
          }, 2000);
          return;
        }

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
  
  // Accordion Logic
  const buttons = shadowRoot.querySelectorAll('.dropdown-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // The input is the next sibling element of the parent .field-label
      const fieldInput = btn.closest('.field-label').nextElementSibling;
      const isCollapsed = fieldInput.classList.contains('collapsed');

      if (isCollapsed) {
        fieldInput.classList.remove('collapsed');
        btn.classList.remove('collapsed');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        fieldInput.classList.add('collapsed');
        btn.classList.add('collapsed');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Focus front field initially
  setTimeout(() => frontField.focus(), 50);
}
