import { transcribeAudio } from "../_core/voiceTranscription";

export async function transcribePracticeRecording(recordingUrl: string) {
  return transcribeAudio({
    audioUrl: recordingUrl,
    language: "en",
    prompt: "Transcribe a student practicing a public speaking response. Preserve spoken filler words such as um, uh, and like.",
  });
}
