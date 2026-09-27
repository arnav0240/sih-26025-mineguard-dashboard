# MineGuard // Mine Subsidence & Geotechnical Safety Console

**Modern AI-Powered 5-Node LoRa Multi-Hop Mine Subsidence, Roof Collapse and Geotechnical Hazard Early Warning Dashboard built with React 19, TypeScript, and Vite.**

---

## 🏗️ Architecture & Technology Stack

- **Framework**: React 19 + TypeScript (Vite bundler)
- **Styling**: Pure CSS / Glassmorphism with Cyber-Industrial Dark Theme
- **GIS Mapping**: Leaflet.js with Dark Tile Basemap & Custom Radar Pin Overlays
- **Telemetry Charts**: Chart.js for real-time multi-node inclinometer displacement & gas correlation
- **Audio Synthesizer**: Web Audio API (3000 Hz continuous critical siren & 1800 Hz warning beep)
- **Icons**: Lucide React

---

## 🎯 Accurate Firmware Sensor Thresholds

Strictly aligned with the technical handoff and `src/main.cpp`:

| Parameter | Sensor | Warning Threshold | Critical Threshold | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Tilt Angle** | MPU-6050 | `3.0°` | `5.0°` | Inclinometer angular displacement |
| **Roof Load** | HX711 + Load Cell | `5.0 kg` | `10.0 kg` | Structural roof strata pressure |
| **Gas Indicator** | MQ-2 | `7,500 ppm-equiv` | `12,500 ppm-equiv` | Relative simulation indicator (not certified methane) |
| **Temperature** | DHT22 | `35.0 °C` | `40.0 °C` | Ambient tunnel heat |
| **Pressure Drop** | BMP180 | `2.0% drop` | `4.0% drop` | Evaluated against baseline: `(baseline - p) / baseline` |

---

## 🧠 Accurate Status & Risk Score Algorithms

### 1. Overall Status Logic (Technical Handoff Section 11)
```text
IF criticalCount > 0
    → DANGER
ELSE IF warningCount >= 3
    → DANGER   <-- e.g. NODE-3 with 5 warnings triggers DANGER
ELSE IF warningCount > 0
    → WARNING
ELSE
    → SAFE
```

> **Important Distinction (Section 5)**:
> In the default demonstration, **Node 3** has **5 warning-level sensors** and **0 critical sensors**.
> It is classified as **DANGER** because **3 or more warning sensors occurring together are treated as a dangerous combined condition**.

### 2. Risk Score (Section 12)
$$\text{Risk Score} = \min(100, (\text{warningSensors} \times 12) + (\text{criticalSensors} \times 30))$$
- 5 warnings = `60 / 100` (Node 3 default)
- 1 warning = `12 / 100` (Node 2 default)
- 0 warnings = `0 / 100` (Node 4 & Node 5 default)

### 3. Adaptive Transmission Frequency (Section 13)
- **SAFE**: Transmit every **40 seconds**
- **WARNING**: Transmit every **15 seconds**
- **DANGER**: Transmit every **3 seconds**

### 4. Physical Audible Alarm System (Section 20–24)
- **DANGER**: 3000 Hz continuous piezoelectric siren (`tone(BUZZER_PINS[criticalNode], 3000)`) from the critical node only.
- **WARNING**: 1800 Hz slow beep (180 ms pulse every 1.5 seconds) from warning node only.
- **SAFE**: All buzzers silent.
- **Tie-Breaker**: If multiple nodes are critical, the node with the highest risk score becomes the active audible locator.

### 5. Simulated Battery Model (Section 25)
- Depletion: SAFE (-0.01%), WARNING (-0.02%), DANGER (-0.04%). Minimum floor: 5.0%.

---

## 🚀 How to Run the Dashboard

### Option 1: Direct Double Click (Windows)
Double-click [`run_dashboard.bat`](../run_dashboard.bat) in the project root folder.

### Option 2: Command Line (Vite Dev Server)
```powershell
cd dashboard
npm run dev
```
Open your browser at: **`http://localhost:5173`**

### Option 3: Production Build
```powershell
cd dashboard
npm run build
npm run preview
```

### Option 4: Connect to Live ESP32 Gateway (Wokwi / Hardware)
Click the **"Live Gateway"** button in the header, enter the IP (e.g. `http://localhost:8180` or `http://192.168.x.x`), and click **Connect**. The dashboard will poll `/api/nodes` automatically.
