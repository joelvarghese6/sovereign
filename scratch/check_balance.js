import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { USDC_MINT } from '../src/solana/usdc.js'

const connection = new Connection('https://api.devnet.solana.com')
const wallet = new PublicKey('E5Q8HXFFzXu6EsR6fBtZQAz8kXFFAtmrS8U6UA2aUgoE')
const ata = await getAssociatedTokenAddress(USDC_MINT, wallet)

try {
    const account = await getAccount(connection, ata)
    console.log(`USDC Balance: ${Number(account.amount) / 1_000_000}`)
} catch (e) {
    console.error('Error fetching balance:', e.message)
}
