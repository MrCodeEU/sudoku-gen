export async function uploadSudoku(sudoku) {
    const response = await fetch('/api/sudokus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sudoku)
    });
    if (!response.ok) throw new Error('Failed to upload sudoku');
    return await response.json();
}

export async function getSudoku(id) {
    const response = await fetch(`/api/sudokus/${id}`);
    if (!response.ok) throw new Error(`Failed to load sudoku ${id}`);
    return await response.json();
}

export async function listSudokus(page = 1, perPage = 30, filters = {}, sortField = 'created', sortOrder = 'desc') {
    const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        filters: JSON.stringify(filters),
        sortField,
        sortOrder
    });
    const response = await fetch(`/api/sudokus?${params}`);
    if (!response.ok) throw new Error('Failed to fetch sudokus');
    return await response.json();
}

export async function doesSudokuExist(id) {
    const response = await fetch(`/api/sudokus/${id}`, { method: 'HEAD' });
    return response.ok;
}
