import { json } from '@sveltejs/kit';
import * as db from '$lib/server/db';

export async function POST({ request }) {
    const sudoku = await request.json();
    const result = await db.uploadSudoku(sudoku);
    return json(result);
}

export async function GET({ url }) {
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '30');
    const filters = JSON.parse(url.searchParams.get('filters') || '{}');
    const sortField = url.searchParams.get('sortField') || 'created';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    const result = await db.listSudokus(page, perPage, filters, sortField, sortOrder);
    return json(result);
}
