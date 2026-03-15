# OptiSync OS - Cognitive Health & Proximity Monitoring System

![OptiSync Logo](icon.png)

OptiSync OS is a cutting-edge **Cognitive Operating System** designed to monitor eye strain, posture, and burnout in real-time. By leveraging computer vision (MediaPipe) and AI, it helps digital professionals and students maintain ocular health through proactive alerts and interactive therapy modules.

---

## 🚀 Key Features

### 👁️ Real-time Eye Strain Monitoring
- **Live EAR Calculation**: Calculates Eye Aspect Ratio at 15-30fps to detect fatigue.
- **Blink Rate Analytics**: Tracks Blinks Per Minute (BPM) to identify "staring syndrome" and provide restorative feedback.
- **Predictive Burnout Model**: A proprietary algorithm that maps eye behavior and blink patterns to a live 0-100% strain level.

### 📏 Proximity Hazard Alerts
- **Distance Tracking**: Monitors precise distance between eyes and screen using facial geometry.
- **Posture Calibration**: Calibrate your "Ideal Posture" and receive alerts if you develop a "hunch" for more than 90 seconds.
- **Visual Feedback**: Real-time status indicators (Safe, Warning, Hazard) on the dashboard.

### 🧘 Interactive Therapy Modules
Integrated "Cognitive Reset" sequences to drop strain levels immediately:
- **Focus Shifter**: Dynamic visual exercise for depth perception.
- **Infinity Tracker**: Orbital tracking for ocular muscle relaxation.
- **Corner Taps**: Peripheral vision engagement.
- **Palming Audio**: Guided sensory deprivation protocol.
- **20-20-20 Rule**: Automated monitoring of 20-foot look-aways for 20 seconds.

### 🔗 Complete Ecosystem
- **Chrome Extension Sync**: Broadcasts strain state to a persistent widget on every browser tab.
- **OS Notifications**: Native desktop alerts for high fatigue and proximity hazards (even when tab is idle).
- **History Analytics**: Persistent backend tracking with hourly strain aggregation and daily health reports.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Chart.js, MediaPipe (Face Mesh).
- **Backend**: Node.js, Express, MongoDB (Mongoose) for history persistence.
- **Extension**: Chrome Extension Manifest v3, Service Workers, Content API.
- **AI**: Computer vision models running locally on client side for privacy.

---

## 📦 Installation & Setup

### 1. Prerequisites
- **Node.js**: v18 or higher.
- **MongoDB**: Local installation running on `mongodb://localhost:27017`.
- **Hardware**: Standard webcam.

### 2. Setup Procedure

**Backend Server**
```bash
cd backend
npm install
node server.js
```

**React Dashboard**
```bash
cd web-app
npm install
npm run dev
```

**Chrome Extension**
1. Navigate to `chrome://extensions/` in your browser.
2. Enable **Developer Mode** (top right).
3. Click **Load Unpacked**.
4. Select the root project folder (`/electrothon`).

---

## 🎯 Getting Started

1. **Launch the Stack**: Ensure both the backend and web-app are running.
2. **Access Dashboard**: Open `http://localhost:5173` (or your local Vite port).
3. **Calibrate Posture**: Sit in your natural working position and click "Calibrate" in the webcam frame.
4. **Link Extension**: Click the green "Link Chrome Extension" button to enable system-level alerts.
5. **Session Monitoring**: Work as usual. OptiSync will automatically trigger therapy modules if strain thresholds (40% mild, 80% severe) are exceeded.

---

## 🏆 Project Context
Developed for **Electrothon**, OptiSync OS aims to bridge the gap between high-performance digital work and human biological limits.

---

## 📜 License
ISC License.

---

*Stay Focused. Stay Healthy. OptiSync.*
