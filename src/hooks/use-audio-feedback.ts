"use client";

/**
 * Signaux sonores du checkout (ADR-0020, D1) : discrets, DÉSACTIVÉS par défaut, préférence mémorisée.
 * Générés par le navigateur (aucun fichier) ; le navigateur n'autorise le son qu'après une interaction.
 */
import { useCallback, useRef, useSyncExternalStore } from "react";

const KEY = "sl-checkout-sound";

const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) === "on"; } catch { return false; } };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };

export function useAudioFeedback() {
  // Préférence partagée par toute la page (et désactivée côté serveur : aucun écart à l'hydratation).
  const enabled = useSyncExternalStore(subscribe, read, () => false);
  const ctxRef = useRef<AudioContext | null>(null);

  const ensure = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  };

  const notes = useCallback((freqs: number[], { gap = 0.09, length = 0.16, volume = 0.07, wave = "sine" as OscillatorType } = {}) => {
    if (!enabled) return;
    const ctx = ensure();
    if (!ctx) return;
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = f;
      const t = ctx.currentTime + i * gap;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + length + 0.02);
    });
  }, [enabled]);

  const toggle = useCallback(() => {
    try { localStorage.setItem(KEY, read() ? "off" : "on"); } catch { /* sans conséquence */ }
    listeners.forEach((l) => l());
  }, []);

  return {
    enabled,
    toggle,
    tap: useCallback(() => notes([660], { length: 0.06, volume: 0.04 }), [notes]),
    success: useCallback(() => notes([523, 659, 784]), [notes]),
    error: useCallback(() => notes([330, 262], { wave: "triangle", gap: 0.12 }), [notes]),
    celebrate: useCallback(() => notes([523, 659, 784, 1047], { gap: 0.08, length: 0.22 }), [notes]),
  };
}
