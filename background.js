// Ensures the React App acts as the master AI Engine across Chrome.

// Router: Listen for messages from the React App Dashboard via content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // React App Engine broadcast logic
  if (message.type === 'BROADCAST_STRAIN') {
    // Blast this strain score outwards to EVERY open tab's widget
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
         // Prevent messaging background tabs that don't have content scripts yet
         if(tab.url && !tab.url.startsWith("chrome://")) {
             chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_UI',
                strainScore: message.strainScore
             }).catch(() => {
                 // Ignore if content script isn't mounted yet
             });
         }
      });
    });
  }
});
