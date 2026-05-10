// Transcription via QVAC requires loading a separate Whisper model.

export async function transcribe(audioBuffer) {
    throw new Error(
        'Transcription requires a separate Whisper model. ' +
        'You can use other features in /translate and /summarise — those run through the LLM.'
    )
}