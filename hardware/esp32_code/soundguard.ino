/* Edge Impulse Arduino continuous inference + SoundGuard IoT Integration
 * Microcontroller: ESP32-WROOM-32
 * Microphone: ICS-43434 I2S MEMS (SCK: 26, WS: 32, SD: 33)
 * Project: SoundGuard Assistive Sound Alert System
 */

#define EIDSP_QUANTIZE_FILTERBANK   0

/* Includes ---------------------------------------------------------------- */
#include <gauravirus-project-1_inferencing.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s.h"

// SoundGuard Wi-Fi & HTTP Client Libraries
#include <WiFi.h>
#include <HTTPClient.h>

// ============================================================================
// 1. SOUNDGUARD WI-FI & SERVER CONFIGURATION
// ============================================================================
const char* ssid     = "YOUR_WIFI_NAME";        // <-- Replace with your Wi-Fi SSID (2.4 GHz)
const char* password = "YOUR_WIFI_PASSWORD";    // <-- Replace with your Wi-Fi Password

// Laptop IPv4 Address (from running `ipconfig` in Windows Command Prompt)
// IMPORTANT: Do NOT use localhost. Use your laptop's Wi-Fi IP (e.g. "172.16.51.84" or "192.168.1.105")
const char* serverIP = "172.16.51.84";          // <-- Configured from your Wi-Fi IPv4
const int serverPort = 5000;

const char* deviceId = "soundguard_01";
const char* firmwareVersion = "1.2.0-TinyML";

// Only report sounds above this confidence score (0.00 to 1.00)
const float CONFIDENCE_THRESHOLD = 0.70;

// Cooldown to prevent duplicate HTTP alerts for the same continuous sound (2.5 seconds)
const unsigned long COOLDOWN_MS = 2500;
const unsigned long HEARTBEAT_INTERVAL_MS = 10000; // Heartbeat every 10 seconds

unsigned long lastHeartbeatTime = 0;
unsigned long lastDetectionTime = 0;
String lastDetectedCategory = "";

// ============================================================================
// 2. EDGE IMPULSE LABEL MAPPING
// ============================================================================
/**
 * Maps your Edge Impulse project labels to the 4 SoundGuard canonical categories:
 *   - "door_knock"
 *   - "clapping"
 *   - "crying_baby"
 *   - "alarm_bell"
 */
const char* mapEdgeImpulseLabel(const char* rawLabel) {
    if (strcmp(rawLabel, "door_knock") == 0 || strcmp(rawLabel, "knock") == 0 || strcmp(rawLabel, "knocking") == 0) {
        return "door_knock";
    }
    if (strcmp(rawLabel, "clapping") == 0 || strcmp(rawLabel, "clap") == 0 || strcmp(rawLabel, "applause") == 0) {
        return "clapping";
    }
    if (strcmp(rawLabel, "crying_baby") == 0 || strcmp(rawLabel, "baby_crying") == 0 || strcmp(rawLabel, "baby_cry") == 0 || strcmp(rawLabel, "crying") == 0) {
        return "crying_baby";
    }
    if (strcmp(rawLabel, "alarm_bell") == 0 || strcmp(rawLabel, "bell_alarm") == 0 || strcmp(rawLabel, "alarm") == 0 || strcmp(rawLabel, "bell") == 0 || strcmp(rawLabel, "fire_alarm") == 0) {
        return "alarm_bell";
    }
    return NULL; // Ignore background noise / unknown classes
}

// ============================================================================
// 3. SOUNDGUARD WI-FI & TELEMETRY FUNCTIONS
// ============================================================================
void connectToWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;

    ei_printf("\n[WiFi] Connecting to %s", ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        ei_printf("\n[WiFi] Connected! ESP32 IP: %s (RSSI: %d dBm)\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        ei_printf("\n[WiFi] Connection timed out. Will retry in loop.\n");
    }
}

void sendHeartbeat() {
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = String("http://") + serverIP + ":" + serverPort + "/api/device/heartbeat";
    http.setTimeout(1500); // 1.5s non-blocking timeout
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"device_id\":\"" + String(deviceId) + "\",\"status\":\"online\",\"wifi_rssi\":" + String(WiFi.RSSI()) + ",\"firmware_version\":\"" + String(firmwareVersion) + "\"}";
    int code = http.POST(payload);
    if (code > 0) {
        ei_printf("[SoundGuard] Heartbeat sent (HTTP %d)\n", code);
    }
    http.end();
}

void sendDetectionToServer(const char* rawLabel, float confidence) {
    if (confidence < CONFIDENCE_THRESHOLD) return;

    const char* category = mapEdgeImpulseLabel(rawLabel);
    if (category == NULL) return; // Not a target sound

    // Cooldown check: ignore if sent within last 2.5s
    unsigned long now = millis();
    if (String(category) == lastDetectedCategory && (now - lastDetectionTime < COOLDOWN_MS)) {
        return;
    }

    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    String url = String("http://") + serverIP + ":" + serverPort + "/api/detections";
    http.setTimeout(2000); // 2s timeout
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"device_id\":\"" + String(deviceId) + "\",\"sound\":\"" + String(category) + "\",\"confidence\":" + String(confidence, 4) + ",\"timestamp\":" + String(now / 1000) + "}";

    ei_printf("\n>>> [ALERT] Transmitting %s (%.1f%%) to SoundGuard...\n", category, confidence * 100.0);
    int code = http.POST(payload);
    if (code == 200 || code == 201) {
        ei_printf(">>> [ALERT] Dispatched to website successfully (HTTP %d)!\n", code);
        lastDetectionTime = now;
        lastDetectedCategory = category;
    } else {
        ei_printf(">>> [ALERT] Failed to dispatch, HTTP code: %d\n", code);
    }
    http.end();
}

// ============================================================================
// 4. AUDIO INFERENCE BUFFERS & STRUCTURES
// ============================================================================
typedef struct {
    signed short *buffers[2];
    unsigned char buf_select;
    unsigned char buf_ready;
    unsigned int buf_count;
    unsigned int n_samples;
} inference_t;

static inference_t inference;
static const uint32_t sample_buffer_size = 2048;
static signed short sampleBuffer[sample_buffer_size];
static bool debug_nn = false;
static int print_results = -(EI_CLASSIFIER_SLICES_PER_MODEL_WINDOW);
static bool record_status = true;

// Forward declarations
static bool microphone_inference_start(uint32_t n_samples);
static bool microphone_inference_record(void);
static int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr);
static void microphone_inference_end(void);
static int i2s_init(uint32_t sampling_rate);
static int i2s_deinit(void);

/**
 * @brief      Arduino setup function
 */
void setup()
{
    Serial.begin(115200);
    while (!Serial && millis() < 2000);
    Serial.println("\n==========================================");
    Serial.println("  SoundGuard Assistive Sound Classifier");
    Serial.println("==========================================");

    // 1. Connect to Wi-Fi & send initial heartbeat
    connectToWiFi();
    if (WiFi.status() == WL_CONNECTED) {
        sendHeartbeat();
        lastHeartbeatTime = millis();
    }

    // 2. Summary of Edge Impulse inferencing settings
    ei_printf("Inferencing settings:\n");
    ei_printf("\tInterval: ");
    ei_printf_float((float)EI_CLASSIFIER_INTERVAL_MS);
    ei_printf(" ms.\n");
    ei_printf("\tFrame size: %d\n", EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE);
    ei_printf("\tSample length: %d ms.\n", EI_CLASSIFIER_RAW_SAMPLE_COUNT / 16);
    ei_printf("\tNo. of classes: %d\n", sizeof(ei_classifier_inferencing_categories) / sizeof(ei_classifier_inferencing_categories[0]));

    run_classifier_init();
    ei_printf("\nStarting continuous inference in 2 seconds...\n");
    ei_sleep(2000);

    if (microphone_inference_start(EI_CLASSIFIER_SLICE_SIZE) == false) {
        ei_printf("ERR: Could not allocate audio buffer (size %d)\r\n", EI_CLASSIFIER_RAW_SAMPLE_COUNT);
        return;
    }

    ei_printf("Listening for environmental sounds...\n");
}

/**
 * @brief      Arduino main function. Runs the inferencing loop.
 */
void loop()
{
    // Check Wi-Fi connection and send 10s heartbeat
    if (WiFi.status() != WL_CONNECTED) {
        WiFi.reconnect();
    }
    unsigned long now = millis();
    if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
        sendHeartbeat();
        lastHeartbeatTime = now;
    }

    // Record audio slice
    bool m = microphone_inference_record();
    if (!m) {
        ei_printf("ERR: Failed to record audio...\n");
        return;
    }

    signal_t signal;
    signal.total_length = EI_CLASSIFIER_SLICE_SIZE;
    signal.get_data = &microphone_audio_signal_get_data;
    ei_impulse_result_t result = {0};

    // Run continuous classifier
    EI_IMPULSE_ERROR r = run_classifier_continuous(&signal, &result, debug_nn);
    if (r != EI_IMPULSE_OK) {
        ei_printf("ERR: Failed to run classifier (%d)\n", r);
        return;
    }

    // Check predictions and dispatch alerts to SoundGuard website
    const char* bestLabel = NULL;
    float bestConfidence = 0.0;

    for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
        if (result.classification[ix].value > bestConfidence) {
            bestConfidence = result.classification[ix].value;
            bestLabel = result.classification[ix].label;
        }
    }

    // If the top predicted sound exceeds our threshold, send to website
    if (bestLabel != NULL && bestConfidence >= CONFIDENCE_THRESHOLD) {
        sendDetectionToServer(bestLabel, bestConfidence);
    }

    // Optional console printout
    if (++print_results >= (EI_CLASSIFIER_SLICES_PER_MODEL_WINDOW)) {
        ei_printf("Predictions (DSP: %d ms, NN: %d ms):\n", result.timing.dsp, result.timing.classification);
        for (size_t ix = 0; ix < EI_CLASSIFIER_LABEL_COUNT; ix++) {
            ei_printf("    %s: ", result.classification[ix].label);
            ei_printf_float(result.classification[ix].value);
            ei_printf("\n");
        }
        print_results = 0;
    }
}

static void audio_inference_callback(uint32_t n_bytes)
{
    for(int i = 0; i < n_bytes>>1; i++) {
        inference.buffers[inference.buf_select][inference.buf_count++] = sampleBuffer[i];

        if(inference.buf_count >= inference.n_samples) {
            inference.buf_select ^= 1;
            inference.buf_count = 0;
            inference.buf_ready = 1;
        }
    }
}

static void capture_samples(void* arg) {
  const int32_t i2s_bytes_to_read = (uint32_t)arg;
  size_t bytes_read = i2s_bytes_to_read;

  while (record_status) {
    i2s_read((i2s_port_t)1, (void*)sampleBuffer, i2s_bytes_to_read, &bytes_read, 100);

    if (bytes_read <= 0) {
      ei_printf("Error in I2S read : %d", bytes_read);
    } else {
        if (bytes_read < i2s_bytes_to_read) {
          ei_printf("Partial I2S read");
        }

        // scale the data (otherwise the sound is too quiet)
        for (int x = 0; x < i2s_bytes_to_read/2; x++) {
            sampleBuffer[x] = (int16_t)(sampleBuffer[x]) * 8;
        }

        if (record_status) {
            audio_inference_callback(i2s_bytes_to_read);
        } else {
            break;
        }
    }
  }
  vTaskDelete(NULL);
}

static bool microphone_inference_start(uint32_t n_samples)
{
    inference.buffers[0] = (signed short *)malloc(n_samples * sizeof(signed short));
    if (inference.buffers[0] == NULL) return false;

    inference.buffers[1] = (signed short *)malloc(n_samples * sizeof(signed short));
    if (inference.buffers[1] == NULL) {
        ei_free(inference.buffers[0]);
        return false;
    }

    inference.buf_select = 0;
    inference.buf_count = 0;
    inference.n_samples = n_samples;
    inference.buf_ready = 0;

    if (i2s_init(EI_CLASSIFIER_FREQUENCY)) {
        ei_printf("Failed to start I2S!");
    }

    ei_sleep(100);
    record_status = true;

    xTaskCreate(capture_samples, "CaptureSamples", 1024 * 32, (void*)sample_buffer_size, 10, NULL);
    return true;
}

static bool microphone_inference_record(void)
{
    bool ret = true;
    if (inference.buf_ready == 1) {
        ret = false;
    }

    while (inference.buf_ready == 0) {
        delay(1);
    }

    inference.buf_ready = 0;
    return ret;
}

static int microphone_audio_signal_get_data(size_t offset, size_t length, float *out_ptr)
{
    numpy::int16_to_float(&inference.buffers[inference.buf_select ^ 1][offset], out_ptr, length);
    return 0;
}

static void microphone_inference_end(void)
{
    i2s_deinit();
    ei_free(inference.buffers[0]);
    ei_free(inference.buffers[1]);
}

static int i2s_init(uint32_t sampling_rate) {
  i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_TX),
      .sample_rate = sampling_rate,
      .bits_per_sample = (i2s_bits_per_sample_t)16,
      .channel_format = I2S_CHANNEL_FMT_ONLY_RIGHT,
      .communication_format = I2S_COMM_FORMAT_I2S,
      .intr_alloc_flags = 0,
      .dma_buf_count = 8,
      .dma_buf_len = 512,
      .use_apll = false,
      .tx_desc_auto_clear = false,
      .fixed_mclk = -1,
  };
  i2s_pin_config_t pin_config = {
      .bck_io_num = 26,    // IIS_SCLK
      .ws_io_num = 32,     // IIS_LCLK
      .data_out_num = -1,  // IIS_DSIN
      .data_in_num = 33,   // IIS_DOUT
  };
  esp_err_t ret = 0;

  ret = i2s_driver_install((i2s_port_t)1, &i2s_config, 0, NULL);
  if (ret != ESP_OK) {
    ei_printf("Error in i2s_driver_install");
  }

  ret = i2s_set_pin((i2s_port_t)1, &pin_config);
  if (ret != ESP_OK) {
    ei_printf("Error in i2s_set_pin");
  }

  ret = i2s_zero_dma_buffer((i2s_port_t)1);
  if (ret != ESP_OK) {
    ei_printf("Error in initializing dma buffer with 0");
  }

  return int(ret);
}

static int i2s_deinit(void) {
    i2s_driver_uninstall((i2s_port_t)1);
    return 0;
}

#if !defined(EI_CLASSIFIER_SENSOR) || EI_CLASSIFIER_SENSOR != EI_CLASSIFIER_SENSOR_MICROPHONE
#error "Invalid model for current sensor."
#endif
