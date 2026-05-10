import { infer } from '../engine.js'

export async function summarise(text, sentences = 3) {
    return infer([{
        role: 'system',
        content: 'You are an expert summariser. Return only the summary, no preamble.',
    }, {
        role: 'user',
        content: `Summarise the following in ${sentences} sentences:\n\n${text}`,
    }])
}