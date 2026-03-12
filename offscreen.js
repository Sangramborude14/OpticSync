// Face Mesh & MediaPipe Setup
const videoElement = document.getElementById('input_video');

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_THRESHOLD = 0.25;

let strainScore = 0;
let lastBlinkTime = Date.now();
const MAX_STRAIN = 100;

function calculateDistance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
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

function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        const leftEAR = calculateEAR(landmarks, LEFT_EYE);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
        const averageEAR = (leftEAR + rightEAR) / 2.0;

        // Is user blinking?
        let isBlinking = averageEAR < EAR_THRESHOLD;
        const now = Date.now();

        if (isBlinking) {
            lastBlinkTime = now;
            // Immediate partial relief upon blinking
            strainScore = Math.max(0, strainScore - 1); 
        }

        // Time since last blink in seconds
        let secondsSinceBlink = (now - lastBlinkTime) / 1000;

        // Strain algorithm: 
        // If the user goes more than 4 seconds without blinking, strain score shoots up quickly
        // This is perfectly tuned for a dynamic, impressive hackathon live-demo
        if (secondsSinceBlink > 4) {
            strainScore += 0.5; // Increases rapidly if staring
        } else if (secondsSinceBlink > 2) {
            strainScore += 0.1; // Slow increase
        } else {
            // Very slow decay if blinking healthily
            strainScore = Math.max(0, strainScore - 0.05); 
        }

        strainScore = Math.min(MAX_STRAIN, strainScore);

        // Send to background to route to UI
        chrome.runtime.sendMessage({
            type: 'STRAIN_UPDATE',
            strainScore: Math.round(strainScore) // sending whole numbers for UI
        });
    }
}

// Ensure camera stream connects and runs FaceMesh continually
async function main() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        await videoElement.play();

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

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await faceMesh.send({image: videoElement});
            },
            width: 480,
            height: 360
        });
        camera.start();

    } catch (e) {
        console.error("OptiSync: Camera access denied or failed.", e);
    }
}

main();
