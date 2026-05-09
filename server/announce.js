import Hyperswarm from 'hyperswarm'
import { createHash } from 'node:crypto'
import b4a from 'b4a'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'

let swarm = null

export async function announceToSwarm(serverWallet, port) {
    swarm = new Hyperswarm()

    const topic = createHash('sha256')
        .update(CONFIG.p2p.topic)
        .digest()

    const manifest = JSON.stringify({
        version: 1,
        name: 'Sovereign Node',
        endpoint: `http://0.0.0.0:${port}`,
        wallet: serverWallet.publicKey.toBase58(),
        skills: [
            { name: 'translate', path: '/translate', priceUSDC: CONFIG.x402.prices.translate },
            { name: 'summarise', path: '/summarise', priceUSDC: CONFIG.x402.prices.summarise },
            { name: 'transcribe', path: '/transcribe', priceUSDC: CONFIG.x402.prices.transcribe },
        ],
        ts: Date.now(),
    })

    swarm.join(topic, { server: true, client: false })

    swarm.on('connection', (socket) => {
        logger.info('Peer connected — sending manifest')
        socket.write(b4a.from(manifest))
        socket.end()
    })

    await swarm.flush()
    logger.info('Announced to Hyperswarm DHT')

    return swarm
}

export async function destroySwarm() {
    if (swarm) {
        await swarm.destroy()
        swarm = null
    }
}