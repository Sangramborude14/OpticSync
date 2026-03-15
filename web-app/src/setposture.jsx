import React, { useState, useEffect, useRef } from 'react';
import { NotificationManager } from './notifications/NotificationManager';

// ── MediaPipe Landmark Indices ────────────────────────────────────
const INNER_EYE_LEFT  = 133;
const INNER_EYE_RIGHT = 362;
const NOSE_TIP        = 1;
const CHIN            = 152;
const LEFT_EAR        = 234;
const RIGHT_EAR       = 454;
const FOREHEAD        = 10;

function calculateDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Advanced Local Posture Analysis
 * Compares current landmarks against calibrated baselines.
 */
function analyzePosture(landmarks, currentDist, baselines) {
    if (!landmarks || landmarks.length === 0) return null;

    const leftEar = landmarks[LEFT_EAR];
    const rightEar = landmarks[RIGHT_EAR];
    const nose = landmarks[NOSE_TIP];
    const chin = landmarks[CHIN];
    const forehead = landmarks[FOREHEAD];

    // Current Values
    const currentTilt = (leftEar.y - rightEar.y) * 100; // roll
    const noseToChin = calculateDistance(nose, chin);
    const headHeight = calculateDistance(forehead, chin);
    const currentPitch = headHeight > 0 ? (noseToChin / headHeight) : 0.5;

    // Use baselines or defaults
    const basePitch = baselines.pitch || 0.38;
    const baseTilt = baselines.tilt || 0;

    let score = 100;
    let issues = [];
    let grade = 'A';

    // 1. Check Pitch (Slouching / Chin Tucked)
    const pitchDiff = currentPitch - basePitch;
    if (pitchDiff > 0.08) {
        score -= 25;
        issues.push({ 
            label: "Chin Tucked (Slouching)", 
            tip: "Your chin is too low. Raise your monitor or laptop stand so the top of the screen is at eye level." 
        });
    } else if (pitchDiff < -0.08) {
        score -= 20;
        issues.push({ 
            label: "Looking Up", 
            tip: "You are looking too high. Lower your screen to avoid neck strain." 
        });
    }

    // 2. Check Tilt (Head Leaning)
    const tiltDiff = Math.abs(currentTilt - baseTilt);
    if (tiltDiff > 6) {
        score -= 20;
        issues.push({ 
            label: "Head Leaning", 
            tip: "Your head is tilted. Try to keep your head centered and avoid leaning on one arm." 
        });
    }

    // 3. Proximity Check
    if (currentDist < 35) {
        score -= 30;
        issues.push({ 
            label: "Too Close", 
            tip: "Maintain at least 50-70cm (one arm's length) from the screen to reduce eye strain." 
        });
    }

    // 4. Face Centering
    const faceX = nose.x;
    if (faceX < 0.35 || faceX > 0.65) {
        score -= 15;
        issues.push({ 
            label: "Off-Center", 
            tip: "Sit directly in front of your workstation to avoid twisting your neck." 
        });
    }

    score = Math.max(0, score);
    if (score < 60) grade = 'F';
    else if (score < 75) grade = 'C';
    else if (score < 90) grade = 'B';

    return {
        score,
        grade,
        primaryIssue: issues.length > 0 ? issues[0].label : "Perfect Alignment",
        recommendation: issues.length > 0 ? issues[0].tip : "Your posture is excellent! Keep maintaining this position.",
        optimalDist: currentDist > 50 ? currentDist : 60,
        safeThreshold: Math.max(25, currentDist - 15),
        tips: issues.length > 0 ? issues.map(i => i.tip) : [
            "Keep the monitor at arm's length.",
            "Top of the screen should be at eye level.",
            "Take a 20-second break every 20 minutes."
        ]
    };
}

// ── Custom Hook: useProximity ─────────────────────────────────────
export const useProximity = (onHazardTriggered) => {
    const [restingDistance, setRestingDistance] = useState(() =>
        Number(localStorage.getItem('optisync_resting_dist')) || 50
    );
    const [safeThreshold, setSafeThreshold] = useState(() =>
        Number(localStorage.getItem('optisync_safe_threshold')) || 35
    );
    const [baselines, setBaselines] = useState(() => ({
        pitch: Number(localStorage.getItem('optisync_base_pitch')) || 0.38,
        tilt: Number(localStorage.getItem('optisync_base_tilt')) || 0
    }));

    const [currentDistance, setCurrentDistance] = useState(null);
    const [proximityStatus, setProximityStatus] = useState('SAFE');
    const [proximityDuration, setProximityDuration] = useState(() =>
        Number(localStorage.getItem('optisync_proximity_duration')) || 30
    );
    const [proximityTimeLeft, setProximityTimeLeft] = useState(proximityDuration);

    const latestLandmarks = useRef(null);
    const engineRef = useRef({ startTime: null, alertTriggered: false });

    // Keep state in sync with localStorage if it changes elsewhere
    useEffect(() => {
        const checkStorage = () => {
            const stored = Number(localStorage.getItem('optisync_proximity_duration')) || 30;
            if (stored !== proximityDuration) {
                setProximityDuration(stored);
                if (proximityStatus === 'SAFE') setProximityTimeLeft(stored);
            }
        };
        window.addEventListener('storage', checkStorage);
        const interval = setInterval(checkStorage, 1000); // Polling as backup for same-tab changes
        return () => {
            window.removeEventListener('storage', checkStorage);
            clearInterval(interval);
        };
    }, [proximityDuration, proximityStatus]);

    useEffect(() => {
        const handleLandmarks = (event) => {
            const landmarks = event.detail;
            if (!landmarks || landmarks.length === 0) {
                setCurrentDistance(null);
                latestLandmarks.current = null;
                return;
            }

            latestLandmarks.current = landmarks;
            const pixelDist = calculateDistance(landmarks[INNER_EYE_LEFT], landmarks[INNER_EYE_RIGHT]);
            const estimatedCm = Math.round(5.5 / pixelDist);
            setCurrentDistance(estimatedCm);

            if (estimatedCm < safeThreshold) {
                const now = Date.now();
                if (!engineRef.current.startTime) engineRef.current.startTime = now;
                const elapsed = (now - engineRef.current.startTime) / 1000;
                const remaining = Math.max(0, proximityDuration - elapsed);
                setProximityTimeLeft(Math.floor(remaining));
                setProximityStatus(remaining < 10 ? 'HAZARD' : 'WARNING');

                if (remaining <= 0 && !engineRef.current.alertTriggered) {
                    engineRef.current.alertTriggered = true;
                    NotificationManager.sendProximityAlert();
                    if (onHazardTriggered) onHazardTriggered(estimatedCm);
                }
            } else {
                engineRef.current.startTime = null;
                engineRef.current.alertTriggered = false;
                setProximityTimeLeft(proximityDuration);
                setProximityStatus('SAFE');
            }
        };

        window.addEventListener('OPTISYNC_LANDMARKS', handleLandmarks);
        return () => window.removeEventListener('OPTISYNC_LANDMARKS', handleLandmarks);
    }, [safeThreshold, onHazardTriggered]);

    const calibrate = () => {
        if (latestLandmarks.current && currentDistance) {
            const landmarks = latestLandmarks.current;
            const leftEar = landmarks[LEFT_EAR];
            const rightEar = landmarks[RIGHT_EAR];
            const nose = landmarks[NOSE_TIP];
            const chin = landmarks[CHIN];
            const forehead = landmarks[FOREHEAD];

            const newTilt = (leftEar.y - rightEar.y) * 100;
            const headHeight = calculateDistance(forehead, chin);
            const newPitch = headHeight > 0 ? (calculateDistance(nose, chin) / headHeight) : 0.38;

            setRestingDistance(currentDistance);
            const newSafe = Math.max(25, currentDistance - 15);
            setSafeThreshold(newSafe);
            setBaselines({ pitch: newPitch, tilt: newTilt });

            localStorage.setItem('optisync_resting_dist', currentDistance);
            localStorage.setItem('optisync_safe_threshold', newSafe);
            localStorage.setItem('optisync_base_pitch', newPitch);
            localStorage.setItem('optisync_base_tilt', newTilt);
            
            return true;
        }
        return false;
    };

    return {
        currentDistance, restingDistance, safeThreshold,
        proximityStatus, proximityTimeLeft, calibrate,
        getRecommendation: () => analyzePosture(latestLandmarks.current, currentDistance, baselines)
    };
};

// ── Smart Report Panel ───────────────────────────────────────────
const SmartReportPanel = ({ report, onApply, onDismiss }) => {
    if (!report) return null;

    const gradeColor = report.score > 85 ? '#2ecc71' : report.score > 70 ? '#f1c40f' : '#ff4757';

    return (
        <div className="gemini-panel" style={{
            background: 'rgba(15, 16, 21, 0.95)',
            border: `1px solid ${gradeColor}80`,
            borderRadius: '20px',
            padding: '24px',
            marginTop: '20px',
            boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${gradeColor}20`,
            animation: 'slideUp 0.4s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.2rem' }}>Ergonomic Health Report</h3>
                <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: gradeColor, fontFamily: 'Outfit' }}>{report.score}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4, letterSpacing: '1px' }}>POSTURE SCORE</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: gradeColor, fontFamily: 'Outfit' }}>{report.grade}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.4, letterSpacing: '1px' }}>ERGO GRADE</div>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: gradeColor, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {report.score === 100 ? 'Status' : 'Corrective Action Required'}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '12px', fontSize: '0.95rem', lineHeight: 1.5, color: '#fff' }}>
                    <strong>{report.primaryIssue}:</strong> {report.recommendation}
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Practical Tips
                </div>
                {report.tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                        <span style={{ color: gradeColor }}>•</span> {tip}
                    </div>
                ))}
            </div>

            <button 
                className="btn-calibrate" 
                onClick={() => onApply(report.optimalDist, report.safeThreshold)}
                style={{ width: '100%', background: gradeColor, color: '#000', fontWeight: 800 }}
            >
                ✅ Lock-in These Settings
            </button>
        </div>
    );
};

// ── PostureCalibration component ──────────────────────────────────
export const PostureCalibration = ({
    currentDistance, restingDistance, safeThreshold,
    onCalibrate, getRecommendation
}) => {
    const [report, setReport] = useState(null);
    const [isCalibrating, setIsCalibrating] = useState(false);

    const handleSmartAnalyze = () => {
        const result = getRecommendation();
        if (result) setReport(result);
        else alert("⚠️ Unable to analyze. Please ensure your face is fully visible in the camera.");
    };

    const handleManualCalibrate = () => {
        setIsCalibrating(true);
        const success = onCalibrate();
        if (success) {
            setTimeout(() => {
                setIsCalibrating(false);
                alert("✅ Baseline Saved!\nYour perfect position is now the reference for all future analysis.");
            }, 500);
        } else {
            setIsCalibrating(false);
            alert("❌ Setup Failed. Please center your face in the webcam first.");
        }
    };

    const handleApply = (dist, thresh) => {
        localStorage.setItem('optisync_resting_dist', dist);
        localStorage.setItem('optisync_safe_threshold', thresh);
        setReport(null);
        alert("✅ Recommended thresholds applied. Your proximity alerts are now optimized.");
    };

    return (
        <div className="calibration-section">
            <div className="calib-info">
                <div className="calib-item">
                    <span className="label">Resting</span>
                    <strong>{restingDistance}cm</strong>
                </div>
                <div className="calib-item">
                    <span className="label">Safe Limit</span>
                    <strong style={{ color: '#ff4757' }}>{safeThreshold}cm</strong>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                    className="btn-calibrate" 
                    onClick={handleManualCalibrate}
                    disabled={!currentDistance || isCalibrating}
                    style={{ flex: 1 }}
                >
                    {isCalibrating ? '⌛ Saving...' : '🎯 Set Perfect Posture'}
                </button>

                <button 
                    className="btn-calibrate" 
                    onClick={handleSmartAnalyze}
                    disabled={!currentDistance}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                    🔍 Run Analysis
                </button>
            </div>

            {report && (
                <SmartReportPanel 
                    report={report} 
                    onDismiss={() => setReport(null)}
                    onApply={handleApply}
                />
            )}

            <p className="calib-hint">1. Sit in your <b>best</b> posture. <br/> 2. Click <b>"Set Perfect Posture"</b> to calibrate. <br/> 3. Click <b>"Run Analysis"</b> anytime to check for slouching.</p>
        </div>
    );
};

// ── ProximitySensor component ─────────────────────────────────────
export const ProximitySensor = ({ currentDistance, safeThreshold, proximityStatus, proximityTimeLeft }) => (
    <div className={`diagnostic-block proximity-block ${proximityStatus.toLowerCase()}`}>
        <div className="diag-icon" style={{ 
            background: proximityStatus === 'SAFE' ? 'rgba(46, 204, 113, 0.1)' : proximityStatus === 'WARNING' ? 'rgba(243, 156, 18, 0.1)' : 'rgba(255, 71, 87, 0.1)',
            color: proximityStatus === 'SAFE' ? '#2ecc71' : proximityStatus === 'WARNING' ? '#f39c12' : '#ff4757'
        }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20M7.07 7.07l1.41 1.41M15.52 15.52l1.41 1.41M2 12h2M20 12h2M12 2v2M12 20v2M7.07 16.93l1.41-1.41M15.52 8.48l1.41-1.41" />
            </svg>
        </div>
        
        <div className="diag-content" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4>Screen Proximity</h4>
                {proximityStatus !== 'SAFE' && (
                    <span className="proximity-timer-badge">{proximityTimeLeft}s</span>
                )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span className="huge-text" style={{ 
                    fontSize: '2.5rem',
                    color: proximityStatus === 'SAFE' ? '#2ecc71' : proximityStatus === 'WARNING' ? '#f39c12' : '#ff4757'
                }}>{currentDistance || "--"}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>CM</span>
            </div>
            
            <div style={{ 
                marginTop: '12px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ 
                    position: 'absolute', height: '100%', background: proximityStatus === 'SAFE' ? '#2ecc71' : proximityStatus === 'WARNING' ? '#f39c12' : '#ff4757',
                    width: `${Math.min(100, (currentDistance / 100) * 100)}%`, transition: 'width 0.4s ease'
                }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>NEAR</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, color: '#ff4757' }}>SAFE: {safeThreshold}CM</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>FAR</span>
            </div>
        </div>
    </div>
);
