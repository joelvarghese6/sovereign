import {
    readFileSync, writeFileSync,
    existsSync, mkdirSync
} from 'node:fs'
import { dirname } from 'node:path'
import { CONFIG } from './config.js'

function load() {
    if (!existsSync(CONFIG.store.earningsPath)) return { txs: [], total: 0 }
    return JSON.parse(readFileSync(CONFIG.store.earningsPath, 'utf8'))
}

function save(data) {
    mkdirSync(dirname(CONFIG.store.earningsPath), { recursive: true })
    writeFileSync(CONFIG.store.earningsPath,
        JSON.stringify(data, null, 2), 'utf8')
}

export function recordEarning({ skill, amount, sig, payer }) {
    const store = load()
    store.txs.push({
        skill, amount, sig, payer,
        ts: new Date().toISOString(),
    })
    store.total = parseFloat((store.total + amount).toFixed(6))
    save(store)
    return store
}

export function getEarnings() {
    return load()
}