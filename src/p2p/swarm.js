import Hyperswarm from 'hyperswarm'
import { createHash } from 'node:crypto'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'
import { parseManifest } from './manifest.js'

export async function discoverPeers(timeout = 15_000) {
    const swarm = new Hyperswarm()
    const peers = []

    const topic = createHash('sha256')
        .update(CONFIG.p2p.topic)
        .digest()

    swarm.join(topic, { server: false, client: true })
    await swarm.flush()

    return new Promise((resolve, reject) => {
        const timer = setTimeout(async () => {
            await swarm.destroy()
            resolve(peers)
        }, timeout)

        swarm.on('connection', (socket) => {
            const chunks = []
            socket.on('data', (chunk) => chunks.push(chunk))
            socket.on('end', () => {
                try {
                    const manifest = parseManifest(Buffer.concat(chunks))
                    logger.info({ endpoint: manifest.endpoint }, 'Discovered peer')
                    peers.push(manifest)
                } catch (err) {
                    logger.warn({ err }, 'Failed to parse peer manifest')
                }
            })
        })

        swarm.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
    })
}