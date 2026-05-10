import {
    getAssociatedTokenAddress,
    getAccount,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
    PublicKey, Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js'
import { connection } from './wallet.js'

// Devnet USDC mint
export const USDC_MINT = new PublicKey(
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
)
export const USDC_DECIMALS = 6

export async function getUSDCBalance(publicKey) {
    const pk = new PublicKey(publicKey)
    const ata = await getAssociatedTokenAddress(USDC_MINT, pk)
    try {
        const acc = await getAccount(connection, ata)
        return Number(acc.amount) / 10 ** USDC_DECIMALS
    } catch {
        return 0
    }
}

export async function transferUSDC(fromKeypair, toAddress, usdcAmount) {
    const toPK = new PublicKey(toAddress)
    const fromATA = await getAssociatedTokenAddress(
        USDC_MINT, fromKeypair.publicKey,
    )
    const toATA = await getAssociatedTokenAddress(USDC_MINT, toPK)

    const tx = new Transaction()

    // Create destination ATA if needed
    try {
        await getAccount(connection, toATA)
    } catch {
        tx.add(createAssociatedTokenAccountInstruction(
            fromKeypair.publicKey, toATA, toPK, USDC_MINT,
        ))
    }

    tx.add(createTransferInstruction(
        fromATA, toATA, fromKeypair.publicKey,
        BigInt(Math.round(usdcAmount * 10 ** USDC_DECIMALS)),
    ))

    return sendAndConfirmTransaction(connection, tx, [fromKeypair])
}