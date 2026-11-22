// Web Audio API & Haptic Vibration Assistive Service

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playAlertNotification(soundCategory = 'door_knock', priority = 'medium') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (soundCategory === 'alarm_bell' || priority === 'critical') {
      // Urgent double high beep
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1760, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);

      // Repeat second pulse
      setTimeout(() => {
        if (!audioCtx) return;
        const now2 = audioCtx.currentTime;
        const o3 = audioCtx.createOscillator();
        const g3 = audioCtx.createGain();
        o3.type = 'sawtooth';
        o3.frequency.setValueAtTime(987, now2);
        g3.gain.setValueAtTime(0.35, now2);
        g3.gain.exponentialRampToValueAtTime(0.01, now2 + 0.4);
        o3.connect(g3);
        g3.connect(audioCtx.destination);
        o3.start(now2);
        o3.stop(now2 + 0.4);
      }, 250);

    } else if (soundCategory === 'crying_baby' || priority === 'high') {
      // Gentle wavering acoustic pulse
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.linearRampToValueAtTime(700, now + 0.2);
      osc.frequency.linearRampToValueAtTime(520, now + 0.4);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

    } else if (soundCategory === 'door_knock') {
      // Resonant 2-pulse acoustic knock chime
      [0, 180].forEach(delayMs => {
        setTimeout(() => {
          if (!audioCtx) return;
          const t = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, t);
          osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);

          gain.gain.setValueAtTime(0.3, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.13);
        }, delayMs);
      });

    } else {
      // Clapping / generic notification pleasant chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.warn('[Audio Alert] Could not play chime:', err.message);
  }
}

export function triggerTactileVibration(soundCategory = 'door_knock', priority = 'medium') {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      if (soundCategory === 'alarm_bell' || priority === 'critical') {
        // Urgent staccato vibration pattern
        navigator.vibrate([200, 100, 200, 100, 400]);
      } else if (soundCategory === 'crying_baby' || priority === 'high') {
        navigator.vibrate([150, 80, 250]);
      } else if (soundCategory === 'door_knock') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate([120]);
      }
    } catch (e) {
      // Ignore vibration errors on unprivileged browsers
    }
  }
}
