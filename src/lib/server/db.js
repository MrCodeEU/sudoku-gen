import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DB_PATH || '/data/sudoku.db';

try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
} catch {}

const db = new Database(DB_PATH, { create: true });

db.run('PRAGMA journal_mode=WAL');

db.run(`
    CREATE TABLE IF NOT EXISTS sudokus (
        id TEXT PRIMARY KEY,
        sudoku TEXT NOT NULL,
        difficulty REAL NOT NULL,
        size INTEGER NOT NULL,
        layout TEXT NOT NULL,
        created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
        updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
    )
`);

function parseItem(item) {
    const sudokuData = typeof item.sudoku === 'string' ? JSON.parse(item.sudoku) : item.sudoku;
    return {
        ...sudokuData,
        id: item.id,
        difficulty: parseFloat(item.difficulty),
        size: parseInt(item.size),
        layoutType: item.layout,
        created: item.created,
        updated: item.updated
    };
}

export function uploadSudoku(sudokuData) {
    const layoutConfig = sudokuData.layoutType === 'jigsaw'
        ? 'jigsaw'
        : `${sudokuData.boxWidth}x${sudokuData.boxHeight}`;

    db.prepare(
        `INSERT OR REPLACE INTO sudokus (id, sudoku, difficulty, size, layout)
         VALUES (?, ?, ?, ?, ?)`
    ).run(
        sudokuData.id,
        JSON.stringify({
            grid: sudokuData.grid,
            solution: sudokuData.solution,
            regions: sudokuData.regions,
            boxWidth: sudokuData.boxWidth,
            boxHeight: sudokuData.boxHeight
        }),
        parseFloat(sudokuData.difficulty),
        parseInt(sudokuData.size),
        layoutConfig
    );

    return { id: sudokuData.id };
}

export function getSudoku(id) {
    const record = db.prepare('SELECT * FROM sudokus WHERE id = ?').get(id);
    if (!record) throw new Error(`Sudoku ${id} not found`);
    return parseItem(record);
}

export function listSudokus(page = 1, perPage = 30, filters = {}, sortField = 'created', sortOrder = 'desc') {
    const whereClauses = [];
    const params = [];

    if (filters.difficulty) {
        const diff = parseFloat(filters.difficulty);
        whereClauses.push('difficulty >= ? AND difficulty <= ?');
        params.push(diff - 0.2, diff);
    }
    if (filters.size) {
        whereClauses.push('size = ?');
        params.push(parseInt(filters.size));
    }
    if (filters.layout) {
        if (filters.layout === 'jigsaw') {
            whereClauses.push("layout = 'jigsaw'");
        } else if (filters.layout === 'regular') {
            whereClauses.push("layout != 'jigsaw'");
        } else if (filters.layout.includes('x')) {
            whereClauses.push('layout = ?');
            params.push(filters.layout);
        }
    }
    if (filters.dateFrom) {
        const startDate = new Date(filters.dateFrom);
        startDate.setHours(0, 0, 0, 0);
        whereClauses.push('created >= ?');
        params.push(startDate.toISOString());
    }
    if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClauses.push('created <= ?');
        params.push(endDate.toISOString());
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const validSortFields = ['created', 'updated', 'difficulty', 'size', 'layout'];
    const safeSort = validSortFields.includes(sortField) ? sortField : 'created';
    const safeOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const { count: totalItems } = db.prepare(
        `SELECT COUNT(*) as count FROM sudokus ${where}`
    ).get(...params);
    const totalPages = Math.ceil(totalItems / perPage);
    const offset = (page - 1) * perPage;

    const items = db.prepare(
        `SELECT * FROM sudokus ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`
    ).all(...params, perPage, offset);

    return {
        items: items.map(parseItem),
        totalPages,
        totalItems,
        page
    };
}

export function doesSudokuExist(id) {
    return db.prepare('SELECT 1 FROM sudokus WHERE id = ?').get(id) !== null;
}
