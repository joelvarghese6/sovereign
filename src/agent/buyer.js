import { encodePaymentSignatureHeader } from '@x402/core/http'
import {
    getAssociatedTokenAddress,
    createTransferCheckedInstruction,
    getAccount,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token'
import {
    PublicKey,
    Transaction,
    TransactionInstruction
} from '@solana/web3.js'
import bs58 from 'bs58'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'
import { connection } from '../solana/wallet.js'
import { USDC_MINT, USDC_DECIMALS } from '../solana/usdc.js'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

function createPaymentHandler({ wallet, usdcMint, connection }) {
    return {
        createPayment: async (paymentDetails) => {
            const requirement = paymentDetails.accepts[0]
            const amount = BigInt(requirement.maxAmountRequired)
            const destinationPK = new PublicKey(requirement.payTo)
            const mintPK = new PublicKey(requirement.asset)

            const sourceATA = await getAssociatedTokenAddress(mintPK, wallet.publicKey)
            const destinationATA = await getAssociatedTokenAddress(mintPK, destinationPK)

            const tx = new Transaction()

            // Check if destination ATA exists
            try {
                await getAccount(connection, destinationATA)
            } catch (e) {
                tx.add(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        destinationATA,
                        destinationPK,
                        mintPK
                    )
                );
            }

            tx.add(
                createTransferCheckedInstruction(
                    sourceATA,
                    mintPK,
                    destinationATA,
                    wallet.publicKey,
                    amount,
                    USDC_DECIMALS
                )
            )

            // Add memo if provided by the seller
            const memo = requirement.extra?.memo
            if (memo) {
                tx.add(
                    new TransactionInstruction({
                        keys: [],
                        programId: MEMO_PROGRAM_ID,
                        data: Buffer.from(memo),
                    })
                )
            }

            const { blockhash } = await connection.getLatestBlockhash()
            tx.recentBlockhash = blockhash
            tx.feePayer = wallet.publicKey

            const signedTx = await wallet.updateTransaction(tx)
            const signature = bs58.encode(signedTx.signatures[0].signature)

            const payload = {
                x402Version: 1,
                payload: {
                    transaction: Buffer.from(signedTx.serialize()).toString('base64'),
                },
            }

            const header = encodePaymentSignatureHeader(payload)

            return { header, signature }
        },
    }
}

export function createBuyer(agentKeypair) {
    const handler = createPaymentHandler({
        wallet: {
            network: CONFIG.solana.network === 'mainnet' ? 'solana' : 'solana-devnet',
            publicKey: agentKeypair.publicKey,
            updateTransaction: async (tx) => {
                tx.sign(agentKeypair)
                return tx
            },
        },
        usdcMint: USDC_MINT,
        connection,
    })

    async function pay(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        if (response.status === 402) {
            const paymentDetails = await response.json()
            logger.info({ price: paymentDetails.accepts[0].maxAmountRequired }, 'Got 402 — paying')

            const { header, signature } = await handler.createPayment(paymentDetails)

            const paid = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Payment': header,
                },
                body: JSON.stringify(body),
            })

            if (!paid.ok) {
                const errorBody = await paid.text()
                logger.error({ status: paid.status, body: errorBody }, 'Payment retry failed')
                throw new Error(`Payment accepted but request failed: ${paid.status}`)
            }

            const cluster = CONFIG.solana.network === 'mainnet' ? '' : `?cluster=${CONFIG.solana.network}`
            const explorerUrl = `https://explorer.solana.com/tx/${signature}${cluster}`
            logger.info({ sig: signature, explorer: explorerUrl }, 'Payment confirmed on Solana')
            return { data: await paid.json(), signature }
        }

        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        return { data: await response.json(), signature: null }
    }

    return { pay }
}