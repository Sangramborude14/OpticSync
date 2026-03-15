// ── OptiSync Content Bridge & Widget ──
// High-reliability communication for hackathon final MVP.

(function() {
    // 1. Detection: Are we on the Master Dashboard?
    const isDashboard = document.getElementById('optisync-master-link') !== null || 
                        (window.location.hostname === "localhost" && document.querySelector('.dashboard-container') !== null);

    if (isDashboard) {
        console.log("🟢 OptiSync Master Bridge: Dashboard Connected.");

        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data && event.data.type === 'OPTISYNC_STRAIN_UPDATE') {
                chrome.runtime.sendMessage({
                    type: 'BROADCAST_STRAIN',
                    strainScore: event.data.strain
                }).catch(() => {});
            }
        });

    } else {
        // EXTERNAL TAB: Show Widget
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
                // Toggle Bubble instead of immediate redirect
                bubble.classList.toggle('opti-visible');
            }
            isMouseDown = false;
        });

        // Click on bubble to go to dashboard
        bubble.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ type: 'GO_TO_DASHBOARD' });
        });

        function getSuggestion(score) {
            if (score >= 80) return "⚠️ CRITICAL! Your eyes need rest. Take a 20-20-20 break or start a therapy session now.";
            if (score >= 40) return "💡 Strain is climbing. Try blinking more often or look at something 20 feet away.";
            return "✅ You're doing great! Keep maintaining healthy blink habits.";
        }

        function updateWidget(score) {
            currentStrainLocal = score;
            const valEl = document.getElementById('opti-val');
            const suggestEl = document.getElementById('opti-suggest-text');
            
            if (valEl) {
                valEl.innerText = score;
                if (score >= 80) {
                    widget.style.borderColor = '#ff4757';
                    bubble.style.borderColor = '#ff4757';
                    valEl.style.color = '#ff4757';
                    // Auto-show bubble info on high strain
                    bubble.classList.add('opti-visible');
                } else if (score >= 40) {
                    widget.style.borderColor = '#f39c12';
                    bubble.style.borderColor = '#f39c12';
                    valEl.style.color = '#f39c12';
                    // ALSO auto-show at 40% so user gets the "info" early
                    bubble.classList.add('opti-visible');
                } else {
                    widget.style.borderColor = '#2ecc71';
                    bubble.style.borderColor = '#2ecc71';
                    valEl.style.color = '#2ecc71';
                    // Auto-hide when safe
                    if (score < 30) bubble.classList.remove('opti-visible');
                }
            }
            if (suggestEl) suggestEl.innerText = getSuggestion(score);
        }

        chrome.runtime.sendMessage({ type: 'REQUEST_LATEST_STRAIN' }, (response) => {
            if (response && response.strain !== undefined) updateWidget(response.strain);
        });

        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'UPDATE_WIDGET_UI') updateWidget(message.strain);
        });
    }
})();
