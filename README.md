# 🛡️ SoundGuard: Assistive IoT Sound Alert System

SoundGuard is an end-to-end tactile and visual sound-alert IoT system engineered for Deaf and hard-of-hearing users. An **ESP32 microcontroller** paired with an **ICS-43434 I2S MEMS microphone** runs an on-device Edge Impulse TinyML model to detect environmental sounds locally:

1. **Door Knocks** (`door_knock`)
2. **Clapping** (`clapping`)
3. **Crying Baby** (`crying_baby`)
4. **Bells / Alarms** (`alarm_bell`)

When a sound is identified, the ESP32 dispatches the classification result and confidence score to the local Node.js backend over Wi-Fi. The backend stores the event in SQLite and broadcasts it in real time via **Socket.IO** to a responsive, dark-mode assistive React dashboard.

> **Important**: All TinyML inference is performed locally on the ESP32 hardware. The web server never performs audio classification.

---

## 📁 Repository Structure

```
SoundGuard/
│
├── README.md                     # Comprehensive project documentation
├── .gitignore                    # Git ignore configuration
├── LICENCE                       # MIT Open Source License
│
├── hardware/
│   ├── esp32_code/
│   │   └── soundguard.ino        # Merged Edge Impulse inference & Wi-Fi firmware
│   └── circuit_diagram/
│       └── circuit_diagram.md    # Pin mapping & wiring schematic (ICS-43434 to ESP32)
│
├── model/
│   ├── model_information.md      # Edge Impulse DSP, MFCC, CNN architecture details
│   └── performance_results/
│       └── performance_summary.md# Confusion matrix, accuracy (94.2%), and latency metrics
│
├── backend/                      # Node.js + Express + Socket.IO + SQLite Backend
│   ├── database/
│   │   ├── db.js                 # SQLite schema initialization (node:sqlite)
│   │   └── soundguard.db         # Persistent local database file
│   ├── controllers/              # Ingestion, query, acknowledgement & heartbeat handlers
│   ├── services/                 # Sound normalization, statistics aggregation, 30s timeout tracker
│   ├── routes/api.js             # REST API router (/api/*)
│   ├── scripts/
│   │   ├── test_runner.js        # Automated in-process verification test suite
│   │   ├── simulate_esp32.js     # Hardware simulator CLI
│   │   └── seed_db.js            # Realistic historical seed generator
│   ├── server.js                 # HTTP + WebSocket server listening on 0.0.0.0:5000
│   ├── .env                      # Server configuration
│   └── package.json
│
├── frontend/                     # React + Vite + Tailwind CSS Assistive Dashboard
│   ├── public/                   # Static icons & assets
│   ├── src/
│   │   ├── components/           # Reusable UI widgets (Alert Banner, Badges, Progress Bars)
│   │   ├── pages/                # Overview, Live Detection, History, Analytics, Device, Settings
│   │   ├── services/             # REST API client, Socket.IO client, Web Audio chime & haptics
│   │   ├── App.jsx               # Main state controller & WebSocket event subscriber
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── documentation/
    ├── architecture.png          # System architecture diagram
    ├── presentation.pdf          # 4-slide project presentation deck
    └── screenshots/              # UI walkthrough captures
```

---

## 🚀 Quick Start (Single Command)

To run the complete full-stack application on your Windows laptop:

```cmd
cd C:\Users\DELL\OneDrive\Documents\OS\SoundGuard\backend && npm start
```

Then open your browser and navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

*(Or run the Vite development server in `frontend/` using `npm run dev` for hot module reloading at `http://localhost:5173`).*

---

## 🔌 Hardware Setup & Wiring

Connect the **ICS-43434** digital MEMS microphone to the **ESP32-WROOM-32** using the pinout below (details in [`hardware/circuit_diagram/circuit_diagram.md`](file:///c:/Users/DELL/OneDrive/Documents/OS/SoundGuard/hardware/circuit_diagram/circuit_diagram.md)):

| ICS-43434 Pin | ESP32 Pin | Function |
| :--- | :--- | :--- |
| **VDD** | **3V3** | 3.3V Power Supply |
| **GND** | **GND** | Ground |
| **SD / DOUT** | **GPIO  23** | Serial Data Input |
| **SCK / BCLK** | **GPIO 22** | Bit Clock |
| **WS / LRCLK** | **GPIO 21** | Word Select Clock |
| **L/R** | **GND** | Left Channel (Mono) |

Open [`hardware/esp32_code/soundguard.ino`](file:///c:/Users/DELL/OneDrive/Documents/OS/SoundGuard/hardware/esp32_code/soundguard.ino) in Arduino IDE, update your Wi-Fi credentials and laptop IP address (`172.16.51.84`), and flash your board.

---

## 🧪 Testing Without Physical Hardware

You can test every feature of the website using the built-in simulator tools:

```cmd
cd C:\Users\DELL\OneDrive\Documents\OS\SoundGuard\backend

:: 1. Send an automated Door Knock alert:
node scripts/simulate_esp32.js --detect door_knock --conf 0.94

:: 2. Send an Alarm Bell critical alert:
node scripts/simulate_esp32.js --detect alarm_bell --conf 0.98

:: 3. Run continuous background simulation:
node scripts/simulate_esp32.js --loop

:: 4. Run automated test suite:
node scripts/test_runner.js
```
