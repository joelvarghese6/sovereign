import {
    createCipheriv, createDecipheriv,
    randomBytes, pbkdf2Sync
} from 'node:crypto'
import {
    readFileSync, writeFileSync,
    existsSync, mkdirSync
} from 'node:fs'
import { dirname } from 'node:path'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

function deriveKey(passphrase, salt) {
    return pbkdf2Sync(passphrase, salt, 210_000, 32, 'sha256')
}

function encrypt(plain, passphrase) {
    const salt = randomBytes(16)
    const iv = randomBytes(12)
    const key = deriveKey(passphrase, salt)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return JSON.stringify({
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        enc: enc.toString('hex'),
    })
}

function decrypt(stored, passphrase) {
    const { salt, iv, tag, enc } = JSON.parse(stored)
    const key = deriveKey(passphrase, Buffer.from(salt, 'hex'))
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
    d.setAuthTag(Buffer.from(tag, 'hex'))
    return Buffer.concat([
        d.update(Buffer.from(enc, 'hex')),
        d.final(),
    ]).toString('utf8')
}

export function createWallet(path, passphrase) {
    if (existsSync(path)) throw new Error(`Wallet already exists at ${path}`)
    mkdirSync(dirname(path), { recursive: true })
    const kp = Keypair.generate()
    writeFileSync(path, encrypt(
        Buffer.from(kp.secretKey).toString('hex'),
        passphrase,
    ))
    return { publicKey: kp.publicKey.toBase58() }
}

export function loadWallet(path, passphrase) {
    const hex = decrypt(readFileSync(path, 'utf8'), passphrase)
    const kp = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(hex, 'hex')))
    return kp
}

export function walletExists(path) {
    return existsSync(path)
}