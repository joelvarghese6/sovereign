import b4a from 'b4a'

export function buildManifest(port, walletAddress, prices) {
    return JSON.stringify({
        version: 1,
        name: 'Sovereign Node',
        endpoint: `http://0.0.0.0:${port}`,
        wallet: walletAddress,
        skills: [
            { name: 'translate', path: '/translate', priceUSDC: prices.translate },
            { name: 'summarise', path: '/summarise', priceUSDC: prices.summarise },
            { name: 'transcribe', path: '/transcribe', priceUSDC: prices.transcribe },
        ],
        ts: Date.now(),
    })
}

export function parseManifest(buffer) {
    return JSON.parse(b4a.toString(buffer))
}
