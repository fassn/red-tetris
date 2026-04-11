import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { GameMode } from '../../shared/types'
import { createLogger } from '../logger'

const storeLog = createLogger('highscore-store')

export interface HighscoreEntry {
    id: number
    playerName: string
    score: number
    gameMode: GameMode
    roomName: string
    createdAt: string
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

function createDb(): Database.Database {
    ensureDir(DATA_DIR)
    const dbPath = path.join(DATA_DIR, 'highscores.db')
    try {
        const db = new Database(dbPath)

        db.pragma('journal_mode = WAL')
        db.exec(`
            CREATE TABLE IF NOT EXISTS highscores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                game_mode TEXT NOT NULL,
                room_name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `)
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_highscores_mode_score
            ON highscores (game_mode, score DESC)
        `)

        return db
    } catch (err) {
        storeLog.error('Failed to initialize database:', err)
        throw err
    }
}

let db: Database.Database | null = null

function getDb(): Database.Database {
    if (!db) {
        db = createDb()
    }
    return db
}

/** Close the database connection. Call on shutdown. */
export function closeDb(): void {
    if (db) {
        db.close()
        db = null
    }
}

export function saveScore(playerName: string, score: number, gameMode: GameMode, roomName: string): void {
    try {
        const stmt = getDb().prepare(
            'INSERT INTO highscores (player_name, score, game_mode, room_name) VALUES (?, ?, ?, ?)'
        )
        stmt.run(playerName, score, gameMode, roomName)
    } catch (err) {
        storeLog.error('Failed to save highscore:', err)
    }
}

export function getTopScores(gameMode: GameMode, limit = 10): HighscoreEntry[] {
    try {
        const stmt = getDb().prepare(`
            SELECT id, player_name as playerName, score, game_mode as gameMode,
                   room_name as roomName, created_at as createdAt
            FROM highscores
            WHERE game_mode = ?
            ORDER BY score DESC
            LIMIT ?
        `)
        return stmt.all(gameMode, limit) as HighscoreEntry[]
    } catch (err) {
        storeLog.error('Failed to fetch highscores:', err)
        return []
    }
}
