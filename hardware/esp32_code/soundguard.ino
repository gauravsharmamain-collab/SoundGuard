
/*
 * SOUNDGUARD
 * ESP32-WROOM-32 + ICS-43434 + Edge Impulse + Wi-Fi
 *
 * Assumed wiring:
 *   BCLK = GPIO 22
 *   WS   = GPIO 21
 *   DOUT = GPIO 23
 *   L/R  = GND (LEFT channel)
 *
 * Reads 32-bit I2S audio slots and converts them to int16 samples.
 * Network requests run in a separate FreeRTOS task.
 */

#define EIDSP_QUANTIZE_FILTERBANK 0

#include <Arduino.h>
#include <string.h>
#include <math.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <driver/i2s.h>
#include <esp_heap_caps.h>

#include <gauravirus-project-1_inferencing.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

// ---------------- USER CONFIGURATION ----------------

const char *WIFI_SSID = "EACCESS";
const char *WIFI_PASSWORD = "hostelnet";

const char *SERVER_IP = "172.16.51.84";
const uint16_t SERVER_PORT = 5000;

const char *DEVICE_ID = "soundguard_01";
const char *FIRMWARE_VERSION = "1.3.0-audio-fix";

// ---------------- I2S CONFIGURATION ----------------

static constexpr int I2S_BCLK_PIN = 22;
static constexpr int I2S_WS_PIN = 21;
static constexpr int I2S_DOUT_PIN = 23;

static constexpr i2s_port_t I2S_PORT = I2S_NUM_0;

static constexpr int I2S_TO_INT16_SHIFT = 16;

// ---------------- DETECTION SETTINGS ----------------

static constexpr float CONFIDENCE_THRESHOLD = 0.70f;

static constexpr uint32_t ALERT_COOLDOWN_MS = 2500;
static constexpr uint32_t HEARTBEAT_INTERVAL_MS = 10000;

// ---------------- LABEL MAPPING ----------------

const char *mapEdgeImpulseLabel(const char *label) {

    if (!label) return nullptr;

    if (
        !strcmp(label, "door_wood_knock") ||
        !strcmp(label, "door_knock") ||
        !strcmp(label, "knock") ||
        !strcmp(label, "knocking")
    ) {
        return "door_knock";
    }

    if (
        !strcmp(label, "clapping") ||
        !strcmp(label, "clap") ||
        !strcmp(label, "applause")
    ) {
        return "clapping";
    }

    if (
        !strcmp(label, "crying_baby") ||
        !strcmp(label, "baby_crying") ||
        !strcmp(label, "baby_cry") ||
        !strcmp(label, "crying")
    ) {
        return "crying_baby";
    }

    if (
        !strcmp(label, "church bells") ||
        !strcmp(label, "church_bells") ||
        !strcmp(label, "alarm_bell") ||
        !strcmp(label, "bell_alarm") ||
        !strcmp(label, "alarm") ||
        !strcmp(label, "bell") ||
        !strcmp(label, "fire_alarm")
    ) {
        return "alarm_bell";
    }

    // Background and unknown labels are not sent.
    return nullptr;
}

// ---------------- SHARED STATE ----------------

struct DetectionEvent {
    char sound[32];
    float confidence;
    uint32_t uptimeSeconds;
};

static QueueHandle_t networkQueue = nullptr;

static TaskHandle_t captureTaskHandle = nullptr;
static TaskHandle_t inferenceTaskHandle = nullptr;

static int16_t *audioSlice = nullptr;

static uint32_t audioSliceSamples = 0;

static volatile bool captureRunning = false;

static uint32_t lastSentAt = 0;

static char lastSentCategory[32] = {0};

// ---------------- WIFI ----------------

void connectWiFi() {

    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("[WiFi] Connecting");

    uint32_t start = millis();

    while (
        WiFi.status() != WL_CONNECTED &&
        millis() - start < 15000
    ) {
        delay(300);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {

        Serial.println("\n[WiFi] Connected");

        Serial.print("[WiFi] ESP32 IP: ");
        Serial.println(WiFi.localIP());

        Serial.printf(
            "[WiFi] RSSI: %d dBm\n",
            WiFi.RSSI()
        );

    } else {

        Serial.println(
            "\n[WiFi] Not connected; network task will retry."
        );
    }
}

// ---------------- HTTP POST ----------------

bool postJson(const String &path, const String &payload) {

    if (WiFi.status() != WL_CONNECTED) {
        return false;
    }

    HTTPClient http;

    String url =
        String("http://") +
        SERVER_IP +
        ":" +
        String(SERVER_PORT) +
        path;

    http.setConnectTimeout(1500);
    http.setTimeout(2000);

    if (!http.begin(url)) {
        return false;
    }

    http.addHeader(
        "Content-Type",
        "application/json"
    );

    int status = http.POST(payload);

    if (status > 0) {

        Serial.printf(
            "[HTTP] %s -> %d\n",
            path.c_str(),
            status
        );

        String response = http.getString();

        if (response.length()) {
            Serial.println(response);
        }

    } else {

        Serial.printf(
            "[HTTP] POST failed: %s\n",
            http.errorToString(status).c_str()
        );
    }

    http.end();

    return status >= 200 && status < 300;
}

// ---------------- HEARTBEAT ----------------

void sendHeartbeat() {

    String payload = "{";

    payload += "\"device_id\":\"";
    payload += DEVICE_ID;
    payload += "\",";

    payload += "\"status\":\"online\",";

    payload += "\"wifi_rssi\":";
    payload += String(WiFi.RSSI());
    payload += ",";

    payload += "\"firmware_version\":\"";
    payload += FIRMWARE_VERSION;
    payload += "\"}";

    postJson(
        "/api/device/heartbeat",
        payload
    );
}

// ---------------- SEND DETECTION ----------------

void sendDetection(
    const char *sound,
    float confidence,
    uint32_t uptimeSeconds
) { 

    String payload = "{";

    payload += "\"device_id\":\"";
    payload += DEVICE_ID;
    payload += "\",";

    payload += "\"sound\":\"";
    payload += sound;
    payload += "\",";

    payload += "\"confidence\":";
    payload += String(confidence, 6);
    payload += ",";

    payload += "\"timestamp\":";
    payload += String(uptimeSeconds);

    payload += "}";

    postJson(
        "/api/detections",
        payload
    );
}

// ---------------- NETWORK TASK ----------------

void networkTask(void *parameter) {

    uint32_t lastHeartbeat = 0;
    uint32_t lastReconnect = 0;

    for (;;) {

        if (WiFi.status() != WL_CONNECTED) {

            if (millis() - lastReconnect >= 5000) {

                lastReconnect = millis();

                Serial.println(
                    "[WiFi] Reconnecting..."
                );

                WiFi.reconnect();
            }

        } else if (
            millis() - lastHeartbeat >=
            HEARTBEAT_INTERVAL_MS
        ) {

            sendHeartbeat();

            lastHeartbeat = millis();
        }

        DetectionEvent event;

        if (
            networkQueue &&
            xQueueReceive(
                networkQueue,
                &event,
                pdMS_TO_TICKS(250)
            ) == pdTRUE
        ) {

            if (WiFi.status() == WL_CONNECTED) {

                sendDetection(
    event.sound,
    event.confidence,
    event.uptimeSeconds
);

            } else {

                Serial.println(
                    "[Network] Event dropped: Wi-Fi offline."
                );
            }
        }
    }
}

// ---------------- I2S INITIALIZATION ----------------

bool initI2S(uint32_t sampleRate) {

    i2s_config_t config = {};

    config.mode = (i2s_mode_t)(
        I2S_MODE_MASTER | I2S_MODE_RX
    );

    config.sample_rate = sampleRate;

    config.bits_per_sample =
        I2S_BITS_PER_SAMPLE_32BIT;

    config.channel_format =
        I2S_CHANNEL_FMT_ONLY_LEFT;

    config.communication_format =
        I2S_COMM_FORMAT_I2S;

    config.intr_alloc_flags = 0;

    config.dma_buf_count = 8;
    config.dma_buf_len = 256;

    config.use_apll = false;
    config.tx_desc_auto_clear = false;
    config.fixed_mclk = 0;

    i2s_pin_config_t pins = {};

    pins.bck_io_num = I2S_BCLK_PIN;
    pins.ws_io_num = I2S_WS_PIN;

    pins.data_out_num = I2S_PIN_NO_CHANGE;
    pins.data_in_num = I2S_DOUT_PIN;

    esp_err_t err = i2s_driver_install(
        I2S_PORT,
        &config,
        0,
        nullptr
    );

    if (err != ESP_OK) {

        Serial.printf(
            "[I2S] Driver install failed: %d\n",
            (int)err
        );

        return false;
    }

    err = i2s_set_pin(
        I2S_PORT,
        &pins
    );

    if (err != ESP_OK) {

        Serial.printf(
            "[I2S] Pin setup failed: %d\n",
            (int)err
        );

        i2s_driver_uninstall(I2S_PORT);

        return false;
    }

    err = i2s_zero_dma_buffer(I2S_PORT);

    if (err != ESP_OK) {

        Serial.printf(
            "[I2S] DMA clear failed: %d\n",
            (int)err
        );

        i2s_driver_uninstall(I2S_PORT);

        return false;
    }

    return true;
}

// ---------------- MIC RMS / PEAK ----------------

void printAudioLevel(
    const int16_t *samples,
    size_t count
) {

    static uint32_t lastPrint = 0;

    if (millis() - lastPrint < 1000) {
        return;
    }

    lastPrint = millis();

    double sumSquares = 0.0;

    int32_t peak = 0;

    for (size_t i = 0; i < count; ++i) {

        int32_t value = samples[i];

        sumSquares +=
            (double)value * (double)value;

        int32_t magnitude = abs(value);

        if (magnitude > peak) {
            peak = magnitude;
        }
    }

    float rms = count
        ? sqrt(sumSquares / (double)count)
        : 0.0f;

    Serial.printf(
        "[MIC] RMS: %.1f | Peak: %ld\n",
        rms,
        (long)peak
    );
}

// ---------------- AUDIO CAPTURE TASK ----------------

void captureTask(void *parameter) {

    static constexpr size_t RAW_CHUNK_SAMPLES = 256;

    int32_t rawBuffer[RAW_CHUNK_SAMPLES];

    uint32_t writeIndex = 0;

    while (captureRunning) {

        while (
            writeIndex < audioSliceSamples &&
            captureRunning
        ) {

            size_t bytesRead = 0;

            esp_err_t err = i2s_read(
                I2S_PORT,
                rawBuffer,
                sizeof(rawBuffer),
                &bytesRead,
                portMAX_DELAY
            );

            if (err != ESP_OK || bytesRead == 0) {

                Serial.printf(
                    "[I2S] Read error %d, bytes=%u\n",
                    (int)err,
                    (unsigned)bytesRead
                );

                continue;
            }

            size_t samplesRead =
                bytesRead / sizeof(int32_t);

            for (
                size_t i = 0;
                i < samplesRead &&
                writeIndex < audioSliceSamples;
                ++i
            ) {

                // ICS-43434:
                // 24-bit signed sample in a 32-bit I2S slot.

                audioSlice[writeIndex++] =
                    (int16_t)(
                        rawBuffer[i] >>
                        I2S_TO_INT16_SHIFT
                    );
            }
        }

        if (!captureRunning) {
            break;
        }

        printAudioLevel(
            audioSlice,
            audioSliceSamples
        );

        // Notify inference that one slice is ready.
        xTaskNotifyGive(inferenceTaskHandle);

        // Wait until inference releases the buffer.
        ulTaskNotifyTake(
            pdTRUE,
            portMAX_DELAY
        );

        writeIndex = 0;
    }

    vTaskDelete(nullptr);
}

// ---------------- EDGE IMPULSE SIGNAL CALLBACK ----------------

static int getAudioData(
    size_t offset,
    size_t length,
    float *outPtr
) {

    if (
        !audioSlice ||
        offset > audioSliceSamples ||
        length > audioSliceSamples - offset
    ) {
        return -1;
    }

    numpy::int16_to_float(
        &audioSlice[offset],
        outPtr,
        length
    );

    return 0;
}

// ---------------- CLASSIFICATION ----------------

void processPrediction(
    const ei_impulse_result_t &result
) {

    const char *bestLabel = nullptr;

    float bestConfidence = 0.0f;

    for (
        size_t i = 0;
        i < EI_CLASSIFIER_LABEL_COUNT;
        ++i
    ) {

        float confidence =
            result.classification[i].value;

        const char *label =
            result.classification[i].label;

        Serial.printf(
            "    %s: %.6f\n",
            label,
            confidence
        );

        if (confidence > bestConfidence) {

            bestConfidence = confidence;

            bestLabel = label;
        }
    }

    if (!bestLabel) {
        return;
    }

    const char *category =
        mapEdgeImpulseLabel(bestLabel);

    if (!category) {

        Serial.printf(
            "[CLASSIFIER] Background/unmapped: %s (%.3f)\n",
            bestLabel,
            bestConfidence
        );

        return;
    }

    if (bestConfidence < CONFIDENCE_THRESHOLD) {

        Serial.printf(
            "[CLASSIFIER] Target below threshold: %s (%.3f)\n",
            category,
            bestConfidence
        );

        return;
    }

    uint32_t now = millis();

    if (
        !strcmp(category, lastSentCategory) &&
        now - lastSentAt < ALERT_COOLDOWN_MS
    ) {

        Serial.println(
            "[ALERT] Duplicate suppressed by cooldown."
        );

        return;
    }

    DetectionEvent event = {};

    strncpy(
        event.sound,
        category,
        sizeof(event.sound) - 1
    );

    event.confidence = bestConfidence;

    event.uptimeSeconds = now / 1000;

    if (
        networkQueue &&
        xQueueSend(
            networkQueue,
            &event,
            0
        ) == pdTRUE
    ) {

        lastSentAt = now;

        strncpy(
            lastSentCategory,
            category,
            sizeof(lastSentCategory) - 1
        );

        Serial.printf(
            "[ALERT] Queued %s at %.1f%%\n",
            category,
            bestConfidence * 100.0f
        );

    } else {

        Serial.println(
            "[ALERT] Network queue full; event not queued."
        );
    }
}

// ---------------- SETUP ----------------

void setup() {

    Serial.begin(115200);

    delay(1000);

    Serial.println(
        "\n=== SOUNDGUARD AUDIO PIPELINE DEBUG BUILD ==="
    );

    Serial.printf(
        "[MODEL] Frequency: %d Hz\n",
        EI_CLASSIFIER_FREQUENCY
    );

    Serial.printf(
        "[MODEL] Slice samples: %d\n",
        EI_CLASSIFIER_SLICE_SIZE
    );

    Serial.printf(
        "[MODEL] Classes: %d\n",
        EI_CLASSIFIER_LABEL_COUNT
    );

    if (EI_CLASSIFIER_FREQUENCY != 16000) {

        Serial.println(
            "[WARNING] Model is not configured for 16 kHz."
        );
    }

    connectWiFi();

    networkQueue = xQueueCreate(
        8,
        sizeof(DetectionEvent)
    );

    if (!networkQueue) {

        Serial.println(
            "[ERROR] Could not create network queue."
        );
    }

    xTaskCreate(
        networkTask,
        "SoundGuardNetwork",
        8192,
        nullptr,
        1,
        nullptr
    );

    run_classifier_init();

    audioSliceSamples = EI_CLASSIFIER_SLICE_SIZE;

    audioSlice = (int16_t *)heap_caps_malloc(
        audioSliceSamples * sizeof(int16_t),
        MALLOC_CAP_8BIT
    );

    if (!audioSlice) {

        Serial.printf(
            "[ERROR] Audio allocation failed for %u samples.\n",
            (unsigned)audioSliceSamples
        );

        while (true) {
            delay(1000);
        }
    }

    if (!initI2S(EI_CLASSIFIER_FREQUENCY)) {

        Serial.println(
            "[ERROR] I2S initialization failed."
        );

        while (true) {
            delay(1000);
        }
    }

    // Save the Arduino loop task handle for notifications.
    inferenceTaskHandle = xTaskGetCurrentTaskHandle();

    captureRunning = true;

    BaseType_t taskResult = xTaskCreate(
        captureTask,
        "SoundGuardCapture",
        8192,
        nullptr,
        5,
        &captureTaskHandle
    );

    if (taskResult != pdPASS) {

        Serial.println(
            "[ERROR] Could not create capture task."
        );

        while (true) {
            delay(1000);
        }
    }

    Serial.println(
        "[READY] Capture and inference started."
    );
}

// ---------------- MAIN INFERENCE LOOP ----------------

void loop() {

    // Wait until capture task provides a complete audio slice.
    ulTaskNotifyTake(
        pdTRUE,
        portMAX_DELAY
    );

    signal_t signal;

    signal.total_length = EI_CLASSIFIER_SLICE_SIZE;

    signal.get_data = &getAudioData;

    ei_impulse_result_t result = {};

    EI_IMPULSE_ERROR err =
        run_classifier_continuous(
            &signal,
            &result,
            false
        );

    if (err != EI_IMPULSE_OK) {

        Serial.printf(
            "[ERROR] Continuous classifier failed: %d\n",
            err
        );

    } else {

        Serial.printf(
            "\n[INFERENCE] DSP: %d ms | NN: %d ms\n",
            result.timing.dsp,
            result.timing.classification
        );

        processPrediction(result);
    }

    // Release the audio buffer for the next capture.
    xTaskNotifyGive(captureTaskHandle);
}

// ---------------- MODEL CHECK ----------------

#if !defined(EI_CLASSIFIER_SENSOR) || \
    EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_MICROPHONE

#error "This Edge Impulse model is not configured for microphone input."

#endif
