import { spawn } from 'node:child_process'
import { logger } from '../src/shared/logger.js'

logger.info('Starting Sovereign demo...')
logger.info('This will open 3 processes: server, dashboard, agent (after 20s)')

// Start server
const server = spawn('node', ['--env-file=.env', 'src/server/index.js'], {
    stdio: 'inherit',
})

// Start dashboard after 3s
setTimeout(() => {
    spawn('node', ['--env-file=.env', 'src/dashboard/index.js'], {
        stdio: 'inherit',
    })
}, 3000)

// Run agent after 20s — gives server time to boot + QVAC to load
setTimeout(() => {
    logger.info('Launching autonomous agent...')
    const agent = spawn('node', ['--env-file=.env', 'src/agent/index.js'], {
        stdio: 'inherit',
    })
    agent.on('exit', () => logger.info('Agent run complete'))
}, 20_000)

process.on('SIGINT', () => {
    server.kill()
    process.exit(0)
})