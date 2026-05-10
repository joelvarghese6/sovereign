import {
    Connection, LAMPORTS_PER_SOL, PublicKey,
    SystemProgram, Transaction, sendAndConfirmTransaction,
} from '@solana/web3.js'
import { CONFIG } from '../shared/config.js'

export const connection = new Connection(CONFIG.solana.rpc, 'confirmed')

export async function getSOLBalance(publicKey) {
    const pk = new PublicKey(publicKey)
    const lam = await connection.getBalance(pk)
    return lam / LAMPORTS_PER_SOL
}

export async function airdrop(publicKey, solAmount) {
    const pk = new PublicKey(publicKey)
    const sig = await connection.requestAirdrop(
        pk, solAmount * LAMPORTS_PER_SOL,
    )
    await connection.confirmTransaction(sig)
    return sig
}

export async function transferSOL(fromKeypair, toAddress, solAmount) {
    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: new PublicKey(toAddress),
            lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
        }),
    )
    return sendAndConfirmTransaction(connection, tx, [fromKeypair])
}