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
