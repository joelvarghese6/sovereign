import { transcribeAudio } from '../engine.js'

export async function transcribe(audioBuffer) {
    return transcribeAudio(audioBuffer)
}