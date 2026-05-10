import { infer } from '../engine.js'

export async function translate(text, targetLanguage) {
    return infer([{
        role: 'system',
        content: 'You are a professional translator. Translate the given text accurately. Return only the translation, nothing else.',
    }, {
        role: 'user',
        content: `Translate this to ${targetLanguage}:\n\n${text}`,
    }])
}