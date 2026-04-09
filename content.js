// ── OptiSync Content Bridge & Widget ──
// High-reliability communication for hackathon final MVP.

(function() {
    // ═══════════════════════════════════════════════════════════════════
    // FIX: Dashboard detection must NOT depend on React-rendered elements
    // because content scripts run BEFORE React mounts. Use URL instead.
    // ═══════════════════════════════════════════════════════════════════
    const isDashboard = (window.location.hostname === "localhost" &&
                         (window.location.port === "5173" || window.location.port === "3000"));

    // ── SHARED: Toast + Alert Functions (used on ALL external tabs) ──
    function showOptiToast(toastData) {
        let toastId = 'opti-extension-toast';
        let oldToast = document.getElementById(toastId);
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = toastId;

        const isWarning = toastData.type === 'warning';
        const icon = isWarning ? '⚠️' : '🚨';
        const titleColor = isWarning ? '#f39c12' : '#ff4757';
        const borderColor = isWarning ? '#f39c12' : '#ff4757';
        const bgGradient = isWarning ? 'linear-gradient(135deg, #2a220e, #18191c)' : 'linear-gradient(135deg, #2c1212, #18191c)';

        toast.innerHTML = `
            <div style="background: ${bgGradient}; border: 1px solid ${borderColor}60;
                        border-radius: 16px; padding: 16px 20px;
                        display: flex; align-items: flex-start; gap: 15px;
                        box-shadow: 0 12px 40px rgba(0,0,0,0.8);
                        font-family: 'Inter', sans-serif; position: relative;
                        backdrop-filter: blur(10px);">
                <div style="font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${icon}</div>
                <div style="flex: 1;">
                    <div style="color: ${titleColor}; font-weight: 800; font-size: 15px; margin-bottom: 6px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${toastData.title}</div>
                    <div style="color: #e2e8f0; font-size: 13px; line-height: 1.5;">${toastData.message}</div>
                </div>
                <button id="opti-toast-close" style="background: rgba(255,255,255,0.05); border: none; border-radius: 50%; color: #94a3b8; font-size: 12px; cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">✕</button>
                ${isWarning ? '<div style="position: absolute; bottom: 0; left: 20px; width: 40px; height: 4px; background: #f39c12; border-radius: 2px;"></div>' : ''}
            </div>
        `;

        toast.style.position = 'fixed';
        toast.style.bottom = '130px';
        toast.style.right = '40px';
        toast.style.zIndex = '2147483647';
        toast.style.width = '320px';
        toast.style.transition = 'opacity 0.4s, transform 0.4s';

        // Inject animation keyframes once
        if (!document.getElementById('opti-toast-style')) {
            const style = document.createElement('style');
            style.id = 'opti-toast-style';
            style.textContent = `
                @keyframes opti-slide-in {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        toast.style.animation = 'opti-slide-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        document.body.appendChild(toast);

        document.getElementById('opti-toast-close').addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 400);
        });

        setTimeout(() => {
            if (document.getElementById(toastId)) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => toast.remove(), 400);
            }
        }, 6000);
    }

    function showCriticalAlert(title, message) {
        let overlay = document.getElementById('opti-critical-alert');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'opti-critical-alert';
            overlay.innerHTML = `
                <div style="background: rgba(255, 71, 87, 0.95); color: white; border-bottom: 4px solid #c0392b;
                            padding: 20px; text-align: center; font-family: 'Inter', sans-serif;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 2147483647;
                            width: 100%; display: flex; align-items: center; justify-content: center; gap: 20px;
                            position: relative;">
                    <span style="font-size: 32px;">🚨</span>
                    <div style="text-align: left;">
                        <strong style="display: block; font-size: 20px; margin-bottom: 5px;" id="opti-alert-title"></strong>
                        <span style="font-size: 16px;" id="opti-alert-message"></span>
                    </div>
                    <button id="opti-alert-close" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);
                            color: white; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-left: 20px;">
                        Dismiss & Open Dashboard
                    </button>
                </div>
            `;
            document.body.prepend(overlay);

            document.getElementById('opti-alert-close').addEventListener('click', (e) => {
                e.preventDefault();
                overlay.style.display = 'none';
                chrome.runtime.sendMessage({ type: 'GO_TO_DASHBOARD' });
            });
        }

        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.zIndex = '2147483647';
        overlay.style.display = 'block';

        document.getElementById('opti-alert-title').innerText = title;
        document.getElementById('opti-alert-message').innerText = message;

        setTimeout(() => {
            if (overlay) overlay.style.display = 'none';
        }, 10000);
    }

    // ══════════════════════════════════════════════════════════════
    // DASHBOARD TAB: Bridge that forwards all data to background.js
    // ══════════════════════════════════════════════════════════════
    if (isDashboard) {
        console.log("🟢 OptiSync Master Bridge: Dashboard Connected (detected via URL).");

        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data && event.data.type === 'OPTISYNC_STRAIN_UPDATE') {
                chrome.runtime.sendMessage({
                    type: 'BROADCAST_STRAIN',
                    strainScore: event.data.strain,
                    mildThreshold: event.data.mildThreshold || 40,
                    severeThreshold: event.data.severeThreshold || 80
                }).catch(() => {});
            }
            if (event.data && event.data.type === 'OPTISYNC_PROXIMITY_HAZARD') {
                chrome.runtime.sendMessage({
                    type: 'BROADCAST_PROXIMITY',
                    currentDistance: event.data.currentDistance
                }).catch(() => {});
            }
            if (event.data && event.data.type === 'OPTISYNC_SHOW_TOAST') {
                chrome.runtime.sendMessage({
                    type: 'BROADCAST_TOAST',
                    toast: event.data.toast
                }).catch(() => {});
            }
        });

    } else {
        // ══════════════════════════════════════════════════════════
        // EXTERNAL TAB: Show Widget + Listen for notifications
        // ══════════════════════════════════════════════════════════
        console.log("🔵 OptiSync Widget: External Tab Active.");

        let widget = document.getElementById('optisync-master-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'optisync-master-widget';
            widget.innerHTML = `
                <div class="opti-widget-body">
                    <div class="opti-score-box"><span id="opti-val">0</span><small>%</small></div>
                    <div class="opti-label">EYE STRAIN</div>
                </div>
                <div id="opti-suggestion-bubble" class="opti-hidden">
                    <div class="opti-suggest-content">
                        <strong>OptiSync Tip:</strong>
                        <span id="opti-suggest-text">Looking good! Keep it up.</span>
                        <div class="opti-suggest-footer">Click to open Dashboard</div>
                    </div>
                </div>
            `;
            document.body.appendChild(widget);

            const style = document.createElement('style');
            style.textContent = `
                #optisync-master-widget {
                    position: fixed; bottom: 40px; right: 40px; z-index: 2147483647;
                    background: #0f1015; border: 2px solid #2ecc71; border-radius: 50px;
                    padding: 8px 18px; color: white; display: flex; flex-direction: column;
                    align-items: center; font-family: 'Inter', sans-serif;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    transition: border-color 0.4s ease;
                    cursor: grab;
                    user-select: none;
                    touch-action: none;
                }
                #optisync-master-widget:active { cursor: grabbing; }
                #opti-val { font-size: 24px; font-weight: 800; color: #2ecc71; pointer-events: none; }
                .opti-label { font-size: 8px; font-weight: 700; opacity: 0.5; text-align: center; pointer-events: none; }

                #opti-suggestion-bubble {
                    position: absolute;
                    bottom: 120%;
                    right: 0;
                    width: 220px;
                    background: #1e2128;
                    border: 1px solid #2ecc71;
                    border-radius: 16px;
                    padding: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    pointer-events: none;
                    transition: opacity 0.3s, transform 0.3s;
                    opacity: 0;
                    transform: translateY(10px);
                }
                #opti-suggestion-bubble.opti-visible {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .opti-suggest-content { font-size: 13px; color: #fff; text-align: left; }
                .opti-suggest-content strong { display: block; margin-bottom: 4px; color: #2ecc71; }
                .opti-suggest-footer {
                    margin-top: 8px; font-size: 10px; color: #94a3b8;
                    border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;
                    text-align: center; font-style: italic;
                }
                .opti-hidden { display: none; }
            `;
            document.head.appendChild(style);
        }

        let isMouseDown = false;
        let isMoving = false;
        let startX, startY;
        let initialLeft, initialTop;
        let currentStrainLocal = 0;
        let mildToastShownAt = 0;
        let criticalAlertShownStrain = false;
        let userMildThreshold = 40;
        let userSevereThreshold = 80;

        const bubble = document.getElementById('opti-suggestion-bubble');

        widget.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            isMoving = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = widget.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isMoving = true;
            if (isMoving) {
                widget.style.left = (initialLeft + dx) + 'px';
                widget.style.top = (initialTop + dy) + 'px';
                widget.style.bottom = 'auto';
                widget.style.right = 'auto';
                bubble.classList.remove('opti-visible');
            }
        });

        document.addEventListener('mouseup', () => {
            if (isMouseDown && !isMoving) {
                bubble.classList.toggle('opti-visible');
            }
            isMouseDown = false;
        });

        bubble.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ type: 'GO_TO_DASHBOARD' });
        });

        function getSuggestion(score) {
            if (score >= userSevereThreshold) return "⚠️ CRITICAL! Your eyes need rest. Take a 20-20-20 break or start a therapy session now.";
            if (score >= userMildThreshold) return "💡 Strain is climbing. Try blinking more often or look at something 20 feet away.";
            return "✅ You're doing great! Keep maintaining healthy blink habits.";
        }

        function updateWidget(score) {
            currentStrainLocal = score;
            const valEl = document.getElementById('opti-val');
            const suggestEl = document.getElementById('opti-suggest-text');
            const now = Date.now();

            if (valEl) {
                valEl.innerText = score;
                if (score >= userSevereThreshold) {
                    widget.style.borderColor = '#ff4757';
                    bubble.style.borderColor = '#ff4757';
                    valEl.style.color = '#ff4757';
                    bubble.classList.add('opti-visible');
                    if (!criticalAlertShownStrain) {
                        showCriticalAlert("High Eye Strain!", `Your strain is at ${score}%. Take a break immediately.`);
                        criticalAlertShownStrain = true;
                    }
                } else if (score >= userMildThreshold) {
                    widget.style.borderColor = '#f39c12';
                    bubble.style.borderColor = '#f39c12';
                    valEl.style.color = '#f39c12';
                    bubble.classList.add('opti-visible');
                    criticalAlertShownStrain = false;
                    // Show mild toast directly on the external tab (every 60s)
                    if (now - mildToastShownAt > 60000) {
                        mildToastShownAt = now;
                        showOptiToast({
                            type: 'warning',
                            title: 'Mild Eye Strain Warning 👁️',
                            message: `Your strain is at ${score}%. Consider looking away for 20 seconds.`
                        });
                    }
                } else {
                    widget.style.borderColor = '#2ecc71';
                    bubble.style.borderColor = '#2ecc71';
                    valEl.style.color = '#2ecc71';
                    if (score < userMildThreshold - 10) bubble.classList.remove('opti-visible');
                    criticalAlertShownStrain = false;
                }
            }
            if (suggestEl) suggestEl.innerText = getSuggestion(score);
        }

        // Ask for latest score + thresholds when tab opens
        chrome.runtime.sendMessage({ type: 'REQUEST_LATEST_STRAIN' }, (response) => {
            if (response) {
                if (response.mildThreshold) userMildThreshold = response.mildThreshold;
                if (response.severeThreshold) userSevereThreshold = response.severeThreshold;
                if (response.strain !== undefined) updateWidget(response.strain);
            }
        });

        // Listen for live updates from background.js
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'UPDATE_WIDGET_UI') {
                if (message.mildThreshold) userMildThreshold = message.mildThreshold;
                if (message.severeThreshold) userSevereThreshold = message.severeThreshold;
                updateWidget(message.strain);
            }
            if (message.type === 'UPDATE_PROXIMITY_UI') {
                showCriticalAlert("Proximity Hazard!", `You are sitting too close to the screen (${Math.round(message.currentDistance)}cm). Move back!`);
            }
            if (message.type === 'UPDATE_TOAST_UI') {
                showOptiToast(message.toast);
            }
        });
    }
})();
