import { transcribe } from '../../qvac/skills/transcribe.js'
import { x402Gate } from '../middleware/x402.js'
import { recordEarning } from '../../shared/store.js'
import { CONFIG } from '../../shared/config.js'
import { logger } from '../../shared/logger.js'

export async function transcribeRoute(fastify) {
    fastify.post('/transcribe',
        { preHandler: x402Gate('transcribe', CONFIG.x402.prices.transcribe) },
        async (request, reply) => {
            const { audioBase64 } = request.body

            if (!audioBase64) return reply.code(400).send({ error: 'audioBase64 is required' })

            logger.info({ skill: 'transcribe' }, 'Running QVAC inference')

            const audioBuffer = Buffer.from(audioBase64, 'base64')
            const result = await transcribe(audioBuffer)

            const earning = recordEarning({
                skill: 'transcribe',
                amount: parseFloat(CONFIG.x402.prices.transcribe),
                sig: request.payment?.signature ?? 'devnet-test',
                payer: request.payment?.payer ?? 'unknown',
            })

            logger.info({ total: earning.total }, 'Payment recorded')

            return { result, skill: 'transcribe', model: CONFIG.qvac.model }
        },
    )
}
