# 🧠 SoundGuard TinyML Model Information

This directory contains specifications and performance characteristics of the Edge Impulse TinyML model deployed on the ESP32 microcontroller (`gauravirus-project-1_inferencing.h`).

---

## 🎯 Target Environmental Sound Classes

The on-device classifier is trained to detect 4 primary sound events plus ambient background noise:

1. **`door_knock`** — Door knocks, knuckles on wood/metal entrance doors.
2. **`clapping`** — Sharp applause and hand claps.
3. **`crying_baby`** — High-pitched infant distress crying.
4. **`alarm_bell`** — Continuous and pulsed fire alarms, smoke detectors, and door bells.
5. **`noise / background`** — Ambient domestic sounds, fan noise, road traffic, and speech (filtered out).

---

## 🔬 DSP & Feature Extraction Pipeline

- **Sampling Rate**: `16,000 Hz` (16 kHz, 16-bit Mono)
- **Time Window**: `1,000 ms` (1 second audio slices)
- **Window Increase / Hop Size**: `250 ms` (for continuous real-time sliding inference)
- **Pre-emphasis**: `0.97`
- **DSP Block**: **MFCC (Mel-Frequency Cepstral Coefficients)**
  - Number of coefficients: `13`
  - Frame length: `0.02 s` (20 ms)
  - Frame stride: `0.01 s` (10 ms)
  - Filter bank count: `32`
  - FFT size: `256`
  - Low frequency cutoff: `100 Hz`
  - High frequency cutoff: `8000 Hz`

---

## 🏗️ Neural Network Architecture

The model uses a lightweight **1D/2D Convolutional Neural Network (CNN)** optimized for microcontroller deployment via TensorFlow Lite for Microcontrollers (TFLM):

```
Input (MFCC Features: 99 x 13)
  │
  ├── [Conv2D] (16 filters, 3x3 kernel, ReLU activation)
  ├── [MaxPooling2D] (pool size: 2x2)
  ├── [Dropout] (rate: 0.25)
  │
  ├── [Conv2D] (32 filters, 3x3 kernel, ReLU activation)
  ├── [MaxPooling2D] (pool size: 2x2)
  ├── [Dropout] (rate: 0.25)
  │
  ├── [Flatten]
  ├── [Dense] (64 units, ReLU)
  ├── [Dropout] (rate: 0.5)
  │
  └── [Dense] (5 output classes, Softmax)
```

---

## ⚙️ Quantization & Memory Footprint

- **Quantization**: `int8` (post-training quantization)
- **Flash ROM Usage**: `~85 KB`
- **RAM Peak Usage (Tensor Arena)**: `~24 KB`
- **Inference Latency on ESP32 (240 MHz)**:
  - DSP (MFCC): `~22 ms`
  - Classification (NN): `~14 ms`
  - Total latency: `~36 ms` (well within real-time threshold)
