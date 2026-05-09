import { CONFIG } from '../src/shared/config.js'
import { logger } from '../src/shared/logger.js'
import { createWallet, walletExists } from '../src/solana/keystore.js'
import { loadWallet } from '../src/solana/keystore.js'
import { airdrop, getSOLBalance } from '../src/solana/wallet.js'
import { getUSDCBalance } from '../src/solana/usdc.js'

const pass = CONFIG.keystore.passphrase
if (!pass || pass === 'replace_with_strong_passphrase') {
    logger.error('Set KEYSTORE_PASSPHRASE in .env before running setup')
    process.exit(1)
}

logger.info('Creating wallets...')

if (!walletExists(CONFIG.keystore.serverPath)) {
    const w = createWallet(CONFIG.keystore.serverPath, pass)
    logger.info({ address: w.publicKey }, 'Server wallet created')
} else {
    logger.info('Server wallet already exists')
}

if (!walletExists(CONFIG.keystore.agentPath)) {
    const w = createWallet(CONFIG.keystore.agentPath, pass)
    logger.info({ address: w.publicKey }, 'Agent wallet created')
} else {
    logger.info('Agent wallet already exists')
}

const serverKP = loadWallet(CONFIG.keystore.serverPath, pass)
const agentKP = loadWallet(CONFIG.keystore.agentPath, pass)

logger.info(`Server wallet: ${serverKP.publicKey.toBase58()}`)
logger.info(`Agent wallet:  ${agentKP.publicKey.toBase58()}`)

if (CONFIG.solana.network === 'devnet') {
    logger.info('Airdropping SOL on devnet...')
    await airdrop(serverKP.publicKey.toBase58(), 2)
    await airdrop(agentKP.publicKey.toBase58(), 2)
    logger.info('Airdrop done')
}

const serverSOL = await getSOLBalance(serverKP.publicKey.toBase58())
const agentSOL = await getSOLBalance(agentKP.publicKey.toBase58())
const agentUSDC = await getUSDCBalance(agentKP.publicKey.toBase58())

logger.info(`Server: ${serverSOL} SOL`)
logger.info(`Agent:  ${agentSOL} SOL | ${agentUSDC} USDC`)
logger.info('Setup complete. Get devnet USDC from: https://faucet.circle.com')