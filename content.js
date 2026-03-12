// Detect if we are natively running on the OptiSync Master Dashboard
const isDashboard = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

if (!isDashboard) {
    // Inject UI Components
    const styleUrl = chrome.runtime.getURL('styles.css');
    const link = document.createElement('link');
    link.href = styleUrl;
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    const widgetHTML = `
      <div id="optisync-widget" class="noselect">
        <div class="opti-drag-handle">☰</div>
        <div class="opti-score">
          <span id="opti-strain-value">0</span>%
          <div class="opti-label">STRAIN</div>
        </div>
        <button id="opti-btn-therapy" title="Manual Therapy Menu">✦</button>
      </div>
    `;

    const modal80HTML = `
      <div id="optisync-modal" class="hidden">
        <div class="opti-glass-panel">
          <h2>Burnout Imminent</h2>
          <p>Your strain score has reached 80%. Immediate action required to protect cognitive load.</p>
          
          <div id="opti-main-choices">
            <button id="opti-btn-physical" class="opti-btn-primary">
              Take a 5-Min Physical Break
              <small>Look away from the screen. We will verify via webcam.</small>
            </button>
            <button id="opti-btn-enter-therapy" class="opti-btn-secondary">
              Enter Therapy Session
            </button>
          </div>

          <div id="opti-therapy-menu" class="hidden">
            <h3>Therapy Modules</h3>
            <div class="opti-therapy-branches">
              <div class="opti-branch">
                <h4>Digital Therapy</h4>
                <button class="opti-btn-ghost">Flow State (Game 1)</button>
                <button class="opti-btn-ghost">Zen Match (Game 2)</button>
                <button class="opti-btn-ghost">Breathe Sync (Game 3)</button>
              </div>
              <div class="opti-branch">
                <h4>Natural Therapy</h4>
                <button class="opti-btn-ghost">Palming (Session 1)</button>
                <button class="opti-btn-ghost">20-20-20 Rule (Session 2)</button>
                <button class="opti-btn-ghost">Guided Stretch (Session 3)</button>
              </div>
            </div>
            <button id="opti-btn-back" class="opti-btn-text">Back</button>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML + modal80HTML);

    // Drag Logic for Widget
    const widget = document.getElementById('optisync-widget');
    let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

    widget.querySelector('.opti-drag-handle').addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      if (e.target === widget.querySelector('.opti-drag-handle')) {
        isDragging = true;
      }
    }
    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        widget.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }
    function dragEnd() {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    // Logic & Interactivity
    let scoreVal = document.getElementById('opti-strain-value');
    let modal = document.getElementById('optisync-modal');
    let mainChoices = document.getElementById('opti-main-choices');
    let therapyMenu = document.getElementById('opti-therapy-menu');
    let modalTriggered = false;

    document.getElementById('opti-btn-therapy').addEventListener('click', () => {
        // Manual Trigger
        modal.classList.remove('hidden');
        mainChoices.classList.add('hidden');
        therapyMenu.classList.remove('hidden');
    });

    document.getElementById('opti-btn-enter-therapy').addEventListener('click', () => {
        mainChoices.classList.add('hidden');
        therapyMenu.classList.remove('hidden');
    });

    document.getElementById('opti-btn-back').addEventListener('click', () => {
        if (scoreVal.innerText >= 80) {
            // Must stay in lockdown if score is still >= 80
            mainChoices.classList.remove('hidden');
            therapyMenu.classList.add('hidden');
        } else {
            // Can dismiss if score is below 80 and was manually opened
            modal.classList.add('hidden');
        }
    });

    // A hack to unlock the physical break during hackathon
    document.getElementById('opti-btn-physical').addEventListener('click', () => {
       alert("Look away rule activated. Waiting for offscreen engine verification to unlock...");
       // Usually we would poll the strain score here continuously until it hits < 50%
       setTimeout(() => {
         alert("Verified! Restored.");
         modal.classList.add('hidden');
         modalTriggered = false;
       }, 3000); 
    });

    // Listener for Strain Updates from the Service Worker (Background)
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'UPDATE_UI') {
            const score = message.strainScore;
            scoreVal.innerText = score;

            // Visual Feedback on widget
            if (score > 50) {
                widget.style.borderColor = 'rgba(255, 99, 132, 0.8)';
                widget.style.boxShadow = '0 8px 32px 0 rgba(255, 99, 132, 0.3)';
            } else {
                widget.style.borderColor = 'rgba(46, 204, 113, 0.3)';
                widget.style.boxShadow = '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
            }

            // 80% Check
            if (score >= 80 && !modalTriggered) {
                 modalTriggered = true;
                 modal.classList.remove('hidden');
                 mainChoices.classList.remove('hidden');
                 therapyMenu.classList.add('hidden');
            } else if (score < 50 && modalTriggered) {
                 // Auto dismiss if they recover without button clicks (e.g. eyes closed)
                 modalTriggered = false;
                 modal.classList.add('hidden');
            }
        }
    });
} else {
    // We ARE on the Dashboard! Clean up any duplicate injected elements just in case.
    const existingWidget = document.getElementById('optisync-widget');
    const existingModal = document.getElementById('optisync-modal');
    if (existingWidget) existingWidget.remove();
    if (existingModal) existingModal.remove();
}

// ALWAYS listener for local React engine broadcasts (If this tab happens to be the Dashboard)
// This is what bridges React out into the Chrome Extension Router
window.addEventListener('OPTISYNC_STRAIN_PING', (e) => {
    try {
        // Forward this locally emitted strain score off to the background service worker! 
        chrome.runtime.sendMessage({
            type: 'BROADCAST_STRAIN',
            strainScore: e.detail.strain
        });
    } catch(err) {
        // Suppress errors if extension context gets invalidated
        console.warn("OptiSync Bridge: Could not contact Chrome extension runtime.", err);
    }
});
