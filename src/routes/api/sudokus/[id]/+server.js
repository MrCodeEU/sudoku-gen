import { json } from '@sveltejs/kit';
import * as db from '$lib/server/db';

export async function GET({ params }) {
    const result = await db.getSudoku(params.id);
    return json(result);
}

export async function HEAD({ params }) {
    const exists = await db.doesSudokuExist(params.id);
    return new Response(null, {
        status: exists ? 200 : 404
    });
}
