/**
 * MineGuard Mine Subsidence - Audible Alarm Synthesizer Service
 * 
 * SIREN ACTIVATION POLICY:
 * - Siren is activated ONLY when a CRITICAL / DANGER condition exists.
 * - In SAFE or WARNING mode, the buzzer/siren is completely SILENT.
 * - In CRITICAL / DANGER: Continuous 3000 Hz piercing piezo alarm from the critical node only.
 */

import { OverallRisk } from '../types';

class MineAudioAlarmService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = true; // Initially muted to comply with browser autoplay policy
  private currentMode: OverallRisk = 'SAFE';
  private activeNodeId: string | null = null;

  private criticalOsc: OscillatorNode | null = null;
  private criticalGain: GainNode | null = null;

  public init(): void {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.silenceAll();
    } else {
      this.applyAlarmState(this.currentMode, this.activeNodeId);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public updateAlarm(mode: OverallRisk, nodeId: string | null): void {
    this.currentMode = mode;
    this.activeNodeId = nodeId;

    if (this.isMuted || !this.audioCtx) {
      return;
    }

    this.applyAlarmState(mode, nodeId);
  }

  /**
   * SIREN RULE: Activated ONLY on CRITICAL / DANGER.
   * If WARNING or SAFE: silence all alarms.
   */
  private applyAlarmState(mode: OverallRisk, _nodeId: string | null): void {
    if (mode === 'DANGER') {
      this.startCritical3000Hz();
    } else {
      // In WARNING or SAFE: buzzer/siren is OFF
      this.silenceAll();
    }
  }

  private startCritical3000Hz(): void {
    if (this.criticalOsc) return; // Already sounding

    try {
      if (!this.audioCtx) return;
      this.criticalOsc = this.audioCtx.createOscillator();
      this.criticalGain = this.audioCtx.createGain();

      // Sharp piezo acoustic buzzer tone matching tone(BUZZER_PIN, 3000)
      this.criticalOsc.type = 'sawtooth';
      this.criticalOsc.frequency.setValueAtTime(3000, this.audioCtx.currentTime);

      this.criticalGain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);

      this.criticalOsc.connect(this.criticalGain);
      this.criticalGain.connect(this.audioCtx.destination);
      this.criticalOsc.start();
    } catch (err) {
      console.warn('Unable to start 3kHz critical siren:', err);
    }
  }

  public silenceAll(): void {
    if (this.criticalOsc) {
      try {
        this.criticalOsc.stop();
        this.criticalOsc.disconnect();
      } catch {
        // Ignored
      }
      this.criticalOsc = null;
      this.criticalGain = null;
    }
  }

  public triggerTestSiren(): void {
    this.init();
    this.isMuted = false;
    this.startCritical3000Hz();
    setTimeout(() => {
      this.applyAlarmState(this.currentMode, this.activeNodeId);
    }, 1500);
  }
}

export const audioAlarmService = new MineAudioAlarmService();
