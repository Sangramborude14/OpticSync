# OptiSync Desktop Installation Guide

You can now run OptiSync as a standalone Windows application.

## 🚀 Getting Started

### 1. Developer Mode (Run without building)
To run the app in development mode:
```bash
npm start
```
This will start the backend, the web-app, and the Electron window simultaneously.

### 2. Build the Installer (.exe)
To package the app into a single installable `.exe` file:
```bash
npm run dist
```
Once finished, you will find the installer in the `dist-app/` directory.

## 🛠️ Requirements
- **Node.js**: Installed on your system.
- **MongoDB**: Ensure MongoDB is running locally (default: `mongodb://localhost:27017`) for history tracking to work.

## ✨ Features of Desktop Version
- **Premium UI**: Refined dashboard with glassmorphic aesthetics.
- **System Integration**: Runs as a native Windows process.
- **Custom Icon**: Featuring the high-fidelity OptiSync Eye icon.
- **Unified Backend**: Automatically manages the life-cycle of the analytical server.
