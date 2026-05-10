import { translate } from '../../../qvac/skills/translate.js'
import { x402Gate } from '../middleware/x402.js'
import { recordEarning } from '../../shared/store.js'
import { CONFIG } from '../../shared/config.js'
import { logger } from '../../shared/logger.js'

export async function translateRoute(fastify) {
    fastify.post('/translate',
        { preHandler: x402Gate('translate', CONFIG.x402.prices.translate) },
        async (request, reply) => {
            const { text, targetLanguage = 'Malayalam' } = request.body

            if (!text) return reply.code(400).send({ error: 'text is required' })

            logger.info({ skill: 'translate', targetLanguage }, 'Running QVAC inference')

            const result = await translate(text, targetLanguage)

            const earning = recordEarning({
                skill: 'translate',
                amount: parseFloat(CONFIG.x402.prices.translate),
                sig: request.payment?.signature ?? 'devnet-test',
                payer: request.payment?.payer ?? 'unknown',
            })

            logger.info({ total: earning.total }, 'Payment recorded')

            return { result, skill: 'translate', model: CONFIG.qvac.model }
        },
    )
}