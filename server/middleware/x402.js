import { verifyPayment } from '@coinbase/x402'
import { CONFIG } from '../../shared/config.js'
import { logger } from '../../shared/logger.js'

/**
 * Fastify plugin — gates a route behind x402 payment.
 * Usage: fastify.addHook('preHandler', x402Gate(skill, priceUSDC))
 */
export function x402Gate(skill, priceUSDC) {
    return async function (request, reply) {
        const paymentHeader = request.headers['x-payment']

        if (!paymentHeader) {
            return reply.code(402).send({
                x402Version: 1,
                accepts: [{
                    scheme: 'exact',
                    network: CONFIG.solana.network === 'mainnet' ? 'solana' : 'solana-devnet',
                    maxAmountRequired: String(Math.round(parseFloat(priceUSDC) * 1_000_000)),
                    resource: request.url,
                    description: `Sovereign AI — ${skill}`,
                    mimeType: 'application/json',
                    payTo: request.server.serverWallet.publicKey.toBase58(),
                    maxTimeoutSeconds: 300,
                    asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
                    extra: {
                        name: 'USD Coin',
                        version: '2',
                    },
                }],
                error: 'Payment required',
            })
        }

        try {
            const result = await verifyPayment(
                paymentHeader,
                CONFIG.x402.facilitator,
            )
            if (!result.isValid) {
                return reply.code(402).send({ error: 'Invalid payment', details: result })
            }
            request.payment = result
            request.paymentSkill = skill
        } catch (err) {
            logger.error({ err }, 'Payment verification failed')
            return reply.code(402).send({ error: 'Payment verification error' })
        }
    }
}