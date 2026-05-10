import { summarise } from '../../qvac/skills/summarise.js'
import { x402Gate } from '../middleware/x402.js'
import { recordEarning } from '../../shared/store.js'
import { CONFIG } from '../../shared/config.js'
import { logger } from '../../shared/logger.js'

export async function summariseRoute(fastify) {
    fastify.post('/summarise',
        { preHandler: x402Gate('summarise', CONFIG.x402.prices.summarise) },
        async (request, reply) => {
            const { text, sentences = 3 } = request.body

            if (!text) return reply.code(400).send({ error: 'text is required' })

            logger.info({ skill: 'summarise', sentences }, 'Running QVAC inference')

            const result = await summarise(text, sentences)

            const earning = recordEarning({
                skill: 'summarise',
                amount: parseFloat(CONFIG.x402.prices.summarise),
                sig: request.payment?.signature ?? 'devnet-test',
                payer: request.payment?.payer ?? 'unknown',
            })

            logger.info({ total: earning.total }, 'Payment recorded')

            return { result, skill: 'summarise', model: CONFIG.qvac.model }
        },
    )
}
