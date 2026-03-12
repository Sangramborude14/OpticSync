const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusOverlay = document.getElementById('webcam_status');

// UI Elements
const uiBlinkCount = document.getElementById('blink_count_val');
const uiStrainFill = document.getElementById('strain_progress');
const uiStrainText = document.getElementById('strain_text_percent');
const uiStatusText = document.getElementById('status_text_val');

// Modal Elements
const thresholdModal = document.getElementById('threshold_modal');
const btnEnterTherapy = document.getElementById('btn_enter_therapy');
const initialModalView = document.getElementById('initial_modal_view');
const therapyMenuView = document.getElementById('therapy_menu_view');
const btnBackModal = document.getElementById('btn_back_modal');

// Eye Landmark Indices
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_THRESHOLD = 0.25;

// State Tracking
let totalBlinks = 0;
let consecutiveFramesBelowThreshold = 0;
let blinkHistory = []; // Array of timestamps for calculating BPM
let strainLevel = 0; // 0 to 100
let isModalTriggered = false;

// Geometry Math
function calculateDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function calculateEAR(landmarks, eyeIndices) {
    const p1 = landmarks[eyeIndices[0]];
    const p2 = landmarks[eyeIndices[1]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[3]];
    const p5 = landmarks[eyeIndices[4]];
    const p6 = landmarks[eyeIndices[5]];

    const dist2_6 = calculateDistance(p2, p6);
    const dist3_5 = calculateDistance(p3, p5);
    const dist1_4 = calculateDistance(p1, p4);

    if (dist1_4 === 0) return 0;
    return (dist2_6 + dist3_5) / (2.0 * dist1_4);
}

// Update UI
function updateDashboard() {
    uiBlinkCount.innerText = totalBlinks;
    
    // Animate Progress Bar Length
    uiStrainFill.style.width = strainLevel.toFixed(1) + '%';
    uiStrainText.innerText = Math.round(strainLevel) + '%';
    
    // Update Progress Bar Colors
    if (strainLevel > 60) {
        uiStrainFill.style.background = 'linear-gradient(90deg, #f39c12, #ff4757)';
        uiStatusText.innerText = "Strain Building";
        uiStatusText.className = "status-text strain-building";
    } else if (strainLevel > 30) {
        uiStrainFill.style.background = 'linear-gradient(90deg, #1abc9c, #f39c12)';
        uiStatusText.innerText = "Moderate Focus";
        uiStatusText.className = "status-text";
    } else {
        uiStrainFill.style.background = 'linear-gradient(90deg, #1abc9c, #2ecc71)';
        uiStatusText.innerText = "Eyes Rested";
        uiStatusText.className = "status-text";
    }

    if (strainLevel >= 80 && !isModalTriggered) {
        triggerLockdownModal();
    }
}

function triggerLockdownModal() {
    isModalTriggered = true;
    thresholdModal.classList.remove('hidden');
    uiStatusText.innerText = "Severe Strain";
    uiStatusText.className = "status-text severe-strain";
}

// MediaPipe Callback
function onResults(results) {
    statusOverlay.innerText = "Engine Active - Tracking Eyes";
    statusOverlay.style.background = "rgba(46, 204, 113, 0.4)"; // Turn Green

    // Clear Canvas if needed, though we won't draw the mesh.
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        const leftEAR = calculateEAR(landmarks, LEFT_EYE);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
        const averageEAR = (leftEAR + rightEAR) / 2.0;

        // Blink Detection Logic (Requires 2 consecutive frames under threshold)
        if (averageEAR < EAR_THRESHOLD) {
            consecutiveFramesBelowThreshold++;
        } else {
            // Once EAR goes back up, check if it was a blink
            if (consecutiveFramesBelowThreshold >= 2) {
                totalBlinks++;
                const now = Date.now();
                blinkHistory.push(now);
                
                // Keep only blinks from the last 60 seconds (60000ms)
                blinkHistory = blinkHistory.filter(timestamp => now - timestamp <= 60000);
            }
            consecutiveFramesBelowThreshold = 0;
        }

        // Rolling Window BPM logic
        const now = Date.now();
        blinkHistory = blinkHistory.filter(timestamp => now - timestamp <= 60000);
        let bpm = blinkHistory.length; // Blinks in the last 60 seconds

        // Strain Algorithm
        // Hackathon trick: The algorithm accelerates based on how low BPM is under 10
        if (bpm < 10) {
            strainLevel += 0.3; // Increases rapidly if staring
        } else {
            strainLevel -= 0.1; // Slow decay if healthy
        }
        
        // Clamp between 0 and 100
        strainLevel = Math.max(0, Math.min(100, strainLevel));

        updateDashboard();
    } else {
        statusOverlay.innerText = "No Face Detected";
        statusOverlay.style.background = "rgba(255, 71, 87, 0.6)"; // Red
    }
}

// Set up MediaPipe FaceMesh
const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

// Start Camera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        // Match canvas dimensions to video
        if (videoElement.videoWidth > 0 && canvasElement.width !== videoElement.videoWidth) {
           canvasElement.width = videoElement.videoWidth;
           canvasElement.height = videoElement.videoHeight;
        }
        await faceMesh.send({image: videoElement});
    },
    width: 640,
    height: 480
});
camera.start();


// Modal Interactivity
btnEnterTherapy.addEventListener('click', () => {
    initialModalView.classList.add('hidden');
    therapyMenuView.classList.remove('hidden');
});

btnBackModal.addEventListener('click', () => {
    // Only allow back if strain is below 80% (Hackathon Override for demo speed)
    thresholdModal.classList.add('hidden');
    initialModalView.classList.remove('hidden');
    therapyMenuView.classList.add('hidden');
    isModalTriggered = false;
    
    // Artificial reset for hackathon loop
    if(strainLevel >= 80) {
      strainLevel = 50;
      blinkHistory.push(Date.now(), Date.now(), Date.now(), Date.now(), Date.now()); // Inject fake blinks to boost BPM
    }
});

// Configure Placeholder Therapy Buttons
const therapyBtns = document.querySelectorAll('.therapy-btn');
therapyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const moduleName = e.target.getAttribute('data-module');
        console.log(`[OptiSync OS] Target Module Activated: ${moduleName}`);
        alert(`Launching Module: ${moduleName}\n\n(See Console for log string)`);
    });
});
