import { createPaymentHandler } from '@coinbase/x402/solana'
import { CONFIG } from '../shared/config.js'
import { logger } from '../shared/logger.js'
import { connection } from '../solana/wallet.js'
import { USDC_MINT } from '../solana/usdc.js'

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
                throw new Error(`Payment accepted but request failed: ${paid.status}`)
            }

            logger.info({ sig: signature }, 'Payment confirmed on Solana')
            return { data: await paid.json(), signature }
        }

        if (!response.ok) throw new Error(`Request failed: ${response.status}`)
        return { data: await response.json(), signature: null }
    }

    return { pay }
}