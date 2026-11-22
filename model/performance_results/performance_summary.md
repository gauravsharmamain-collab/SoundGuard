# 📊 Edge Impulse Model Performance Summary

Detailed test and validation benchmark results for the SoundGuard Edge Impulse TinyML audio classification model.

---

## 🏆 Overall Validation Metrics

- **Validation Accuracy**: **94.2%**
- **Validation Loss**: **0.18**
- **F1 Score (Macro)**: **0.938**
- **Quantization**: int8 (optimized for ESP32)

---

## 🗂️ Confusion Matrix (Validation Set)

| Actual \ Predicted | Door Knock | Clapping | Crying Baby | Bell / Alarm | Background Noise | Recall (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Door Knock** | **94** | 2 | 0 | 0 | 4 | **94.0%** |
| **Clapping** | 1 | **92** | 0 | 1 | 6 | **92.0%** |
| **Crying Baby** | 0 | 0 | **96** | 1 | 3 | **96.0%** |
| **Bell / Alarm** | 0 | 1 | 1 | **97** | 1 | **97.0%** |
| **Background Noise** | 4 | 3 | 1 | 0 | **92** | **92.0%** |

---

## 📈 Class-wise Precision & Recall

| Sound Class | Precision | Recall | F1-Score | Minimum Tested Confidence |
| :--- | :---: | :---: | :---: | :---: |
| **Door Knock** | 94.9% | 94.0% | 0.944 | 0.70 |
| **Clapping** | 93.8% | 92.0% | 0.929 | 0.70 |
| **Crying Baby** | 97.9% | 96.0% | 0.969 | 0.70 |
| **Bell / Alarm** | 97.9% | 97.0% | 0.974 | 0.70 |

---

## ⏱️ Real-time On-Device Latency Benchmarks (ESP32 @ 240 MHz)

- **Audio Buffer Slice Length**: `250 ms`
- **DSP Pre-processing (MFCC)**: `22 ms`
- **Neural Network Inference**: `14 ms`
- **Wi-Fi HTTP Dispatch (Non-blocking)**: `<120 ms` (on standard 2.4 GHz local Wi-Fi)
- **Total Reaction Time to User Screen**: `< 400 ms`
