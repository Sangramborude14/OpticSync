import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { NotificationManager } from './notifications/NotificationManager';
import PalmingAudio from './PalmingAudio';
import Module20 from './20Module';
import EyeMassage from './EyeMassage';
import FocusShifter from './assets/FocusShifter.jsx';
import HistoryLog from './HistoryLog.jsx';
import InfinityTracker from './infinityTracker.jsx';
import CornerTaps from './corner tap.jsx';
import Setting from './Setting.jsx';
import { useProximity, PostureCalibration, ProximitySensor } from './setposture';
import AIChatbot from './AIChatbot';

// Eye Landmark Indices
const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_THRESHOLD = 0.25;

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

// --- In-App Toast Notification Component ---
function StrainToast({ toast, onClose }) {
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(onClose, 6000);
        return () => clearTimeout(t);
    }, [toast, onClose]);

    if (!toast) return null;
    return (
        <div className={`strain-toast ${toast.type}`} onClick={onClose}>
            <div className="toast-icon">{toast.type === 'critical' ? '🚨' : '⚠️'}</div>
            <div className="toast-body">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
            </div>
            <button className="toast-close" onClick={onClose}>✕</button>
        </div>
    );
}

function App() {
    useEffect(() => {
        window.OPTISYNC_MASTER = true; // Hard Marker for Chrome Extension
    }, []);
    const [strainLevel, setStrainLevel] = useState(0);
    const [blinkRate, setBlinkRate] = useState(0);
    const [, setBlinkCount] = useState(0);
    const [liveEAR, setLiveEAR] = useState("0.00");
    const [statusText, setStatusText] = useState("Downloading AI Models (Takes 5-10s first time)...");
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [therapyView, setTherapyView] = useState('initial');
    const [activeModule, setActiveModule] = useState(null);
    const [backendStatus, setBackendStatus] = useState('checking');
    const [lookAwayDisplay, setLookAwayDisplay] = useState(45);
    const [connectionStatus, setConnectionStatus] = useState('idle');
    const [toast, setToast] = useState(null); // { title, message, type: 'warning'|'critical' }

    // Proximity hook for clean state management & calibration
    const proximity = useProximity(() => {
        setTherapyView('proximity_hazard');
        setIsModalOpen(true);
    });

    const [isLightMode, setIsLightMode] = useState(localStorage.getItem('lightMode') === 'true');

    useEffect(() => {
        if (isLightMode) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
        localStorage.setItem('lightMode', isLightMode);
    }, [isLightMode]);

    useEffect(() => {
        const handleCamChange = () => {
            if (activeTab === 'dashboard') {
                setActiveTab('settings');
                setTimeout(() => setActiveTab('dashboard'), 100);
            }
        };
        window.addEventListener('OPTISYNC_CAMERA_CHANGE', handleCamChange);
        return () => window.removeEventListener('OPTISYNC_CAMERA_CHANGE', handleCamChange);
    }, [activeTab]);

    // Backend health check
    useEffect(() => {
        const checkBackend = () => {
            fetch('http://localhost:5001/api/health')
                .then(res => res.json())
                .then(data => setBackendStatus(data.mongodb === 'Connected' ? 'live' : 'error'))
                .catch(() => setBackendStatus('offline'));
        };
        checkBackend();
        const interval = setInterval(checkBackend, 30000);
        return () => clearInterval(interval);
    }, []);

    const videoRef = useRef(null);
    const engineState = useRef({
        blinks: 0,
        strain: 0,
        blinkHistory: [],
        modalTriggered: false,
        modalCooldownUntil: 0,
        lowestEAR: 1.0,
        isBlinking: false,
        blinkStartTime: 0,
        lastTime: 0,
        healthyBlinkStartTime: null,
        lastFaceTime: 0,
        lookAwayActive: false,
        lookAwayTimeLeft: 0,
        proximityStartTime: null,
        proximityAlertTriggered: false,
        // Strain alert tracking
        warningNotifiedAt: 0,       // timestamp of last 80% OS notification
        criticalTriggered: false,   // whether 100% modal has been triggered this cycle
        warningToastShownAt: 0      // timestamp of last in-app toast
    });

    useEffect(() => {
        const now = Date.now();
        engineState.current.lastTime = now;
        engineState.current.lastFaceTime = now;
        engineState.current.sessionStartTime = now;
    }, []);

    useEffect(() => {
        NotificationManager.requestPermission();
    }, []);

    useEffect(() => {
        // Only initialize MediaPipe if we are on the dashboard tab so the video element exists
        if (activeTab !== 'dashboard') return;

        const videoElement = videoRef.current;
        if (!videoElement) return;

        let faceMesh;
        let camera;
        let worker;

        const initEngine = async () => {
            if (!window.FaceMesh || !window.Camera) {
                setStatusText("Loading AI Models...");
                setTimeout(initEngine, 500);
                return;
            }

            faceMesh = new window.FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            faceMesh.onResults((results) => {
                const now = Date.now();
                let state = engineState.current;

                // Clamp dtSec to max 0.1s to PREVENT massive spikes when AI models finish downloading or waking from background!
                const dtSec = Math.min(0.1, Math.max(0, (now - state.lastTime) / 1000.0));
                state.lastTime = now;

                if (state.lookAwayActive) {
                    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                        state.lookAwayTimeLeft -= dtSec;
                        setLookAwayDisplay(Math.max(0, state.lookAwayTimeLeft));
                        if (state.lookAwayTimeLeft <= 0) {
                            state.lookAwayActive = false;
                            state.strain = 0;
                            state.modalTriggered = false;
                            state.modalCooldownUntil = now + 60000;
                            setStrainLevel(0);
                            setIsModalOpen(false);
                            setTherapyView('initial');
                            setTimeout(() => alert("✅ 45-Second Look Away Complete!\n\nYour eye strain has been safely reset to 0%."), 100);
                            return;
                        }
                    }
                }

                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                    setStatusText("Engine Active - Tracking");
                    state.lastFaceTime = now;
                    const landmarks = results.multiFaceLandmarks[0];

                    const leftEAR = calculateEAR(landmarks, LEFT_EYE);
                    const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
                    const averageEAR = (leftEAR + rightEAR) / 2.0;

                    // Expose Live EAR string to React State for the Dashboard to render smoothly
                    setLiveEAR(averageEAR.toFixed(3));

                    // Broadcast raw landmarks for advanced therapy modules (like Gaze Tracking)
                    window.dispatchEvent(new CustomEvent('OPTISYNC_LANDMARKS', { detail: landmarks }));

                    const CLOSED_THRESH = 0.20;
                    const PARTIAL_THRESH = 0.26;

                    // Restorative logic: if your eyes are closed completely, heal rapidly!
                    if (averageEAR < 0.18) {
                        state.strain -= 2.0 * dtSec; // Realistic restore while resting eyes
                    }

                    // Blink Detection
                    if (averageEAR < PARTIAL_THRESH) {
                        if (!state.isBlinking) {
                            state.isBlinking = true;
                            state.lowestEAR = averageEAR;
                            state.blinkStartTime = now;
                        } else {
                            state.lowestEAR = Math.min(state.lowestEAR, averageEAR);
                        }
                    } else {
                        if (state.isBlinking) {
                            if (state.lowestEAR <= CLOSED_THRESH) {
                                // Full blink -> Decreases Strain
                                state.blinks++;
                                state.blinkHistory.push(now);
                                setBlinkCount(state.blinks);

                                // Normal blink recovery (Scaled for real-data study)
                                state.strain -= 0.05; // Sustainable micro-recovery per blink
                                state.lastBlinkTime = now;
                            }

                            state.isBlinking = false;
                            state.lowestEAR = 1.0;
                        }
                    }

                    state.blinkHistory = state.blinkHistory.filter(timestamp => now - timestamp <= 60000);
                    
                    // Predict BPM dynamically for the first 60 seconds
                    // Blend actual blinks with a neutral 10 BPM baseline to prevent an unfair early "edge"
                    const elapsedMinutes = Math.min(1.0, Math.max((now - state.sessionStartTime) / 60000, 0.05));
                    let currentBpm = state.blinkHistory.length;
                    if (elapsedMinutes < 1.0) {
                        currentBpm = state.blinkHistory.length + (10.0 * (1.0 - elapsedMinutes));
                    }
                    const finalBpm = Math.round(currentBpm);
                    setBlinkRate(finalBpm);

                    // EAR Strain Penalty Tracking
                    if (!state.lastBlinkTime) state.lastBlinkTime = now;
                    const stareDuration = (now - state.lastBlinkTime) / 1000.0;

                    let earModifier = 1.0;
                    if (averageEAR >= 0.32) {
                        earModifier = 1.8; // Eyes very wide open (Staring intently)
                    } else if (averageEAR >= 0.28) {
                        earModifier = 1.3; // Eyes moderately wide
                    }

                    // Scientific Strain Calculation (Digital Eye Strain Model)
                    // Baseline: 100% strain over ~120 mins of screen exposure
                    const baseStrainRate = (100 / 7200) * dtSec * earModifier;
                    
                    if (finalBpm < 5 || stareDuration > 6.0) {
                        // Severe stare: ~20 mins to 100%
                        // Also proactively triggers if you just haven't blinked in 6+ seconds
                        state.strain += baseStrainRate + (0.08 * dtSec * earModifier); 
                    } else if (finalBpm >= 5 && finalBpm <= 9) {
                        // Moderate stare: ~45 mins to 100%
                        state.strain += baseStrainRate + (0.03 * dtSec * earModifier);
                    } else if (finalBpm >= 10 && finalBpm <= 14) {
                        // Normal baseline screen usage
                        state.strain += baseStrainRate;
                    } else if (finalBpm >= 15) {
                        // Healthy blinking (15+ bpm): Active eye lubrication recovery
                        if (earModifier > 1.0) {
                            // Deny continuous recovery if they are currently wide-eyed staring
                            state.strain += baseStrainRate;
                        } else {
                            state.strain -= 0.05 * dtSec;
                        }
                    }

                    state.strain = Math.max(0, Math.min(100, state.strain));
                    const roundedStrain = Math.round(state.strain);
                    setStrainLevel(roundedStrain);

                    // Chrome Extension Integration: Broadcast live strain to content.js
                    window.dispatchEvent(new CustomEvent('OPTISYNC_STRAIN_PING', { detail: { strain: roundedStrain } }));
                    window.postMessage({ type: 'OPTISYNC_STRAIN_UPDATE', strain: roundedStrain }, "*");

                    // ── STRAIN ALERT SYSTEM ──────────────────────────────────────────
                    const notificationsEnabled = localStorage.getItem('notificationsEnabled') !== 'false';
                    const mildThreshold = Number(localStorage.getItem('optisync_mild_threshold')) || 40;
                    const severeThreshold = Number(localStorage.getItem('optisync_severe_threshold')) || 80;

                    // MILD WARNING: In-app toast + OS notification
                    if (roundedStrain >= mildThreshold && roundedStrain < severeThreshold) {
                        const toastCooldown = 60000; // Only re-toast every 60s
                        if (notificationsEnabled && now - state.warningToastShownAt > toastCooldown) {
                            state.warningToastShownAt = now;
                            setToast({
                                type: 'warning',
                                title: 'Mild Eye Strain Warning 👁️',
                                message: `Your strain is at ${roundedStrain}%. Consider looking away for 20 seconds.`
                            });

                            const osCooldown = 120000; // OS notification every 2 min
                            if (now - state.warningNotifiedAt > osCooldown) {
                                state.warningNotifiedAt = now;
                                NotificationManager.sendHighFatigueAlert(roundedStrain);
                            }
                        }
                        state.criticalTriggered = false;
                    }

                    // SEVERE CRITICAL: Open therapy modal + OS notification
                    if (roundedStrain >= severeThreshold && !state.criticalTriggered && !state.modalTriggered && now > state.modalCooldownUntil) {
                        state.criticalTriggered = true;
                        state.modalTriggered = true;
                        setToast({
                            type: 'critical',
                            title: '🚨 SEVERE STRAIN DETECTED',
                            message: `Strain reached ${roundedStrain}%! Mandatory therapy session required to reset.`
                        });
                        NotificationManager.sendCriticalStrainAlert();
                        window.focus();
                        setTherapyView('menu');
                        setIsModalOpen(true);
                    }

                    // Reset critical once strain drops back safely (10% buffer below severe)
                    if (roundedStrain < severeThreshold - 10) {
                        state.criticalTriggered = false;
                    }
                    // ── END STRAIN ALERT SYSTEM ──────────────────────────────────────

                    // Proximity is handled by the useProximity hook via the 'OPTISYNC_LANDMARKS' event

                } else {
                    setStatusText("No Face Detected (Resting)");
                    setLiveEAR("N/A");

                    // Looking away mechanism: (-15% over 10 seconds)
                    state.strain -= 1.5 * dtSec;
                    state.strain = Math.max(0, Math.min(100, state.strain));
                    const roundedStrain = Math.round(state.strain);
                    setStrainLevel(roundedStrain);

                    // Chrome Extension Sync
                    window.dispatchEvent(new CustomEvent('OPTISYNC_STRAIN_PING', { detail: { strain: roundedStrain } }));
                    window.postMessage({ type: 'OPTISYNC_STRAIN_UPDATE', strain: roundedStrain }, "*");
                }
            });

            const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia = async (constraints) => {
                const preferredCamera = localStorage.getItem('preferredCamera');
                if (preferredCamera && constraints.video) {
                    constraints.video.deviceId = { exact: preferredCamera };
                }
                try {
                    return await originalGetUserMedia(constraints);
                } catch (err) {
                    // fallback if exact ID fails
                    if (constraints.video && constraints.video.deviceId) {
                        delete constraints.video.deviceId;
                        return await originalGetUserMedia(constraints);
                    }
                    throw err;
                }
            };

            camera = new window.Camera(videoElement, {
                onFrame: async () => {
                    await faceMesh.send({ image: videoElement });
                },
                width: 640,
                height: 480
            });

            camera.start();

            // Restore original getUserMedia after initialization
            setTimeout(() => {
                navigator.mediaDevices.getUserMedia = originalGetUserMedia;
            }, 3000);

            // Start background worker for running in another tab
            worker = new Worker(new URL('./background/backgroundWorker.js', import.meta.url), { type: 'module' });
            worker.postMessage({ action: 'start', interval: 150 });
            worker.onmessage = async (e) => {
                if (e.data.type === 'tick') {
                    if (document.hidden && faceMesh && videoElement && videoElement.readyState >= 2) {
                        try {
                            // MediaPipe skips processing if the video timestamp hasn't changed (frozen background tab).
                            // Drawing to an offscreen canvas sidesteps the internal timestamp check and prevents it from halting!
                            const offscreen = document.createElement('canvas');
                            offscreen.width = videoElement.videoWidth;
                            offscreen.height = videoElement.videoHeight;
                            const ctx = offscreen.getContext('2d');
                            ctx.drawImage(videoElement, 0, 0, offscreen.width, offscreen.height);
                            await faceMesh.send({ image: offscreen });
                        } catch (err) {
                            console.error("Background processing error:", err);
                        }
                    }
                }
            };
        };

        initEngine();

        return () => {
            if (camera) camera.stop();
            if (faceMesh) faceMesh.close();
            if (worker) {
                worker.postMessage({ action: 'stop' });
                worker.terminate();
            }
        };
    }, [activeTab]); // Re-run if we switch back to dashboard

    // Periodically post the current strain to the backend to build the history log
    useEffect(() => {
        const syncInterval = setInterval(() => {
            const currentStrain = engineState.current?.strain || 0;
            const currentBlinks = engineState.current?.blinks || 0;

            if (activeTab === 'dashboard') {
                fetch('http://localhost:5001/api/strain', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ strain: Math.round(currentStrain), blinkCount: currentBlinks })
                }).catch(() => console.log('Backend sync warning: is server running?'));
            }
        }, 15000); // Sync every 15 seconds

        return () => clearInterval(syncInterval);
    }, [activeTab]);

    // Flash the document title when strain >= 80% and user is in another tab
    useEffect(() => {
        const originalTitle = 'OptiSync OS';
        let flashInterval = null;

        if (strainLevel >= 100) {
            let toggle = false;
            flashInterval = setInterval(() => {
                document.title = toggle ? '🚨 CRITICAL STRAIN - OptiSync' : '⚠️ ACT NOW - OptiSync OS';
                toggle = !toggle;
            }, 800);
        } else if (strainLevel >= 80) {
            let toggle = false;
            flashInterval = setInterval(() => {
                document.title = toggle ? '⚠️ High Eye Strain - OptiSync' : 'OptiSync OS';
                toggle = !toggle;
            }, 1500);
        } else {
            document.title = originalTitle;
        }

        return () => {
            if (flashInterval) clearInterval(flashInterval);
            document.title = originalTitle;
        };
    }, [strainLevel]);

    const ringColor = strainLevel > 75 ? '#ff4757' : strainLevel > 40 ? '#f39c12' : '#2ecc71';
    const statusDisplay = statusText.includes("Tracking")
        ? (strainLevel > 75 ? "Severe Strain" : strainLevel > 40 ? "Strain Building" : "Eyes Rested")
        : statusText;

    const handleTherapyClick = (moduleName) => {
        console.log(`[OptiSync OS] Target Module Activated: ${moduleName}`);

        if (moduleName === 'Palming Audio') {
            setActiveTab('palming');
            setIsModalOpen(false);
            setTherapyView('initial');
            return;
        }

        if (moduleName === '20-20-20 Module') {
            setActiveTab('module20');
            setIsModalOpen(false);
            setTherapyView('initial');
            return;
        }

        if (moduleName === 'Eye Massage') {
            setActiveTab('eyeMassage');
            setIsModalOpen(false);
            setTherapyView('initial');
            return;
        }

        if (moduleName === "Focus Shifter") {
            setActiveModule("Focus Shifter");
            setTherapyView('active');
            if (!isModalOpen) setIsModalOpen(true);
            return;
        }

        if (moduleName === "Infinity Tracker") {
            setActiveModule("Infinity Tracker");
            setTherapyView('active');
            if (!isModalOpen) setIsModalOpen(true);
            return;
        }

        if (moduleName === "Corner Taps") {
            setActiveModule("Corner Taps");
            setTherapyView('active');
            if (!isModalOpen) setIsModalOpen(true);
            return;
        }

        // Hackathon Simulation: Fake a successful session completion for unbuilt modules
        alert(`[SIMULATION RUNNING] Starting virtual session: ${moduleName}...\n\n(Click OK to fast-forward 5 minutes and simulate successful completion)`);

        setIsModalOpen(false);
        setTherapyView('initial');
        setActiveModule(null);

        // They completed the therapy, so strain actually drops to 0 mathematically!
        engineState.current.strain = 0;
        engineState.current.modalTriggered = false;
        engineState.current.criticalTriggered = false;
        engineState.current.warningToastShownAt = 0;
        engineState.current.modalCooldownUntil = Date.now() + 60000; // 1 minute grace period
        setStrainLevel(0);
        window.dispatchEvent(new CustomEvent('OPTISYNC_STRAIN_PING', { detail: { strain: 0 } }));
        window.postMessage({ type: 'OPTISYNC_STRAIN_UPDATE', strain: 0 }, "*");

        setTimeout(() => alert("✅ Therapy Sequence Complete!\n\nYour eye strain has been safely reset to 0%."), 500);
    };

    const abortSession = () => {
        setTherapyView('look_away');
        engineState.current.lookAwayActive = true;
        engineState.current.lookAwayTimeLeft = 45;
        setLookAwayDisplay(45);
    };

    return (
        <div className="dashboard-container">
            {/* Link for Chrome Extension Detection */}
            <div id="optisync-master-link" style={{ display: 'none' }}></div>

            {/* Global In-App Strain Toast */}
            <StrainToast toast={toast} onClose={() => setToast(null)} />

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="brand">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#1abc9c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 17L12 22L22 17" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12L12 17L22 12" stroke="#1abc9c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h1>OptiSync OS</h1>
                </div>

                <ul className="nav-links">
                    <li className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <span>⌘</span> Dashboard
                    </li>
                    <li className={`nav-link ${activeTab === 'therapy' ? 'active' : ''}`} onClick={() => setActiveTab('therapy')}>
                        <span>✦</span> Therapy Modules
                    </li>
                    <li className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                        <span>◷</span> History Log
                    </li>
                    <li className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                        <span>⚙</span> Settings
                    </li>
                </ul>

                <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: backendStatus === 'live' ? '#2ecc71' : backendStatus === 'checking' ? '#f1c40f' : '#ff4757',
                            boxShadow: `0 0 8px ${backendStatus === 'live' ? '#2ecc71' : backendStatus === 'checking' ? '#f1c40f' : '#ff4757'}`
                        }}></div>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Backend {backendStatus === 'live' ? 'Live' : backendStatus === 'checking' ? 'Connecting...' : 'Offline'}
                        </span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="header">
                    <div>
                        <h2>Welcome back.</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Cognitive operating system active.</p>
                    </div>
                    <button
                        className={`btn-primary connection-btn ${connectionStatus}`}
                        onClick={async () => {
                            setConnectionStatus('connecting');
                            try {
                                const granted = await NotificationManager.requestPermission();
                                if (granted) {
                                    setConnectionStatus('active');
                                    NotificationManager.sendTestAlert();
                                    const roundedS = Math.round(strainLevel);
                                    window.dispatchEvent(new CustomEvent('OPTISYNC_STRAIN_PING', { detail: { strain: roundedS } }));
                                    window.postMessage({ type: 'OPTISYNC_STRAIN_UPDATE', strain: roundedS }, "*");
                                } else {
                                    setConnectionStatus('error');
                                    console.error("Notification permission denied.");
                                }
                            } catch (err) {
                                console.error("Link extension error:", err);
                                setConnectionStatus('error');
                            }
                        }}
                        style={{
                            background: connectionStatus === 'active' ? '#2ecc71' : connectionStatus === 'error' ? '#ff4757' : 'linear-gradient(135deg, #1abc9c, #2ecc71)',
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                        {connectionStatus === 'idle' && <><span>🔗</span> Link Chrome Extension &amp; Enable Alerts</>}
                        {connectionStatus === 'connecting' && <><span>⌛</span> Requesting Permissions...</>}
                        {connectionStatus === 'active' && <><span>✅</span> OptiSync Linked &amp; Active</>}
                        {connectionStatus === 'error' && <><span>❌</span> Permission Denied (Check Settings)</>}
                    </button>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="main-grid">

                        {/* Webcam Frame */}
                        <div className="glass-card webcam-card">
                            <h3>Cognitive Sync Camera</h3>
                            <div className="video-container" style={{ position: 'relative' }}>
                                <video ref={videoRef} autoPlay playsInline className="webcam-video"></video>
                                <div className="webcam-status-overlay" style={{ background: statusText.includes("Tracking") ? "rgba(46, 204, 113, 0.6)" : "rgba(255, 71, 87, 0.8)" }}>
                                    {statusText}
                                </div>
                            </div>

                            <PostureCalibration
                                currentDistance={proximity.currentDistance}
                                restingDistance={proximity.restingDistance}
                                safeThreshold={proximity.safeThreshold}
                                onCalibrate={proximity.calibrate}
                                getRecommendation={proximity.getRecommendation}
                            />
                        </div>

                        {/* Premium Metrics Panel */}
                        <div className="glass-card metrics-panel">
                            <h3 style={{ marginBottom: '2rem', fontSize: '1.4rem', color: '#fff', fontWeight: '500' }}>Live Diagnostics</h3>

                            <div className="metrics-grid">
                                {/* Block 1: Blinks Per Minute */}
                                <div className="diagnostic-block">
                                    <div className="diag-icon">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                                    </div>
                                    <div className="diag-content">
                                        <h4>Blinks Per Min</h4>
                                        <div className="diag-value huge-text">{blinkRate}</div>
                                    </div>
                                </div>

                                {/* Block 2: EAR Core */}
                                <div className="diagnostic-block">
                                    <div className="diag-icon" style={{ background: 'rgba(26, 188, 156, 0.15)', color: '#1abc9c', border: '1px solid rgba(26, 188, 156, 0.3)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                                    </div>
                                    <div className="diag-content">
                                        <h4>Live EAR Ratio</h4>
                                        <div className="diag-value huge-text" style={{ color: '#1abc9c' }}>{liveEAR}</div>
                                    </div>
                                </div>

                                {/* Block 3: Proximity Sensor */}
                                <ProximitySensor
                                    currentDistance={proximity.currentDistance}
                                    safeThreshold={proximity.safeThreshold}
                                    proximityStatus={proximity.proximityStatus}
                                    proximityTimeLeft={proximity.proximityTimeLeft}
                                />
                            </div>

                            {/* Block 4: Status Module */}
                            <div className="diagnostic-block status-block-premium" style={{ borderColor: proximity.proximityStatus === 'HAZARD' ? '#ff4757' : ringColor, background: `rgba(255,255,255,0.02)` }}>
                                <div className="diag-content" style={{ width: '100%', textAlign: 'center' }}>
                                    <h4 style={{ letterSpacing: '2px', color: 'rgba(255,255,255,0.5)' }}>SYSTEM STATUS OVERRIDE</h4>
                                    <div className="status-label" style={{ color: proximity.proximityStatus === 'HAZARD' ? '#ff4757' : ringColor, fontSize: '1.8rem', margin: '10px 0', textShadow: `0 0 15px ${proximity.proximityStatus === 'HAZARD' ? '#ff4757' : ringColor}80`, fontFamily: 'Outfit', fontWeight: 700 }}>{statusDisplay}</div>
                                </div>
                            </div>

                            {/* Strain Engine Output */}
                            <div className="premium-strain-box">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                                    <div className="strain-header">
                                        <h4 style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Cognitive Strain Level</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>Predictive Burnout Model</p>
                                    </div>
                                    <div className="strain-percent" style={{ color: ringColor, fontSize: '3rem', fontFamily: 'Outfit', fontWeight: 800, lineHeight: '0.8', textShadow: `0 0 20px ${ringColor}80` }}>{Math.round(strainLevel)}<span style={{ fontSize: '1.5rem', marginLeft: '2px' }}>%</span></div>
                                </div>
                                <div className="progress-bar-container thick-progress">
                                    <div className="progress-bar-fill" style={{ width: `${strainLevel}%`, background: ringColor, boxShadow: `0 0 20px ${ringColor}` }}></div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                                <button className="btn-primary custom-test-btn" onClick={() => setIsModalOpen(true)}>
                                    Test Modal Trigger (80%)
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'therapy' && (
                    <div>
                        <h2 style={{ marginBottom: '1rem' }}>Therapy Modules Library</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Select a cognitive reset protocol below to rebuild focus.</p>

                        <div className="therapy-grid">
                            <div className="therapy-card" onClick={() => handleTherapyClick('Focus Shifter')}>
                                <div className="icon">🎮</div>
                                <h3>Focus Shifter</h3>
                                <p>Dynamic visual puzzle designed to shift depth perception.</p>
                            </div>
                            <div className="therapy-card" onClick={() => handleTherapyClick('Infinity Tracker')}>
                                <div className="icon">♾️</div>
                                <h3>Infinity Tracker</h3>
                                <p>Follow the floating orbital path to exercise eye tracking.</p>
                            </div>
                            <div className="therapy-card" onClick={() => handleTherapyClick('Corner Taps')}>
                                <div className="icon">🎯</div>
                                <h3>Corner Taps</h3>
                                <p>Peripheral vision reaction game for eye strain reset.</p>
                            </div>
                            <div className="therapy-card" onClick={() => handleTherapyClick('Palming Audio')}>
                                <div className="icon">🎧</div>
                                <h3>Palming Audio</h3>
                                <p>Guided sensory deprivation to reset rod &amp; cone fatigue.</p>
                            </div>
                            <div className="therapy-card" onClick={() => handleTherapyClick('20-20-20 Module')}>
                                <div className="icon">⏱️</div>
                                <h3>20-20-20 Module</h3>
                                <p>Look 20 feet away for 20 seconds. We monitor via webcam.</p>
                            </div>
                            <div className="therapy-card" onClick={() => handleTherapyClick('Eye Massage')}>
                                <div className="icon">💆</div>
                                <h3>Eye Massage</h3>
                                <p>Follow along acupressure points to release tension.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'palming' && (
                    <PalmingAudio
                        onComplete={() => {
                            setActiveTab('therapy');
                            engineState.current.strain = 0;
                            engineState.current.modalTriggered = false;
                            engineState.current.modalCooldownUntil = Date.now() + 60000;
                            setStrainLevel(0);
                            alert("✅ Therapy Sequence Complete!\n\nYour eye strain has been safely reset to 0%.");
                        }}
                        onCancel={() => {
                            setActiveTab('therapy');
                        }}
                    />
                )}

                {activeTab === 'module20' && (
                    <Module20
                        onComplete={() => {
                            setActiveTab('therapy');
                            engineState.current.strain = 0;
                            engineState.current.modalTriggered = false;
                            engineState.current.modalCooldownUntil = Date.now() + 60000;
                            setStrainLevel(0);
                            alert("✅ 20-20-20 Rule Complete!\n\nYour eye strain has been safely reset to 0%.");
                        }}
                        onCancel={() => {
                            setActiveTab('therapy');
                        }}
                    />
                )}

                {activeTab === 'eyeMassage' && (
                    <EyeMassage
                        onComplete={() => {
                            setActiveTab('therapy');
                            engineState.current.strain = 0;
                            engineState.current.modalTriggered = false;
                            engineState.current.modalCooldownUntil = Date.now() + 60000;
                            setStrainLevel(0);
                            alert("✅ Acupressure Eye Massage Complete!\n\nYour eye strain has been safely reset to 0%.");
                        }}
                        onCancel={() => {
                            setActiveTab('therapy');
                        }}
                    />
                )}

                {activeTab === 'history' && (
                    <HistoryLog />
                )}

                {activeTab === 'settings' && (
                    <Setting
                        isLightMode={isLightMode}
                        onModeToggle={setIsLightMode}
                    />
                )}
            </main>

            {/* 80% Full Screen Modal overlay natively in React */}
            {isModalOpen && (
                <div className="fullscreen-modal">
                    <div className="modal-content-wrapper">
                        {therapyView === 'initial' ? (
                            <>
                                <h1 className="danger-glow">Severe Eye Strain Detected.</h1>
                                <p>Your blink rate has dropped significantly. Action is required to protect your cognitive load.</p>
                                <button className="btn-huge mt-4" onClick={() => setTherapyView('menu')}>Enter Therapy Session</button>
                                <button className="btn-text" onClick={abortSession}>Close and Resume (Not Recommended)</button>
                            </>
                        ) : therapyView === 'menu' ? (
                            <div className="therapy-menu-view">
                                <h2>Select Therapy Protocol</h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>Completing a module will reset your strain levels.</p>

                                <div className="modal-columns">
                                    <div className="modal-col">
                                        <h3>🎮 Digital Therapy</h3>
                                        <button className="therapy-option-btn" onClick={() => handleTherapyClick("Focus Shifter")}>Focus Shifter</button>
                                        <button className="therapy-option-btn" onClick={() => handleTherapyClick("Infinity Tracker")}>Infinity Tracker</button>
                                        <button className="therapy-option-btn" onClick={() => handleTherapyClick("Corner Taps")}>Corner Taps</button>
                                    </div>
                                    <div className="modal-col">
                                        <h3>🧘 Natural Therapy</h3>
                                        <button className="therapy-option-btn" onClick={() => handleTherapyClick("Palming Audio")}>Palming Audio</button>
                                        <button className="therapy-option-btn" onClick={() => handleTherapyClick("20-20-20 Rule")}>20-20-20 Rule</button>
                                        <button className="therapy-option-btn" onClick={() => handleTherapyClick("Eye Massage")}>Eye Massage</button>
                                    </div>
                                </div>
                                <button className="btn-text" onClick={abortSession} style={{ marginTop: '3rem' }}>Abort Session (Return to work)</button>
                            </div>
                        ) : therapyView === 'look_away' ? (
                            <div className="look-away-view" style={{ textAlign: 'center', padding: '2rem' }}>
                                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#fff' }}>Rest Your Eyes</h2>
                                <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)' }}>
                                    Please look away from the screen for 45 seconds to naturally recover.
                                </p>
                                <div style={{ marginTop: '3rem', fontSize: '6rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif', color: lookAwayDisplay < 45 ? '#2ecc71' : '#f39c12', textShadow: `0 0 30px ${lookAwayDisplay < 45 ? 'rgba(46, 204, 113, 0.4)' : 'rgba(243, 156, 18, 0.4)'}` }}>
                                    {lookAwayDisplay.toFixed(1)}s
                                </div>
                                <p style={{ marginTop: '2rem', fontStyle: 'italic', opacity: 0.8, color: '#fff' }}>
                                    {lookAwayDisplay === 45 ? "Timer will start when you look away from the camera." : "Great! Keep looking away... Timer pauses if you look back."}
                                </p>
                                <button className="btn-text mt-4" onClick={() => {
                                    engineState.current.lookAwayActive = false;
                                    engineState.current.modalCooldownUntil = Date.now() + 120 * 1000;
                                    engineState.current.modalTriggered = false;
                                    setIsModalOpen(false);
                                    setTherapyView('initial');
                                }} style={{ marginTop: '3rem', color: '#ff4757' }}>Force Quit (Not Recommended)</button>
                            </div>
                        ) : therapyView === 'proximity_hazard' ? (
                            <div className="proximity-hazard-view" style={{ textAlign: 'center', padding: '2rem' }}>
                                <h1 className="danger-glow pulse-red">PROXIMITY HAZARD</h1>
                                <div className="warning-icon-large">⚠️</div>
                                <p style={{ fontSize: '1.4rem', color: '#fff', maxWidth: '600px', margin: '0 auto 2rem' }}>
                                    You have been dangerously close to the screen (&lt; 25cm) for 90 seconds.
                                    This causes significant **Ciliary Muscle contraction** and long-term vision damage.
                                </p>
                                <h2 style={{ color: '#ff4757', fontSize: '2rem', marginBottom: '2rem' }}>Please move back at least 50cm to continue.</h2>
                                <button className="btn-huge" onClick={() => {
                                    setIsModalOpen(false);
                                    setTherapyView('initial');
                                    engineState.current.proximityStartTime = null;
                                    engineState.current.proximityAlertTriggered = false;
                                }}>I have adjusted my position</button>
                            </div>
                        ) : (
                            <>
                                {activeModule === "Focus Shifter" && (
                                    <FocusShifter
                                        onComplete={() => {
                                            engineState.current.strain = 0;
                                            engineState.current.modalTriggered = false;
                                            engineState.current.modalCooldownUntil = Date.now() + 60000;
                                            setStrainLevel(0);
                                            setIsModalOpen(false);
                                            setTherapyView('initial');
                                            setActiveModule(null);
                                        }}
                                        onCancel={abortSession}
                                    />
                                )}
                                {activeModule === "Infinity Tracker" && (
                                    <InfinityTracker
                                        onComplete={() => {
                                            engineState.current.strain = 0;
                                            engineState.current.modalTriggered = false;
                                            engineState.current.modalCooldownUntil = Date.now() + 60000;
                                            setStrainLevel(0);
                                            setIsModalOpen(false);
                                            setTherapyView('initial');
                                            setActiveModule(null);
                                        }}
                                        onCancel={abortSession}
                                    />
                                )}
                                {activeModule === "Corner Taps" && (
                                    <CornerTaps
                                        onComplete={() => {
                                            engineState.current.strain = 0;
                                            engineState.current.modalTriggered = false;
                                            engineState.current.modalCooldownUntil = Date.now() + 60000;
                                            setStrainLevel(0);
                                            setIsModalOpen(false);
                                            setTherapyView('initial');
                                            setActiveModule(null);
                                        }}
                                        onCancel={abortSession}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* AI Health Assistant Chatbot */}
            <AIChatbot
                strainLevel={strainLevel}
                blinkRate={blinkRate}
                statusText={statusText}
                postureStatus={proximity.proximityStatus}
                currentDistance={proximity.currentDistance}
            />
        </div>
    );
}

export default App;
