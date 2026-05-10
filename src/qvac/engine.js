import {
    loadModel, completion, speechToText, unloadModel,
    LLAMA_3_2_1B_INST_Q4_0,
} from '@qvac/sdk'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'

const MODELS = { LLAMA_3_2_1B_INST_Q4_0 }

let modelId = null

export async function initEngine() {
    const modelSrc = MODELS[CONFIG.qvac.model] ?? LLAMA_3_2_1B_INST_Q4_0
    logger.info('Loading QVAC model locally...')
    modelId = await loadModel({
        modelSrc,
        modelType: 'llm',
        onProgress: ({ percent }) => {
            if (percent % 25 === 0) logger.info(`Model load: ${percent}%`)
        },
    })
    logger.info('QVAC model ready — running 100% on-device')
}

export async function infer(messages) {
    if (!modelId) throw new Error('Engine not initialised')
    const result = completion({ modelId, history: messages, stream: false })
    return result.text.trim()
}

export async function transcribeAudio(audioBuffer) {
    if (!modelId) throw new Error('Engine not initialised')
    const result = await speechToText({ modelId, audio: audioBuffer })
    return result.text.trim()
}

export async function shutdown() {
    if (modelId) {
        await unloadModel({ modelId })
        modelId = null
        logger.info('QVAC model unloaded')
    }
}