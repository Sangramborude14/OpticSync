// ── OptiSync Extension Background Router (MV3) ──────────────────────
// High-reliability messaging and OS-level notifications for hackathon MVP.

let globalStrain = 0;
let lastMildAlert = 0;
let lastSevereAlert = 0;
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown to ensure alerts actually pop

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. DATA SOURCE: Dashboard sends live strain levels
    if (message.type === 'BROADCAST_STRAIN') {
        globalStrain = message.strainScore;
        
        // Broadcast to all active tabs
        broadcastToAllTabs(globalStrain);
        
        // Handle OS Notifications based on thresholds
        checkAndNotify(globalStrain);
    }
    
    // 2. TAB HANDSHAKE: When a new tab opens, it asks for the current score
    if (message.type === 'REQUEST_LATEST_STRAIN') {
        sendResponse({ strain: globalStrain });
    }

    // 3. NAVIGATION: Open/Focus the Dashboard
    if (message.type === 'GO_TO_DASHBOARD') {
        navigateToDashboard();
    }
});

function checkAndNotify(score) {
    const now = Date.now();
    
    // SEVERE STRAIN ALERT (80%+)
    if (score >= 80 && (now - lastSevereAlert > COOLDOWN_MS)) {
        lastSevereAlert = now;
        
        // Create a unique notification to ensure it pops up even if one is already in Action Center
        const notifId = 'severe-' + now;
        
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icon.png',
            title: '🚨 OptiSync: Severe Eye Strain!',
            message: `Your strain has reached ${score}%. Return to the dashboard to start therapy.`,
            priority: 2,
            requireInteraction: true
        });
        
        console.log(`[OptiSync] Severe Alert sent at ${score}%`);
    } 
    // MILD STRAIN ALERT (40% - 60%)
    else if (score >= 40 && score < 80 && (now - lastMildAlert > COOLDOWN_MS)) {
        lastMildAlert = now;
        
        const notifId = 'mild-' + now;
        
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icon.png',
            title: '💡 OptiSync: Eye Strain Warning',
            message: `Strain is at ${score}%. You should blink more and look away.`,
            priority: 1
        });
        
        console.log(`[OptiSync] Mild Alert sent at ${score}%`);
    }
}

function navigateToDashboard() {
    chrome.tabs.query({ url: ['*://localhost:5173/*', '*://localhost:3000/*'] }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            chrome.tabs.create({ url: 'http://localhost:5173' });
        }
    });
}

function broadcastToAllTabs(score) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && !tab.url.startsWith("chrome://")) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_WIDGET_UI',
                    strain: score
                }).catch(() => {});
            }
        });
    });
}

// Click on notification takes user back to dashboard
chrome.notifications.onClicked.addListener((id) => {
    navigateToDashboard();
    chrome.notifications.clear(id);
});

chrome.action.onClicked.addListener(() => {
    navigateToDashboard();
});
