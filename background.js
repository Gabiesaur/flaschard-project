chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-anki-modal") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-modal" }).catch((err) => {
          console.log("Error sending message to tab. Content script might not be injected yet.", err);
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture-screen') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true;
  }
  
  if (request.action === 'anki-connect') {
    fetch('http://127.0.0.1:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: request.ankiAction,
        version: 6,
        params: request.params || {}
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        sendResponse({ success: false, error: data.error });
      } else {
        sendResponse({ success: true, result: data.result });
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: 'Failed to connect to AnkiConnect. Is Anki open?' });
    });
    return true; // Keep message channel open for async response
  }
});
