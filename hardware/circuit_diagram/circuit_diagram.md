# 🔌 SoundGuard Hardware Circuit & Wiring Diagram

This document describes the circuit connections for the **ESP32-WROOM-32** microcontroller and the **ICS-43434** (or INMP441) I2S MEMS digital microphone.

---

## 📌 Pin Mapping Table

| ICS-43434 / INMP441 Pin | ESP32-WROOM-32 Pin | Function Description |
| :--- | :--- | :--- |
| **VDD / 3V3** | **3V3** | Power supply (3.3V DC) |
| **GND** | **GND** | Power ground |
| **SD / DOUT** | **GPIO 33** | Serial Data output from microphone into ESP32 (`data_in_num = 33`) |
| **SCK / BCLK** | **GPIO 26** | Serial Clock / Bit Clock (`bck_io_num = 26`) |
| **WS / LRCLK** | **GPIO 32** | Word Select / Left-Right Clock (`ws_io_num = 32`) |
| **L/R** | **GND** | Channel selection: Pulled LOW to GND for Left/Mono audio |

---

## 📐 Schematic Diagram (ASCII)

```
        +-----------------------------------+
        |          ESP32-WROOM-32           |
        |                                   |
        |  [3V3] -------------------+       |
        |  [GND] ---------------+   |       |
        |                       |   |       |
        |  [GPIO 26] (SCK) -----+---|-------+---> SCK  (Bit Clock)
        |  [GPIO 32] (WS) ------+---|---|---+---> WS   (Word Select)
        |  [GPIO 33] (SD) ------+---|---|---|---> SD   (Serial Data)
        +-----------------------|---|---|---+
                                |   |   |   |
                                v   v   v   v
        +-----------------------------------+
        |       ICS-43434 / INMP441         |
        |        I2S MEMS Microphone        |
        |                                   |
        |  [VDD] <------------------+       |
        |  [GND] <--------------+           |
        |  [L/R] <--------------+ (GND/Mono)|
        |  [SD]  <--------------------------+
        |  [WS]  <--------------------------+
        |  [SCK] <--------------------------+
        +-----------------------------------+
```

---

## ⚡ Important Hardware Notes

1. **Clean 3.3V Power**: Connect `VDD` strictly to the ESP32's **3V3** pin. Do **NOT** connect to 5V/VIN, as the ICS-43434 is a 3.3V logic device and will be damaged by 5V.
2. **Channel Selection**: Grounding `L/R` configures the microphone to send audio samples on the Left channel, matching the driver configuration `.channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT` or Left in `soundguard.ino`.
3. **Decoupling Capacitor**: For optimal acoustic SNR, ensure a `0.1 µF` ceramic capacitor is placed close to the VDD and GND pins of the microphone module.
