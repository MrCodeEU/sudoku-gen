import { json } from '@sveltejs/kit';
import * as db from '$lib/server/db';

function checkBasicAuth(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Basic ')) return false;

    // Use TextDecoder for proper UTF-8 decoding (atob gives Latin-1 bytes)
    const bytes = Uint8Array.from(atob(authHeader.slice(6)), c => c.charCodeAt(0));
    const credentials = new TextDecoder().decode(bytes);
    const colonIdx = credentials.indexOf(':');
    if (colonIdx === -1) return false;
    const user = credentials.slice(0, colonIdx);
    const password = credentials.slice(colonIdx + 1);

    const expectedUser = process.env.SUDOKU_API_USER ?? '';
    const expectedPass = process.env.SUDOKU_API_PASSWORD ?? '';
    if (!expectedUser || !expectedPass) return false;

    return user === expectedUser && password === expectedPass;
}

/** External authenticated upload endpoint - used by the Go generator tool */
export async function POST({ request }) {
    if (!checkBasicAuth(request)) {
        return new Response('Unauthorized', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Sudoku External API"' }
        });
    }

    const sudoku = await request.json();

    // Check if already exists and skip gracefully
    if (db.doesSudokuExist(sudoku.id)) {
        return json({ id: sudoku.id, skipped: true }, { status: 200 });
    }

    const result = db.uploadSudoku(sudoku);
    return json(result, { status: 201 });
}
