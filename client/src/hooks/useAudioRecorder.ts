import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "stopped" | "error";

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(28).fill(0.12));
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const closeAudio = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    contextRef.current?.close().catch(() => undefined);
    contextRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser does not support microphone recording.");
      setStatus("error");
      return false;
    }
    try {
      setError(null);
      setStatus("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        const context = new AudioContextClass();
        contextRef.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          analyser.getByteFrequencyData(data);
          const bucketSize = Math.floor(data.length / 28);
          setLevels(Array.from({ length: 28 }, (_, i) => {
            const startIndex = i * bucketSize;
            const average = data.slice(startIndex, startIndex + bucketSize).reduce((sum, point) => sum + point, 0) / Math.max(bucketSize, 1);
            return Math.max(0.1, Math.min(1, average / 120));
          }));
          animationRef.current = requestAnimationFrame(draw);
        };
        draw();
      }
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingBlob(blob);
        setRecordingUrl(current => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob); });
        setLevels(Array(28).fill(0.12));
        closeAudio();
        setStatus("stopped");
      };
      recorder.start(250);
      setStatus("recording");
      return true;
    } catch (caught) {
      closeAudio();
      const message = caught instanceof DOMException && caught.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser settings, then try again." : "We could not start your microphone. Please check your audio device and try again.";
      setError(message);
      setStatus("error");
      return false;
    }
  }, [closeAudio]);

  const pause = useCallback(() => {
    if (recorderRef.current?.state === "recording") { recorderRef.current.pause(); setStatus("paused"); }
  }, []);
  const resume = useCallback(() => {
    if (recorderRef.current?.state === "paused") { recorderRef.current.resume(); setStatus("recording"); }
  }, []);
  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }, []);
  const reset = useCallback(() => {
    stop();
    setRecordingUrl(current => { if (current) URL.revokeObjectURL(current); return null; });
    setRecordingBlob(null);
    setLevels(Array(28).fill(0.12));
    setError(null);
    setStatus("idle");
  }, [stop]);

  useEffect(() => () => { closeAudio(); if (recordingUrl) URL.revokeObjectURL(recordingUrl); }, [closeAudio, recordingUrl]);
  return { status, recordingUrl, recordingBlob, levels, error, start, pause, resume, stop, reset };
}
