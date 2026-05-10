import * as qvac from '@qvac/sdk'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'

let modelId = null

export async function initEngine() {
    const modelKey = CONFIG.qvac.model
    const modelSrc = qvac[modelKey]
    if (!modelSrc) {
        throw new Error(`Unknown QVAC model: ${modelKey}. Check QVAC_MODEL in .env`)
    }
    logger.info({ model: modelKey }, 'Loading QVAC model locally...')
    modelId = await qvac.loadModel({
        modelSrc,
        modelType: 'llamacpp-completion',
        onProgress: ({ percent }) => {
            if (percent % 25 === 0) logger.info(`Model load: ${percent}%`)
        },
    })
    logger.info('QVAC model ready — running 100% on-device')
}

export async function infer(messages) {
    if (!modelId) throw new Error('Engine not initialised — call initEngine() first')

    const result = qvac.completion({ modelId, history: messages, stream: true })

    let text = ''
    for await (const token of result.tokenStream) {
        text += token
    }
    return text.trim()
}

export async function shutdown() {
    if (modelId) {
        await qvac.unloadModel({ modelId })
        modelId = null
        logger.info('QVAC model unloaded')
    }
}