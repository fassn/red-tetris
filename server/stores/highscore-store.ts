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
    playerCount: number | null
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
    const db = new Database(dbPath)
    try {
        db.pragma('journal_mode = WAL')
        db.exec(`
            CREATE TABLE IF NOT EXISTS highscores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                game_mode TEXT NOT NULL,
                room_name TEXT NOT NULL,
                player_count INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `)

        // Migrate: add player_count column if missing (for DBs created before this feature)
        const cols = db.pragma('table_info(highscores)') as { name: string }[]
        if (!cols.some(c => c.name === 'player_count')) {
            db.exec('ALTER TABLE highscores ADD COLUMN player_count INTEGER')
        }

        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_highscores_mode_count_score
            ON highscores (game_mode, player_count, score DESC)
        `)

        return db
    } catch (err) {
        db.close()
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

export function saveScore(playerName: string, score: number, gameMode: GameMode, roomName: string, playerCount: number): void {
    try {
        const stmt = getDb().prepare(
            'INSERT INTO highscores (player_name, score, game_mode, room_name, player_count) VALUES (?, ?, ?, ?, ?)'
        )
        stmt.run(playerName, score, gameMode, roomName, playerCount)
    } catch (err) {
        storeLog.error('Failed to save highscore:', err)
    }
}

export function getTopScores(gameMode: GameMode, playerCount: number, limit = 10): HighscoreEntry[] {
    try {
        const stmt = getDb().prepare(`
            SELECT id, player_name as playerName, score, game_mode as gameMode,
                   room_name as roomName, player_count as playerCount, created_at as createdAt
            FROM highscores
            WHERE game_mode = ? AND player_count = ?
            ORDER BY score DESC
            LIMIT ?
        `)
        return stmt.all(gameMode, playerCount, limit) as HighscoreEntry[]
    } catch (err) {
        storeLog.error('Failed to fetch highscores:', err)
        return []
    }
}
