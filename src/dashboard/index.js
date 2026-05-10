import blessed from 'blessed'
import contrib from 'blessed-contrib'
import { readFileSync, watchFile } from 'node:fs'
import { CONFIG } from '../shared/config.js'
import { getSOLBalance } from '../solana/wallet.js'
import { getUSDCBalance } from '../solana/usdc.js'
import { loadWallet } from '../solana/keystore.js'

const screen = blessed.screen({ smartCSR: true, title: 'Sovereign Dashboard' })
const grid = new contrib.grid({ rows: 12, cols: 12, screen })

// Earnings line chart
const line = grid.set(0, 0, 6, 8, contrib.line, {
    style: { line: 'green', text: 'green', baseline: 'black' },
    label: ' USDC Earned Over Time ',
    showLegend: true,
})

// Transaction log table
const table = grid.set(6, 0, 6, 8, contrib.table, {
    keys: true,
    label: ' Recent Transactions ',
    columnSpacing: 2,
    columnWidth: [12, 10, 20, 44],
})

// Stats box
const stats = grid.set(0, 8, 4, 4, blessed.box, {
    label: ' Node Stats ',
    content: 'Loading...',
    border: { type: 'line' },
    style: { border: { fg: 'green' } },
    padding: 1,
})

// Log box
const log = grid.set(4, 8, 8, 4, contrib.log, {
    label: ' Live Log ',
    style: { text: 'green' },
    bufferLength: 50,
})

screen.key(['q', 'C-c'], () => process.exit(0))

const serverKP = loadWallet(CONFIG.keystore.serverPath, CONFIG.keystore.passphrase)
const earningsHistory = []

async function refresh() {
    const sol = await getSOLBalance(serverKP.publicKey.toBase58())
    const usdc = await getUSDCBalance(serverKP.publicKey.toBase58())

    stats.setContent(
        `Wallet:\n${serverKP.publicKey.toBase58().slice(0, 16)}...\n\n` +
        `SOL:  ${sol.toFixed(4)}\nUSDC: ${usdc.toFixed(4)}\n\n` +
        `Network: ${CONFIG.solana.network}\n` +
        `Model: ${CONFIG.qvac.model.slice(0, 20)}`,
    )

    let store = { txs: [], total: 0 }
    try {
        store = JSON.parse(readFileSync(CONFIG.store.earningsPath, 'utf8'))
    } catch { }

    earningsHistory.push(store.total)
    if (earningsHistory.length > 60) earningsHistory.shift()

    line.setData([{
        title: 'USDC',
        x: earningsHistory.map((_, i) => String(i)),
        y: earningsHistory,
    }])

    table.setData({
        headers: ['Skill', 'Amount', 'Time', 'Tx Sig'],
        data: store.txs.slice(-10).reverse().map(tx => [
            tx.skill,
            `$${tx.amount}`,
            tx.ts.slice(11, 19),
            tx.sig.slice(0, 44),
        ]),
    })

    log.log(`[${new Date().toLocaleTimeString()}] Total earned: $${store.total.toFixed(4)} USDC`)

    screen.render()
}

await refresh()
setInterval(refresh, 2000)

watchFile(CONFIG.store.earningsPath, refresh)

screen.render()
log.log('Sovereign dashboard started. Press Q to quit.')