import React, { useState, useEffect, useRef } from 'react';

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

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

export default function PalmingAudio({ onComplete, onCancel }) {
    const videoRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [isCovered, setIsCovered] = useState(false);
    const [status, setStatus] = useState("Loading tracking models...");
    const [hasStarted, setHasStarted] = useState(true);
    
    // We use Refs to track values inside the callback without stale closures
    const stateRef = useRef({
        isCovered: false,
        lastWidth: 0,
        lastCenterX: 0.5,
        lastCenterY: 0.5,
        wasCoveredWhenLost: false
    });

    useEffect(() => {
        if (!hasStarted) return;
        
        let faceMesh;
        let camera;
        let isRunning = true;

        const initEngine = async () => {
            if (!window.FaceMesh || !window.Camera) {
                setStatus("Waking AI...");
                if (isRunning) setTimeout(initEngine, 500);
                return;
            }

            faceMesh = new window.FaceMesh({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }});
            
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            faceMesh.onResults((results) => {
                if (!isRunning) return;
                
                const now = Date.now();
                
                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    const landmarks = results.multiFaceLandmarks[0];
                    const leftEAR = calculateEAR(landmarks, LEFT_EYE);
                    const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
                    const averageEAR = (leftEAR + rightEAR) / 2.0;

                    // Calculate bounding box for occlusion heuristics
                    const xs = landmarks.map(p => p.x);
                    const ys = landmarks.map(p => p.y);
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);
                    
                    stateRef.current.lastWidth = maxX - minX;
                    stateRef.current.lastCenterX = (minX + maxX) / 2.0;
                    stateRef.current.lastCenterY = (minY + maxY) / 2.0;

                    // If eyes are occluded or closed, EAR drops significantly
                    if (averageEAR < 0.22) {
                        stateRef.current.isCovered = true;
                        stateRef.current.wasCoveredWhenLost = true; // They covered eyes while still detected
                        setIsCovered(true);
                        setStatus("Good. Keep them covered and breathe...");
                    } else {
                        stateRef.current.isCovered = false;
                        stateRef.current.wasCoveredWhenLost = false;
                        setIsCovered(false);
                        setStatus("Eyes detected! Please cover your eyes with your hands.");
                    }
                } else {
                    // Face is entirely gone from frame. Discard or Covered?
                    const wasLarge = stateRef.current.lastWidth > 0.12; 
                    const wasCentered = stateRef.current.lastCenterX > 0.2 && stateRef.current.lastCenterX < 0.8 && 
                                        stateRef.current.lastCenterY > 0.2 && stateRef.current.lastCenterY < 0.8;
                    
                    if (stateRef.current.wasCoveredWhenLost || (wasLarge && wasCentered)) {
                        // The face disappeared while being large and centered, or was already covered right before vanishing.
                        // This proves the hands successfully occluded the camera/face, triggering FaceMesh to fail.
                        stateRef.current.isCovered = true;
                        stateRef.current.wasCoveredWhenLost = true; // Lock it in until face reappears
                        setIsCovered(true);
                        setStatus("Good. Keep them covered and breathe...");
                    } else {
                        // Face vanished while small (walking back) or at the edges of the frame
                        stateRef.current.isCovered = false;
                        stateRef.current.wasCoveredWhenLost = false;
                        setIsCovered(false);
                        setStatus("User not detected in frame. Please stay in view!");
                    }
                }
            });

            const videoElement = videoRef.current;
            if (videoElement) {
                camera = new window.Camera(videoElement, {
                    onFrame: async () => {
                        if (isRunning) await faceMesh.send({image: videoElement});
                    },
                    width: 640,
                    height: 480
                });
                camera.start();
                setStatus("Camera active. Rub your hands and cover your eyes!");
            }
        };

        initEngine();

        return () => {
            isRunning = false;
            if (camera) camera.stop();
            if (faceMesh) faceMesh.close();
        };
    }, [hasStarted]);

    // Timer effect
    useEffect(() => {
        if (!hasStarted) return;

        const timer = setInterval(() => {
            // Only countdown if face is covered
            if (stateRef.current.isCovered) {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onComplete(); // Done!
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [hasStarted, onComplete]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
             <div className="glass-card" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '40px' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Palming Therapy</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    Guided sensory deprivation. Rub your hands together to generate warmth, then cup them over your closed eyes to block out all light. This resets rod & cone fatigue.
                </p>

                <div style={{ position: 'relative', width: '100%', maxWidth: '320px', aspectRatio: '4/3', margin: '0 auto 30px', borderRadius: '15px', overflow: 'hidden', background: '#000', border: hasStarted ? (isCovered ? '4px solid #2ecc71' : '4px solid #ff4757') : '4px solid rgba(255,255,255,0.1)', transition: 'border 0.3s ease' }}>
                    <video ref={videoRef} className="webcam-video" autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                    
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '8px', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', fontWeight: '500', backdropFilter: 'blur(4px)' }}>
                        {status}
                    </div>
                </div>

                <div style={{ margin: '30px 0' }}>
                    <div style={{ fontSize: '4.5rem', fontWeight: '800', color: isCovered ? '#2ecc71' : '#ff4757', fontFamily: 'Outfit', lineHeight: '1' }}>
                        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontWeight: '500' }}>{
                        status === "User not detected in frame. Please stay in view!" 
                            ? "Timer Paused - User not in frame" 
                            : (isCovered ? "Hold position..." : "Timer Paused - Please cover your eyes")
                    }</p>
                </div>
                
                <div style={{ marginTop: '30px' }}>
                    <button className="btn-text" onClick={onCancel} style={{ fontSize: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}>Cancel Session</button>
                </div>
             </div>
        </div>
    );
}
