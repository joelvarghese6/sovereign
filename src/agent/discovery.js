import { discoverPeers } from '../p2p/swarm.js'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'

export async function findSovereignPeers() {
    logger.info('Discovering peers via Hyperswarm...')
    const peers = await discoverPeers(15_000)

    if (peers.length === 0) {
        logger.warn('No peers found — falling back to localhost')
        peers.push({
            endpoint: `http://localhost:${CONFIG.server.port}`,
            skills: [
                { name: 'translate', path: '/translate' },
                { name: 'summarise', path: '/summarise' },
                { name: 'transcribe', path: '/transcribe' },
            ],
        })
    }

    logger.info(`Found ${peers.length} peer(s)`)
    return peers
}
