import Fastify from 'fastify'
import cors from '@fastify/cors'

import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'
import { initEngine, shutdown } from '../qvac/engine.js'
import { loadWallet } from '../solana/keystore.js'
import { announceToSwarm, destroySwarm } from './announce.js'
import { translateRoute } from './routes/translate.js'
import { summariseRoute } from './routes/summarise.js'
import { transcribeRoute } from './routes/transcribe.js'

const fastify = Fastify({ logger: false })
await fastify.register(cors)

// Load server wallet — attach to fastify instance so routes can access it
fastify.decorate('serverWallet', loadWallet(
    CONFIG.keystore.serverPath,
    CONFIG.keystore.passphrase,
))

logger.info(`Server wallet: ${fastify.serverWallet.publicKey.toBase58()}`)

// Register routes
await fastify.register(translateRoute)
await fastify.register(summariseRoute)
await fastify.register(transcribeRoute)

// Health check
fastify.get('/health', async () => ({
    status: 'ok',
    wallet: fastify.serverWallet.publicKey.toBase58(),
    skills: Object.keys(CONFIG.x402.prices),
}))

// Boot sequence
await initEngine()
await fastify.listen({ port: CONFIG.server.port, host: CONFIG.server.host })
logger.info(`Sovereign skill server on :${CONFIG.server.port}`)

await announceToSwarm(fastify.serverWallet, CONFIG.server.port)

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
        logger.info('Shutting down...')
        await destroySwarm()
        await shutdown()
        await fastify.close()
        process.exit(0)
    })
}