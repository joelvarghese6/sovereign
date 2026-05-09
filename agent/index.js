import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'
import { loadWallet } from '../solana/keystore.js'
import { getSOLBalance } from '../solana/wallet.js'
import { getUSDCBalance } from '../solana/usdc.js'
import { discoverPeers } from '../p2p/swarm.js'
import { createBuyer } from './buyer.js'

const agentKP = loadWallet(CONFIG.keystore.agentPath, CONFIG.keystore.passphrase)
logger.info(`Agent wallet: ${agentKP.publicKey.toBase58()}`)

const sol = await getSOLBalance(agentKP.publicKey.toBase58())
const usdc = await getUSDCBalance(agentKP.publicKey.toBase58())
logger.info(`Balance: ${sol} SOL | ${usdc} USDC`)

// Discover peers via Hyperswarm
logger.info('Discovering peers via Hyperswarm...')
const peers = await discoverPeers(15_000)

if (peers.length === 0) {
    logger.warn('No peers found — falling back to localhost')
    peers.push({
        endpoint: `http://localhost:${CONFIG.server.port}`,
        skills: [
            { name: 'translate', path: '/translate' },
            { name: 'summarise', path: '/summarise' },
        ],
    })
}

logger.info(`Found ${peers.length} peer(s)`)

const buyer = createBuyer(agentKP)
const peer = peers[0]

// Run a sequence of autonomous tasks
const tasks = [
    {
        skill: 'translate',
        endpoint: `${peer.endpoint}/translate`,
        body: { text: 'Hello, this is Sovereign. A fully local AI agent paying on Solana.', targetLanguage: 'Malayalam' },
    },
    {
        skill: 'summarise',
        endpoint: `${peer.endpoint}/summarise`,
        body: { text: 'Sovereign is a local-first AI agent network. Every node runs QVAC on-device. Payments happen via x402 on Solana. No cloud is involved at any point. The private key never leaves the machine.', sentences: 2 },
    },
]

for (const task of tasks) {
    logger.info({ skill: task.skill }, 'Executing task...')
    const { data, signature } = await buyer.pay(task.endpoint, task.body)
    logger.info({ result: data.result, sig: signature }, 'Task complete')
}

logger.info('Agent run complete')