# Sovereign

> Your device. Your AI. Your money.

Local-first AI agents that earn and pay on Solana — no cloud, no custody, no permission.

## What it does

Sovereign is the first AI agent network where:
- The LLM runs 100% on your device via QVAC (no API key, no cloud)
- Agents earn USDC per request via x402 protocol on Solana
- Peers discover each other via Holepunch P2P (no central registry)
- Keypairs never leave the device

## Architecture

```
Agent A (buyer)  →  Hyperswarm DHT  →  Agent B (seller)
                                              ↓
                                    QVAC local inference
                                              ↓
                              x402: HTTP 402 → USDC payment
                                              ↓
                                    Solana devnet/mainnet
```

## Stack

- **AI**: QVAC SDK (Tether) — llama.cpp, whisper.cpp, Bergamot on-device
- **Payments**: x402 protocol + @coinbase/x402
- **Blockchain**: Solana + SPL USDC
- **P2P**: Hyperswarm (Holepunch)
- **Server**: Fastify

## Quick start

```bash
cp .env.example .env
# Edit .env — set KEYSTORE_PASSPHRASE

npm install
npm run setup       # creates wallets, airdrops devnet SOL
# Fund agent wallet with devnet USDC: https://faucet.circle.com

npm run demo        # starts server + dashboard + agent automatically
```

## Demo

```bash
# Terminal 1 — skill server (earns USDC)
npm run server

# Terminal 2 — earnings dashboard
npm run dashboard

# Terminal 3 — autonomous buyer agent (pays USDC)
npm run agent
```

Built for Solana Frontier Hackathon 2026.