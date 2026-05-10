// verifyPayment will be implemented locally
import { CONFIG } from '../../shared/config.js'
import { logger } from '../../shared/logger.js'
import { USDC_MINT } from '../../solana/usdc.js'
import { connection } from '../../solana/wallet.js'
import { Transaction } from '@solana/web3.js'
import bs58 from 'bs58'

/**
 * Submit a signed transaction to Solana and return the confirmed signature.
 */
async function submitTransaction(base64Tx) {
    const txBuffer = Buffer.from(base64Tx, 'base64')
    const signature = await connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
    })
    logger.info({ signature }, 'Transaction submitted to Solana')
    await connection.confirmTransaction(signature, 'confirmed')
    logger.info({ signature }, 'Transaction confirmed on Solana')
    return signature
}

/**
 * Extract the payer public key from a serialized transaction.
 */
function extractPayer(base64Tx) {
    try {
        const tx = Transaction.from(Buffer.from(base64Tx, 'base64'))
        return tx.feePayer?.toBase58() ?? 'unknown'
    } catch {
        return 'unknown'
    }
}

async function verifyPayment(paymentHeader, facilitatorConfig, paymentRequirements) {
    let paymentPayload;
    try {
        try {
            paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
        } catch {
            paymentPayload = JSON.parse(paymentHeader);
        }

        const performLocalFallback = async (reason) => {
            logger.info({ reason }, 'Falling back to local validation and submission');
            if (paymentPayload.payload?.transaction) {
                try {
                    const signature = await submitTransaction(paymentPayload.payload.transaction);
                    const payer = extractPayer(paymentPayload.payload.transaction);
                    return { isValid: true, payer, signature };
                } catch (submitErr) {
                    logger.error({ err: submitErr.message }, 'Local transaction submission failed');
                    return { isValid: false, invalidReason: 'Transaction failed', invalidMessage: submitErr.message };
                }
            }
            return { isValid: false, invalidReason: 'No transaction payload' };
        };

        const headers = { 'Content-Type': 'application/json' };
        if (typeof facilitatorConfig.createAuthHeaders === 'function') {
            const authHeaders = await facilitatorConfig.createAuthHeaders('verify');
            Object.assign(headers, authHeaders.headers || {});
        }

        const url = (typeof facilitatorConfig === 'string' ? facilitatorConfig : facilitatorConfig?.url) || CONFIG.x402.facilitator;
        logger.debug({ url }, 'Verifying payment with facilitator');
        let response;
        try {
            response = await fetch(`${url}/verify`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    x402Version: paymentPayload.x402Version || 1,
                    paymentPayload,
                    paymentRequirements
                })
            });
        } catch (fetchErr) {
            return await performLocalFallback(`Facilitator unreachable: ${fetchErr.message}`);
        }

        if (response.ok) {
            return await response.json();
        } else {
            const text = await response.text();
            // Fallback for hackathon demo if CDP keys are missing/invalid
            if (response.status === 401 || response.status === 403) {
                return await performLocalFallback(`Facilitator unauthorized (${response.status})`);
            }
            logger.warn({ status: response.status, text }, 'Facilitator verification failed');
            return { isValid: false, invalidReason: 'Facilitator error', invalidMessage: text };
        }
    } catch (err) {
        logger.error({ err }, 'Error in verifyPayment');
        return { isValid: false, invalidReason: 'Internal error', invalidMessage: err.message };
    }
}

/**
 * Fastify plugin — gates a route behind x402 payment.
 * Usage: fastify.addHook('preHandler', x402Gate(skill, priceUSDC))
 */
export function x402Gate(skill, priceUSDC) {
    const usdcMint = USDC_MINT.toBase58()

    return async function (request, reply) {
        const paymentHeader = request.headers['x-payment']

        const paymentRequirement = {
            scheme: 'exact',
            network: CONFIG.solana.network === 'mainnet' ? 'solana' : 'solana-devnet',
            maxAmountRequired: String(Math.round(parseFloat(priceUSDC) * 1_000_000)),
            resource: request.url,
            description: `Sovereign AI — ${skill}`,
            mimeType: 'application/json',
            payTo: request.server.serverWallet.publicKey.toBase58(),
            maxTimeoutSeconds: 300,
            asset: usdcMint,
            extra: {
                name: 'USD Coin',
                version: '2',
            },
        }

        if (!paymentHeader) {
            return reply.code(402).send({
                x402Version: 1,
                accepts: [paymentRequirement],
                error: 'Payment required',
            })
        }

        try {
            const result = await verifyPayment(
                paymentHeader,
                CONFIG.x402.facilitator,
                [paymentRequirement],
            )
            if (!result.isValid) {
                return reply.code(402).send({ error: 'Invalid payment', details: result })
            }
            request.payment = result
            request.paymentSkill = skill
        } catch (err) {
            logger.error({ err }, 'Payment verification failed')
            return reply.code(402).send({ error: 'Payment verification error' })
        }
    }
}