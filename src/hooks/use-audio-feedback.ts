"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * Hook pour générer des micro-retours sonores via l'API Web Audio.
 * Cela évite de charger des MP3 et permet un contrôle ultra fin (durée, fréquence, type).
 */
export function useAudioFeedback() {
  const [isMuted, setIsMuted] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  // Initialisation paresseuse de l'AudioContext au premier clic pour contourner les bloqueurs de lecture auto
  const initAudio = useCallback(() => {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) setAudioCtx(new Ctx());
    }
  }, [audioCtx]);

  useEffect(() => {
    // Si l'utilisateur préfère réduire les mouvements ou désactive le son globalement côté OS, on mute par défaut
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsMuted(true);
    }
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    if (isMuted || !audioCtx) return;

    try {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  }, [audioCtx, isMuted]);

  return {
    isMuted,
    toggleMute: () => setIsMuted((m) => !m),
    initAudio,
    // Sons prédéfinis très discrets
    playClick: () => playTone(600, "sine", 0.05, 0.05),
    playSuccess: () => {
      playTone(400, "sine", 0.1, 0.05);
      setTimeout(() => playTone(600, "sine", 0.15, 0.05), 100);
    },
    playError: () => {
      playTone(200, "sawtooth", 0.1, 0.05);
      setTimeout(() => playTone(150, "sawtooth", 0.2, 0.05), 100);
    }
  };
}
