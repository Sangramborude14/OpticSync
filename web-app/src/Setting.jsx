import React, { useState, useEffect } from 'react';

const Setting = ({ isLightMode, onModeToggle }) => {
    const [cameras, setCameras] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState(localStorage.getItem('preferredCamera') || '');
    const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem('notificationsEnabled') !== 'false');
    const [proximityDuration, setProximityDuration] = useState(Number(localStorage.getItem('optisync_proximity_duration')) || 30);
    const [mildThreshold, setMildThreshold] = useState(Number(localStorage.getItem('optisync_mild_threshold')) || 40);
    const [severeThreshold, setSevereThreshold] = useState(Number(localStorage.getItem('optisync_severe_threshold')) || 80);

    useEffect(() => {
        // Fetch cameras
        const getCameras = async () => {
            try {
                // Ensure permissions are asked
                try {
                    await navigator.mediaDevices.getUserMedia({ video: true });
                } catch (e) {
                    console.log("Camera permission not granted or no default stream", e);
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                setCameras(videoDevices);
                if (!selectedCamera && videoDevices.length > 0) {
                    setSelectedCamera(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error("Error fetching cameras:", err);
            }
        };
        getCameras();
    }, []);

    const handleCameraChange = (e) => {
        const devId = e.target.value;
        setSelectedCamera(devId);
        localStorage.setItem('preferredCamera', devId);
        // Force the camera loop to restart
        window.dispatchEvent(new CustomEvent('OPTISYNC_CAMERA_CHANGE', { detail: { deviceId: devId } }));
    };

    const handleNotificationToggle = (e) => {
        const enabled = e.target.checked;
        setNotificationsEnabled(enabled);
        localStorage.setItem('notificationsEnabled', enabled);
    };

    const handleDurationChange = (e) => {
        const value = Math.max(5, Math.min(300, Number(e.target.value))); // Clamp between 5s and 5m
        setProximityDuration(value);
        localStorage.setItem('optisync_proximity_duration', value);
    };

    const handleMildThresholdChange = (e) => {
        const value = Math.max(10, Math.min(100, Number(e.target.value)));
        setMildThreshold(value);
        localStorage.setItem('optisync_mild_threshold', value);
    };

    const handleSevereThresholdChange = (e) => {
        const value = Math.max(10, Math.min(100, Number(e.target.value)));
        setSevereThreshold(value);
        localStorage.setItem('optisync_severe_threshold', value);
    };

    return (
        <div className="settings-container glass-card">
            <h2 style={{ marginBottom: '2rem' }}>System Settings</h2>
            
            <div className="settings-grid">
                
                {/* Hardware Section */}
                <div className="settings-section">
                    <h3>Hardware Integration</h3>
                    
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Cognitive Webcam Source</h4>
                            <p>Select the camera used for real-time blink and strain tracking. A well-lit, front-facing view is optimal.</p>
                        </div>
                        <select 
                            className="styled-select" 
                            value={selectedCamera} 
                            onChange={handleCameraChange}
                        >
                            {cameras.length === 0 && <option value="">Loading cameras...</option>}
                            {cameras.map((cam, idx) => (
                                <option key={cam.deviceId} value={cam.deviceId}>
                                    {cam.label || `Camera ${idx + 1}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="settings-section">
                    <h3>Alerts & Notifications</h3>
                    
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>High-Fatigue Modal Interruptions</h4>
                            <p>When cognitive strain exceeds 80%, the system will block the screen with a mandatory reset protocol.</p>
                        </div>
                        <label className="toggle-switch">
                            <input 
                                type="checkbox" 
                                checked={notificationsEnabled} 
                                onChange={handleNotificationToggle} 
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Proximity Hazard Period</h4>
                            <p>Threshold duration (seconds) of being too close to the screen before a hazard alert is triggered.</p>
                        </div>
                        <input 
                            type="number" 
                            className="styled-select" 
                            style={{ width: '80px', textAlign: 'center' }}
                            value={proximityDuration} 
                            onChange={handleDurationChange}
                            min="5"
                            max="300"
                        />
                    </div>
                </div>

                {/* Cognitive Strain Section */}
                <div className="settings-section">
                    <h3>Cognitive Strain Thresholds</h3>
                    
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Mild Strain Notification (%)</h4>
                            <p>An advisory notification will appear when your eye strain reaches this level.</p>
                        </div>
                        <input 
                            type="number" 
                            className="styled-select" 
                            style={{ width: '80px', textAlign: 'center' }}
                            value={mildThreshold} 
                            onChange={handleMildThresholdChange}
                            min="10"
                            max="100"
                        />
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Severe Strain Therapy Prompt (%)</h4>
                            <p>For more critical strain, the system will prompt you to enter a mandatory therapy session.</p>
                        </div>
                        <input 
                            type="number" 
                            className="styled-select" 
                            style={{ width: '80px', textAlign: 'center' }}
                            value={severeThreshold} 
                            onChange={handleSevereThresholdChange}
                            min="10"
                            max="100"
                        />
                    </div>
                </div>

                {/* UI Section */}
                <div className="settings-section">
                    <h3>Display & UI</h3>
                    
                    <div className="setting-item">
                        <div className="setting-info">
                            <h4>Light/Dark Mode</h4>
                            <p>Toggle between the default dark interface and a high-contrast light theme.</p>
                        </div>
                        <label className="toggle-switch">
                            <input 
                                type="checkbox" 
                                checked={isLightMode} 
                                onChange={(e) => onModeToggle(e.target.checked)} 
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Setting;
