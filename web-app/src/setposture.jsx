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
    <div className="calibration-box">
        <div className="calib-header">
            <div className="calib-stat">
                <span className="label">Resting</span>
                <span className="value teal-glow">{restingDistance}cm</span>
            </div>
            <div className="calib-divider"></div>
            <div className="calib-stat">
                <span className="label">Safe Limit</span>
                <span className="value danger-glow-small">{safeThreshold}cm</span>
            </div>
        </div>
        
        <button 
            className="btn-calibrate-premium" 
            onClick={onCalibrate}
            disabled={!currentDistance}
        >
            <span className="btn-icon">🎯</span> Set Resting Posture
        </button>
        
        <div className="calib-footer">
            <p>Sit naturally and click to calibrate your safe distance</p>
        </div>
    </div>
);

/**
 * UI Component: ProximitySensor
 */
export const ProximitySensor = ({ currentDistance, safeThreshold, proximityStatus, proximityTimeLeft }) => (
    <div className={`diagnostic-block proximity-card-premium ${proximityStatus.toLowerCase()}`}>
        <div className="diag-icon-wrapper">
            <div className="diag-icon-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M2 12h20M7.07 7.07l1.41 1.41M15.52 15.52l1.41 1.41M2 12h2M20 12h2M12 2v2M12 20v2M7.07 16.93l1.41-1.41M15.52 8.48l1.41-1.41" />
                </svg>
            </div>
        </div>
        
        <div className="diag-content">
            <div className="diag-header-row">
                <h4>Screen distance</h4>
                {proximityStatus !== 'SAFE' && (
                    <div className="hazard-badge">
                        {proximityTimeLeft}s Remaining
                    </div>
                )}
            </div>
            
            <div className="dist-value-container">
                <span className="dist-number">{currentDistance || "--"}</span>
                <span className="dist-unit">CM</span>
            </div>
            
            <div className="threshold-indicator">
                <div className="track">
                    <div 
                        className="thumb" 
                        style={{ left: `${Math.min(100, (currentDistance / 150) * 100)}%` }}
                    ></div>
                    <div 
                        className="safe-zone-marker" 
                        style={{ left: `${(safeThreshold / 150) * 100}%` }}
                    ></div>
                </div>
                <span className="threshold-label">Threshold: {safeThreshold}cm</span>
            </div>
        </div>
    </div>
);
