// Ensures the React App acts as the master AI Engine across Chrome.

let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN_MS = 2 * 60 * 1000; // 2-minute cooldown between alerts
let lastStrainScore = 0;
let notificationShown = false;

// Router: Listen for messages from the React App Dashboard via content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // React App Engine broadcast logic
  if (message.type === 'BROADCAST_STRAIN') {
    const score = message.strainScore;
    lastStrainScore = score;

    // Blast this strain score outwards to EVERY open tab's widget
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
         // Prevent messaging background tabs that don't have content scripts yet
         if(tab.url && !tab.url.startsWith("chrome://")) {
             chrome.tabs.sendMessage(tab.id, {
                type: 'UPDATE_UI',
                strainScore: score
             }).catch(() => {
                 // Ignore if content script isn't mounted yet
             });
         }
      });
    });

    // Fire OS-level notification when strain hits 80%
    const now = Date.now();
    if (score >= 80 && !notificationShown && (now - lastNotificationTime) > NOTIFICATION_COOLDOWN_MS) {
      lastNotificationTime = now;
      notificationShown = true;

      chrome.notifications.create('optisync-strain-alert', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon.png'),
        title: 'OptiSync: High Eye Strain Detected! 🚨',
        message: `Your cognitive strain has reached ${score}%. Take a break now to protect your vision.`,
        priority: 2,
        requireInteraction: true,
        buttons: [
          { title: 'Take a Break Now' },
          { title: 'Dismiss' }
        ]
      });
    }

    // Reset notification flag when strain drops below 60% so future alerts can fire again
    if (score < 60 && notificationShown) {
      notificationShown = false;
    }
  }
});

// When user clicks the notification, switch focus to the OptiSync dashboard tab
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'optisync-strain-alert') {
    chrome.tabs.query({ url: '*://localhost/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'optisync-strain-alert') {
    if (buttonIndex === 0) {
      // "Take a Break Now" → focus the OptiSync tab
      chrome.tabs.query({ url: '*://localhost/*' }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      });
    }
    chrome.notifications.clear(notificationId);
  }
});

