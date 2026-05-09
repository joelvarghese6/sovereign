import Hyperswarm from 'hyperswarm'
import { createHash } from 'node:crypto'
import b4a from 'b4a'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'

export async function discoverPeers(timeout = 15_000) {
    return new Promise((resolve, reject) => {
        const swarm = new Hyperswarm()
        const peers = []
        const timer = setTimeout(async () => {
            await swarm.destroy()
            resolve(peers)
        }, timeout)

        const topic = createHash('sha256')
            .update(CONFIG.p2p.topic)
            .digest()

        swarm.join(topic, { server: false, client: true })

        swarm.on('connection', (socket) => {
            const chunks = []
            socket.on('data', (chunk) => chunks.push(chunk))
            socket.on('end', () => {
                try {
                    const manifest = JSON.parse(
                        b4a.toString(Buffer.concat(chunks)),
                    )
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