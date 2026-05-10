import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { logger } from '../src/shared/logger.js'

mkdirSync('./data', { recursive: true })

const serverLog = createWriteStream('./data/server.log', { flags: 'a' })
const agentLog = createWriteStream('./data/agent.log', { flags: 'a' })

logger.info('Starting Sovereign demo...')
logger.info('Server + agent logs written to ./data/server.log and ./data/agent.log')
logger.info('Dashboard will launch in 3 seconds...')

// Start server — pipe output to log file so it doesn't overlap the dashboard
const server = spawn('node', ['--env-file=.env', 'src/server/index.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.pipe(serverLog)
server.stderr.pipe(serverLog)

// Start dashboard after 3s — it takes over the terminal (blessed TUI)
setTimeout(() => {
    spawn('node', ['--env-file=.env', 'src/dashboard/index.js'], {
        stdio: 'inherit',
    })
}, 3000)

// Run agent after 20s — gives server time to boot + QVAC to load
setTimeout(() => {
    const agent = spawn('node', ['--env-file=.env', 'src/agent/index.js'], {
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    agent.stdout.pipe(agentLog)
    agent.stderr.pipe(agentLog)
    agent.on('exit', () => {
        agentLog.write(`[${new Date().toISOString()}] Agent run complete\n`)
    })
}, 20_000)

process.on('SIGINT', () => {
    server.kill()
    serverLog.end()
    agentLog.end()
    process.exit(0)
})