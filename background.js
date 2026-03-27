// ── OptiSync Extension Background Router (MV3) ──────────────────────
// High-reliability messaging and OS-level notifications for hackathon MVP.

let globalStrain = 0;
let lastMildAlert = 0;
let lastSevereAlert = 0;
let userMildThreshold = 40;
let userSevereThreshold = 80;
const COOLDOWN_MS = 60 * 1000; // 1 minute cooldown to ensure alerts actually pop

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. DATA SOURCE: Dashboard sends live strain levels + user thresholds
    if (message.type === 'BROADCAST_STRAIN') {
        globalStrain = message.strainScore;
        
        // Update thresholds from user settings (sent from dashboard)
        if (message.mildThreshold) userMildThreshold = message.mildThreshold;
        if (message.severeThreshold) userSevereThreshold = message.severeThreshold;
        
        // Broadcast to all active tabs (include thresholds so widget uses them)
        broadcastToAllTabs(globalStrain);
        
        // Handle OS Notifications based on USER-configured thresholds
        checkAndNotify(globalStrain);
    }
    
    if (message.type === 'BROADCAST_PROXIMITY') {
        const dist = message.currentDistance;
        broadcastToAllTabsProximity(dist);
        checkAndNotifyProximity(dist);
    }
    
    if (message.type === 'BROADCAST_TOAST') {
        broadcastToAllTabsToast(message.toast);
    }
    
    // 2. TAB HANDSHAKE: When a new tab opens, it asks for the current score
    if (message.type === 'REQUEST_LATEST_STRAIN') {
        sendResponse({ 
            strain: globalStrain,
            mildThreshold: userMildThreshold,
            severeThreshold: userSevereThreshold
        });
    }

    // 3. NAVIGATION: Open/Focus the Dashboard
    if (message.type === 'GO_TO_DASHBOARD') {
        navigateToDashboard();
    }
});

function checkAndNotify(score) {
    const now = Date.now();
    
    // SEVERE STRAIN ALERT (user-configured threshold)
    if (score >= userSevereThreshold && (now - lastSevereAlert > COOLDOWN_MS)) {
        lastSevereAlert = now;
        
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
    // MILD STRAIN ALERT (user-configured threshold)
    else if (score >= userMildThreshold && score < userSevereThreshold && (now - lastMildAlert > COOLDOWN_MS)) {
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

let lastProximityAlert = 0;

function checkAndNotifyProximity(dist) {
    const now = Date.now();
    // Proximity alert cooldown of 2 minutes to avoid spam
    if (now - lastProximityAlert > 120000) {
        lastProximityAlert = now;
        
        const notifId = 'proximity-' + now;
        
        chrome.notifications.create(notifId, {
            type: 'basic',
            iconUrl: 'icon.png',
            title: '🚨 OptiSync: Proximity Hazard!',
            message: `You are too close to the screen (${Math.round(dist)}cm). Please move back to protect your vision!`,
            priority: 2,
            requireInteraction: true
        });
        
        console.log(`[OptiSync] Proximity Alert sent at ${dist}cm`);
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
                    strain: score,
                    mildThreshold: userMildThreshold,
                    severeThreshold: userSevereThreshold
                }).catch(() => {});
            }
        });
    });
}

function broadcastToAllTabsProximity(dist) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && !tab.url.startsWith("chrome://")) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_PROXIMITY_UI',
                    currentDistance: dist
                }).catch(() => {});
            }
        });
    });
}

function broadcastToAllTabsToast(toast) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && !tab.url.startsWith("chrome://")) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'UPDATE_TOAST_UI',
                    toast: toast
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
