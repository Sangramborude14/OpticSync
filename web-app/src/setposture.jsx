import React, { useState, useEffect, useRef } from 'react';
import { NotificationManager } from './notifications/NotificationManager';

const INNER_EYE_LEFT = 133;
const INNER_EYE_RIGHT = 362;

function calculateDistance(p1, p2) {
    if (!p1 || !p2) return 0;
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Custom Hook: useProximity
 * Encapsulates all distance tracking and alert logic.
 */
export const useProximity = (onHazardTriggered) => {
    const [restingDistance, setRestingDistance] = useState(() => 
        Number(localStorage.getItem('optisync_resting_dist')) || 50
    );
    const [safeThreshold, setSafeThreshold] = useState(() => 
        Number(localStorage.getItem('optisync_safe_threshold')) || 25
    );
    const [currentDistance, setCurrentDistance] = useState(null);
    const [proximityStatus, setProximityStatus] = useState('SAFE');
    const [proximityTimeLeft, setProximityTimeLeft] = useState(90);

    const engineRef = useRef({
        startTime: null,
        alertTriggered: false
    });

    useEffect(() => {
        const handleLandmarks = (event) => {
            const landmarks = event.detail;
            if (!landmarks || landmarks.length === 0) {
                setCurrentDistance(null);
                return;
            }

            const now = Date.now();
            const pixelDist = calculateDistance(landmarks[INNER_EYE_LEFT], landmarks[INNER_EYE_RIGHT]);
            const estimatedCm = Math.round(5.5 / pixelDist);
            setCurrentDistance(estimatedCm);

            if (estimatedCm < safeThreshold) {
                if (!engineRef.current.startTime) engineRef.current.startTime = now;
                const elapsed = (now - engineRef.current.startTime) / 1000;
                const remaining = Math.max(0, 90 - elapsed);
                setProximityTimeLeft(Math.floor(remaining));
                setProximityStatus(remaining < 20 ? 'HAZARD' : 'WARNING');

                if (remaining <= 0 && !engineRef.current.alertTriggered) {
                    engineRef.current.alertTriggered = true;
                    NotificationManager.sendProximityAlert();
                    if (onHazardTriggered) onHazardTriggered(estimatedCm);
                }
            } else {
                engineRef.current.startTime = null;
                engineRef.current.alertTriggered = false;
                setProximityTimeLeft(90);
                setProximityStatus('SAFE');
            }
        };

        window.addEventListener('OPTISYNC_LANDMARKS', handleLandmarks);
        return () => window.removeEventListener('OPTISYNC_LANDMARKS', handleLandmarks);
    }, [safeThreshold, onHazardTriggered]);

    const calibrate = () => {
        if (currentDistance) {
            const newResting = currentDistance;
            const newSafe = Math.max(25, newResting - 15);
            setRestingDistance(newResting);
            setSafeThreshold(newSafe);
            localStorage.setItem('optisync_resting_dist', newResting);
            localStorage.setItem('optisync_safe_threshold', newSafe);
            alert(`✅ Posture Calibrated!\n\nResting: ${newResting}cm\nSafe Threshold: ${newSafe}cm`);
        }
    };

    return { 
        currentDistance, restingDistance, safeThreshold, 
        proximityStatus, proximityTimeLeft, calibrate 
    };
};

/**
 * UI Component: PostureCalibration
 */
export const PostureCalibration = ({ currentDistance, restingDistance, safeThreshold, onCalibrate }) => (
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
        
        <button 
            className="btn-calibrate" 
            onClick={onCalibrate}
            disabled={!currentDistance}
        >
            🎯 Set Current Posture as Resting
        </button>
        
        <p className="calib-hint">Sit naturally at your desk and click to calibrate your safe distance range.</p>
    </div>
);

/**
 * UI Component: ProximitySensor
 */
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
                marginTop: '12px', 
                height: '4px', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    position: 'absolute',
                    height: '100%',
                    background: proximityStatus === 'SAFE' ? '#2ecc71' : proximityStatus === 'WARNING' ? '#f39c12' : '#ff4757',
                    width: `${Math.min(100, (currentDistance / 100) * 100)}%`,
                    transition: 'width 0.4s ease'
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
