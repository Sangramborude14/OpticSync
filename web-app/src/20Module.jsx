import React, { useState, useEffect, useRef } from 'react';

function calculateDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export default function Module20({ onComplete, onCancel }) {
    const videoRef = useRef(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [isLookingAway, setIsLookingAway] = useState(false);
    const [status, setStatus] = useState("Loading tracking models...");
    const [hasStarted, setHasStarted] = useState(true);
    
    // We use Refs to track values inside the callback without stale closures
    const stateRef = useRef({
        isLookingAway: false,
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
                
                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    const landmarks = results.multiFaceLandmarks[0];
                    
                    const nose = landmarks[1];
                    const leftFace = landmarks[234];
                    const rightFace = landmarks[454];

                    // 1. Head Yaw (Left/Right Turn) using pure horizontal projection
                    const faceWidthX = Math.abs(rightFace.x - leftFace.x);
                    const faceCenterX = (leftFace.x + rightFace.x) / 2.0;
                    const headYawRatio = Math.abs(nose.x - faceCenterX) / faceWidthX;

                    // 2. Head Pitch (Up/Down Turn) using Depth (z) 
                    const topFace = landmarks[10];
                    const bottomFace = landmarks[152];
                    const faceHeightY = Math.abs(bottomFace.y - topFace.y);
                    const headPitchRatio = Math.abs(topFace.z - bottomFace.z) / faceHeightY;

                    // 3. Iris Gaze Tracking (Are eyes darting away?)
                    let isGazeAway = false;
                    if (landmarks[468] && landmarks[473]) { // Ensure Iris landmarks exist
                        const leftEyeLeft = landmarks[33];
                        const leftEyeRight = landmarks[133];
                        const leftIris = landmarks[468];
                        
                        const rightEyeLeft = landmarks[362];
                        const rightEyeRight = landmarks[263];
                        const rightIris = landmarks[473];

                        const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
                        // Using fixed orientation: iris ratio from the left side of the eye
                        const leftIrisRatio = leftEyeWidth > 0 ? Math.abs(leftIris.x - leftEyeLeft.x) / leftEyeWidth : 0.5;

                        const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
                        const rightIrisRatio = rightEyeWidth > 0 ? Math.abs(rightIris.x - rightEyeLeft.x) / rightEyeWidth : 0.5;

                        // Average relative horizontal position of iris (0: left, 1: right)
                        const avgIrisHorizontal = (leftIrisRatio + rightIrisRatio) / 2.0;

                        // If irises are pushed far to the side (>< 0.5 center)
                        if (avgIrisHorizontal < 0.35 || avgIrisHorizontal > 0.65) {
                            isGazeAway = true;
                        }
                    }

                    // A user is clearly "looking away" if they deeply turn left/right,
                    // deeply tilt up/down, or rigidly shift their eyes sideways.
                    const isLookingAway = headYawRatio > 0.08 || headPitchRatio > 0.25 || isGazeAway;

                    if (!isLookingAway) {
                        stateRef.current.isLookingAway = false;
                        setIsLookingAway(false);
                        setStatus("Looking at screen! Turn your head or look away to continue.");
                    } else {
                        // Head or eyes are turned away
                        stateRef.current.isLookingAway = true;
                        setIsLookingAway(true);
                        setStatus("Good. Keep looking away...");
                    }
                } else {
                    // Face is entirely gone from frame (they completely turned away or walked back)
                    stateRef.current.isLookingAway = true;
                    setIsLookingAway(true);
                    setStatus("Face turned away. Keep looking away...");
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
                setStatus("Camera active. Please look 20 feet away to start the timer!");
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
            if (stateRef.current.isLookingAway) {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onComplete(); 
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
                <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>20-20-20 Rule</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    Look at something 20 feet away for 20 seconds. This shifts your focal length and allows the ciliary muscles in your eyes to relax.
                </p>

                <div style={{ position: 'relative', width: '100%', maxWidth: '320px', aspectRatio: '4/3', margin: '0 auto 30px', borderRadius: '15px', overflow: 'hidden', background: '#000', border: isLookingAway ? '4px solid #2ecc71' : '4px solid #f39c12', transition: 'border 0.3s ease' }}>
                    <video ref={videoRef} className="webcam-video" autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                    
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', padding: '8px', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', fontWeight: '500', backdropFilter: 'blur(4px)' }}>
                        {status}
                    </div>
                </div>

                <div style={{ margin: '30px 0' }}>
                    <div style={{ fontSize: '4.5rem', fontWeight: '800', color: isLookingAway ? '#2ecc71' : '#f39c12', fontFamily: 'Outfit', lineHeight: '1' }}>
                        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontWeight: '500' }}>{
                        isLookingAway ? "Hold position..." : "Timer Paused - Looking at screen"
                    }</p>
                </div>
                
                <div style={{ marginTop: '30px' }}>
                    <button className="btn-text" onClick={onCancel} style={{ fontSize: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer' }}>Cancel Session</button>
                </div>
             </div>
        </div>
    );
}
