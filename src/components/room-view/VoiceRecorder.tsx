"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  FaMicrophone,
  FaStop,
  FaPlay,
  FaPause,
  FaTrashAlt,
  FaPaperPlane,
  FaTimes,
} from "@/components/Icons";

interface VoiceRecorderProps {
  onSend: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
  disabled?: boolean;
}

type RecorderState = "idle" | "recording" | "preview";

export default function VoiceRecorder({
  onSend,
  onCancel,
  disabled,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const isHoldingRef = useRef(false);
  const startTimeRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(holdTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const TYPES = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/webm",
        "audio/mpeg",
        "",
      ];
      const mimeType =
        TYPES.find((t) => t === "" || MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      startTimeRef.current = Date.now();
      setElapsed(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setState("preview");
  }, []);

  const discardRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioBlob(null);
    setElapsed(0);
    setPreviewTime(0);
    setPreviewPlaying(false);
    setState("idle");
    onCancel();
  }, [onCancel]);

  const handleSend = useCallback(() => {
    if (!audioBlob) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    onSend(audioBlob, elapsed);
    setAudioBlob(null);
    setElapsed(0);
    setPreviewTime(0);
    setPreviewPlaying(false);
    setState("idle");
  }, [audioBlob, elapsed, onSend]);

  const togglePreview = useCallback(() => {
    if (!audioBlob) return;

    if (previewPlaying) {
      audioRef.current?.pause();
      setPreviewPlaying(false);
      return;
    }

    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => setPreviewTime(Math.floor(audio.currentTime));
    audio.onended = () => {
      setPreviewPlaying(false);
      setPreviewTime(0);
      URL.revokeObjectURL(url);
    };
    audio.play();
    setPreviewPlaying(true);
  }, [audioBlob, previewPlaying]);

  // Hold-to-record handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || state !== "idle") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isHoldingRef.current = true;

      // Small delay to distinguish tap vs hold
      holdTimerRef.current = setTimeout(() => {
        if (isHoldingRef.current) {
          startRecording();
        }
      }, 180);
    },
    [disabled, state, startRecording],
  );

  const handlePointerUp = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    isHoldingRef.current = false;

    if (state === "recording") {
      // If recorded less than 0.5s, discard
      if (Date.now() - startTimeRef.current < 500) {
        discardRecording();
      } else {
        stopRecording();
      }
    }
  }, [state, stopRecording, discardRecording]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Recording state ───
  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        {/* Pulsing red dot */}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[12px] font-mono text-red-400 min-w-[36px]">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Waveform placeholder */}
        <div className="flex-1 flex items-center gap-[2px] h-6 px-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-red-400/60"
              style={{
                height: `${6 + Math.sin((Date.now() / 150 + i) * 0.8) * 8 + Math.random() * 4}px`,
                transition: "height 0.15s ease",
              }}
            />
          ))}
        </div>

        {/* Discard */}
        <button
          type="button"
          onClick={discardRecording}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Discard"
        >
          <FaTrashAlt size={13} />
        </button>

        {/* Stop & preview */}
        <button
          type="button"
          onClick={stopRecording}
          className="p-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
          title="Stop recording"
        >
          <FaStop size={13} />
        </button>
      </div>
    );
  }

  // ─── Preview state ───
  if (state === "preview" && audioBlob) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePreview}
          className="p-1.5 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors"
          title={previewPlaying ? "Pause" : "Listen"}
        >
          {previewPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
        </button>

        {/* Time / Duration */}
        <span className="text-[12px] font-mono text-[var(--text-secondary)] min-w-[60px]">
          {formatTime(previewPlaying ? previewTime : 0)} / {formatTime(elapsed)}
        </span>

        {/* Simple progress bar */}
        <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-200"
            style={{
              width:
                elapsed > 0
                  ? `${((previewPlaying ? previewTime : 0) / elapsed) * 100}%`
                  : "0%",
            }}
          />
        </div>

        {/* Discard */}
        <button
          type="button"
          onClick={discardRecording}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Discard"
        >
          <FaTrashAlt size={13} />
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={handleSend}
          className="p-1.5 bg-[var(--accent)] rounded-md text-white hover:bg-[var(--accent-hover)] transition-colors"
          title="Send voice note"
        >
          <FaPaperPlane size={13} />
        </button>
      </div>
    );
  }

  // ─── Idle state: just the mic button (rendered by ChatInput) ───
  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-30 select-none touch-none"
      title="Hold to record voice note"
    >
      <FaMicrophone size={14} />
    </button>
  );
}
