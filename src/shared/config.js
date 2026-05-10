export const CONFIG = {
    solana: {
        rpc: process.env.SOLANA_RPC_URL,
        network: process.env.SOLANA_NETWORK ?? 'devnet',
    },
    qvac: {
        model: process.env.QVAC_MODEL ?? 'LLAMA_3_2_1B_INST_Q4_0',
    },
    server: {
        port: Number(process.env.SERVER_PORT ?? 3000),
        host: process.env.SERVER_HOST ?? '0.0.0.0',
    },
    x402: {
        facilitator: process.env.FACILITATOR_URL,
        prices: {
            translate: '0.0005',
            summarise: '0.0003',
            transcribe: '0.0010',
        },
    },
    p2p: {
        topic: process.env.SWARM_TOPIC ?? 'sovereign-ai-network-v1',
    },
    keystore: {
        passphrase: process.env.KEYSTORE_PASSPHRASE,
        serverPath: './data/server-wallet.enc',
        agentPath: './data/agent-wallet.enc',
    },
    store: {
        earningsPath: './data/earnings.json',
    },
}