# OptiSync 👁️

<div align="center">

![OptiSync Banner](https://img.shields.io/badge/OptiSync-Ocular%20Wellness%20Ecosystem-blue?style=for-the-badge&logo=eye)

*A real-time AI-powered eye fatigue detection and wellness system*

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb)](https://mongodb.com/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-AI%20Engine-FF6F00?style=flat-square&logo=google)](https://mediapipe.dev/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension%20MV3-4285F4?style=flat-square&logo=googlechrome)](https://developer.chrome.com/docs/extensions/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [The Problem](#-the-problem)
- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Challenges We Ran Into](#-challenges-we-ran-into)
- [Current Status](#-current-status)
- [Team](#-team)

---

## 🌟 Overview

Over *2.1 billion people* suffer from Digital Eye Strain (DES) — caused by prolonged screen exposure, poor blinking habits, and bad posture. Yet most "solutions" are just glorified timers with no awareness of your actual fatigue.

*OptiSync is different.*

OptiSync is a high-performance *Ocular Wellness Ecosystem* that uses the *MediaPipe Face Mesh AI* to continuously monitor biological markers — blink rate, Eye Aspect Ratio (EAR), and screen proximity — converting them into a live *Cognitive Strain Score* that responds to your real fatigue in real time.

---

## 🚩 The Problem

| Problem | Impact |
|---|---|
| Reduced blink rate during screen use | Avg. drops from 15 BPM → 5 BPM, causing dryness & irritation |
| No awareness of fatigue buildup | Users push through strain until symptoms become severe |
| Timers don't measure actual fatigue | Fixed-interval reminders are ignored or dismissed |
| Eye strain leads to burnout | Reduced productivity, headaches, and blurred vision |

OptiSync solves all of this by measuring, not guessing.

---

## 🏗️ System Architecture

OptiSync is built as a *triple-threat ecosystem* for maximum coverage and user engagement:


┌─────────────────────────────────────────────────────────────┐
│                     OptiSync Ecosystem                      │
│                                                             │
│  ┌──────────────────┐    ┌───────────────┐    ┌──────────┐  │
│  │  Master Dashboard │◄──►│Chrome Extension│◄──►│ Backend  │  │
│  │  (React / Vite)  │    │    (MV3)      │    │(Node/DB) │  │
│  │                  │    │               │    │          │  │
│  │ • MediaPipe AI   │    │ • Floating UI │    │ • Logs   │  │
│  │ • EAR Scoring    │    │ • Live Scores │    │ • History│  │
│  │ • Therapy Modules│    │ • OS Notifs   │    │ • Reports│  │
│  └──────────────────┘    └───────────────┘    └──────────┘  │
└─────────────────────────────────────────────────────────────┘


### 1. 🖥️ Master Dashboard (React / Vite)
The central hub of OptiSync. It runs the MediaPipe engine, processes the live webcam feed, executes all strain-calculation logic, and hosts the full Therapy Modules Library.

### 2. 🌐 Chrome Extension (MV3)
A "Global Bridge" that injects a floating UI widget into every webpage the user visits. It broadcasts live strain scores and fires OS-level desktop notifications when fatigue thresholds are hit — no matter what site you're on.

### 3. 📦 Analytics Backend (Node / Express / MongoDB)
Records hourly strain data and blink history, allowing users to review long-term ocular health trends through the History Log dashboard.

---

## ✨ Key Features

### 👁️ Real-Time Ocular Monitoring
- *EAR Calculation* — Precision tracking of eye aperture to detect full blinks, partial blinks, and prolonged staring episodes
- *Staring Penalty* — Automatically increases the strain score when Blinks Per Minute (BPM) drops below the healthy threshold of 15 BPM
- *Restorative Bonus* — Rapidly reduces strain score when the user closes their eyes or looks away from the screen for a set duration

### 🚨 Progressive Alert System

| Threshold | Alert Type | Action |
|---|---|---|
| *40%+* | Mild Warning | In-app toast + OS notification suggesting a blink break |
| *80%+* | Severe / Critical | Mandatory therapy modal + window title flash + high-priority desktop alert |

### 🧘 Therapy Modules Library

Interactive, science-backed sessions designed to reset and relax eye muscles:

| Module | Description |
|---|---|
| *Infinity Tracker* | Eye-tracking exercise following a floating orbital path to stretch eye muscles |
| *Palming Audio* | Guided sensory deprivation session to restore rod and cone cell function |
| *20-20-20 Rule* | Monitored session — user must look 20 feet away for 20 seconds, verified by detection |
| *Posture Hazard* | Proximity sensor that alerts when the user is sitting dangerously close to the screen |

### 📊 Health Analytics Dashboard
- Hourly strain score history visualized over days and weeks
- Blink rate trends and BPM averages
- Fatigue pattern insights to identify high-risk time windows

### ⚙️ Background Persistence
- Custom *Web Workers* prevent the AI engine from freezing when the dashboard tab is hidden or minimized
- *Service Workers (MV3)* maintain a persistent monitoring process across all browser tabs

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| *AI Engine* | MediaPipe Face Mesh, JavaScript ES6+ | Real-time facial landmark detection & EAR scoring |
| *Frontend* | React 18, Vite | Master Dashboard UI |
| *Styling* | CSS (Glassmorphism / Premium Aesthetics) | UI design system |
| *Extension* | Chrome MV3, Service Workers, Content Scripts | Cross-tab strain broadcasting |
| *Server* | Node.js, Express.js | REST API for data logging |
| *Database* | MongoDB (Local / Atlas), Mongoose | Historical strain & blink records |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas URI)
- Google Chrome browser

### 1. Clone the Repository
bash
git clone https://github.com/Raghu-023-ux/project.git
cd project


### 2. Start the Backend Server
bash
cd backend
npm install
npm start

> Server runs on http://localhost:5000 by default.

### 3. Start the Master Dashboard
bash
cd dashboard
npm install
npm run dev

> Dashboard runs on http://localhost:5173 by default.

### 4. Load the Chrome Extension
1. Open Chrome and navigate to chrome://extensions/
2. Enable *Developer Mode* (top right toggle)
3. Click *Load Unpacked*
4. Select the /extension folder from the project directory
5. The OptiSync widget will now appear on every webpage

### 5. Environment Variables
Create a .env file in the /backend directory:
env
MONGO_URI=your_mongodb_connection_string
PORT=5000


---

## 📁 Project Structure


optisync/
│
├── dashboard/              # React + Vite Master Dashboard
│   ├── src/
│   │   ├── components/     # UI components (alerts, toasts, modals)
│   │   ├── modules/        # Therapy module implementations
│   │   ├── engine/         # MediaPipe + EAR scoring logic
│   │   └── workers/        # Web Workers for background persistence
│   └── vite.config.js
│
├── extension/              # Chrome Extension (MV3)
│   ├── manifest.json
│   ├── content.js          # Injected floating widget
│   ├── background.js       # Service Worker
│   └── popup/              # Extension popup UI
│
├── backend/                # Node.js + Express API
│   ├── routes/             # API route handlers
│   ├── models/             # Mongoose schemas (strain logs, blink history)
│   └── server.js
│
└── README.md


---

## 🧱 Challenges We Ran Into

### 🔋 1. Battery Efficiency
Running a real-time AI face mesh engine continuously is expensive on system resources.

*How we solved it:*
- Implemented *adaptive frame sampling* — MediaPipe only processes frames when motion is detected, cutting unnecessary CPU cycles
- Throttled strain-score update intervals to avoid redundant recalculations
- The Chrome Extension runs *zero AI logic* — it only listens for score broadcasts from the dashboard, keeping its footprint minimal

---

### 🔐 2. Protecting User Data
Webcam access and health metrics are deeply personal — privacy was non-negotiable.

*How we solved it:*
- *100% on-device processing* — the webcam feed never leaves the user's browser
- No raw video or images are ever stored; only derived metrics (strain score, BPM) are logged
- MongoDB stores *only anonymized numerical data* — no biometrics, no PII
- Users can clear their entire history log at any time from the dashboard

---

### ⚙️ 3. Running in the Background
Browser tabs get throttled or frozen when hidden — a critical problem for continuous monitoring.

*How we solved it:*
- *Custom Web Workers* offload the AI engine off the main thread, preventing it from being killed when the tab loses focus
- *Chrome MV3 Service Workers* maintain a persistent background process that keeps the strain score alive across all tabs
- A *visibility state listener* gracefully pauses and resumes the MediaPipe engine to conserve resources when the dashboard is minimized

---

### 👁️ 4. Actually Reducing Eye Strain
Most apps just set a timer. We wanted real, measurable, enforced relief.

*How we solved it:*
- Therapy sessions are *triggered automatically* at critical strain thresholds — not left to user willpower
- The *20-20-20 Rule* module uses real gaze detection to verify compliance, not just a countdown timer
- The *Restorative Bonus* system rewards users with score reductions for closing their eyes and looking away, reinforcing healthy habits through positive feedback
- *Posture Hazard* detection adds a physical wellness layer beyond just eye metrics

---

## ✅ Current Status

| Feature | Status |
|---|---|
| AI Engine (blink detection + EAR scoring) | ✅ Fully functional |
| Chrome Extension sync | ✅ High-reliability messaging active |
| Therapy Library (Palming, 20-20-20, Massage) | ✅ Core modules implemented |
| Desktop notifications + in-app toasts | ✅ Active |
| MongoDB backend integration | ✅ Historical reporting live |
| Background persistence via Web Workers | ✅ Implemented |

---

## 👥 Team

| Name | Role |
|---|---|
| *Arnav Singh* | Frontend & AI Engine |
| *Raghav Singh* | Chrome Extension & Integration |
| *Sangram Borude* | Backend & Database |

---

<div align="center">

Built with ❤️ at *OptiSync* · OptiSync © 2026

Because your eyes deserve better than a 20-minute timer.

</div>
