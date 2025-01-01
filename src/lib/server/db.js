import PocketBase from 'pocketbase';

/**
 * @typedef {Object} SudokuRecord
 * @property {string} id
 * @property {string} sudoku
 * @property {string} difficulty
 * @property {string} size
 * @property {string} layout
 * @property {string} created
 * @property {string} updated
 */

const pb = new PocketBase('https://base.mljr.eu');

// Authenticate immediately when the module is imported
export async function authenticate() {
    try {
        const authData = await pb.collection('_superusers').authWithPassword(
            import.meta.env.VITE_POCKETBASE_EMAIL,
            import.meta.env.VITE_POCKETBASE_PASSWORD
        );
        console.log('Successfully authenticated with PocketBase');
    } catch (error) {
        console.error('Failed to authenticate with PocketBase:', error);
        throw error;
    }
}

// Re-authenticate every 30 minutes to ensure the token stays valid
setInterval(authenticate, 30 * 60 * 1000);

export async function uploadSudoku(sudokuData) {
    try {
        // Store the actual box configuration
        const layoutConfig = sudokuData.layoutType === 'jigsaw' 
            ? 'jigsaw' 
            : `${sudokuData.boxWidth}x${sudokuData.boxHeight}`;

        const data = {
            id: sudokuData.id,
            sudoku: JSON.stringify({
                grid: sudokuData.grid,
                solution: sudokuData.solution,
                regions: sudokuData.regions,
                boxWidth: sudokuData.boxWidth,
                boxHeight: sudokuData.boxHeight,
            }),
            difficulty: sudokuData.difficulty.toString(),
            size: sudokuData.size.toString(),
            layout: layoutConfig
        };

        const record = await pb.collection('sudokus').create(data);
        return record;
    } catch (error) {
        console.error('Failed to upload sudoku:', error);
        throw error;
    }
}

export async function getSudoku(id) {
    try {
        const record = await pb.collection('sudokus').getOne(id);
        const sudokuData = typeof record.sudoku === 'string' 
            ? JSON.parse(record.sudoku)
            : record.sudoku;

        return {
            ...sudokuData,
            id: record.id,
            difficulty: parseFloat(record.difficulty),
            size: parseInt(record.size),
            layoutType: record.layout,
            created: record.created,
            updated: record.updated
        };
    } catch (error) {
        console.error('Failed to get sudoku:', error);
        throw new Error(`Failed to load sudoku ${id}: ${error.message}`);
    }
}

export async function listSudokus(page = 1, perPage = 30, filters = {}, sortField = 'created', sortOrder = 'desc') {
    try {
        const filterRules = [];
        if (filters.difficulty) {
            const diff = parseFloat(filters.difficulty);
            const lowerBound = diff - 0.2;
            filterRules.push(`difficulty >= ${lowerBound} && difficulty <= ${diff}`);
        }
        if (filters.size) {
            filterRules.push(`size = "${filters.size}"`);
        }
        if (filters.layout) {
            if (filters.layout === 'jigsaw') {
                filterRules.push(`layout = "jigsaw"`);
            } else if (filters.layout === 'regular') {
                // Match any NxN pattern except jigsaw
                filterRules.push(`layout != "jigsaw"`);
            } else if (filters.layout.includes('x')) {
                // Match exact box configuration
                filterRules.push(`layout = "${filters.layout}"`);
            }
        }
        if (filters.dateFrom) {
            // Add time to start of day
            const startDate = new Date(filters.dateFrom);
            startDate.setHours(0, 0, 0, 0);
            filterRules.push(`created >= "${startDate.toISOString()}"`);
        }
        if (filters.dateTo) {
            // Add time to end of day
            const endDate = new Date(filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            filterRules.push(`created <= "${endDate.toISOString()}"`);
        }

        const result = await pb.collection('sudokus').getList(page, perPage, {
            sort: `${sortOrder === 'desc' ? '-' : ''}${sortField}`,
            filter: filterRules.join(' && '),
            requestKey: `list_${page}_${perPage}_${JSON.stringify(filters)}_${sortField}_${sortOrder}`,
        });
        
        return {
            items: result.items.map(item => {
                try {
                    // Check if sudoku is already an object
                    const sudokuData = typeof item.sudoku === 'string' 
                        ? JSON.parse(item.sudoku)
                        : item.sudoku;

                    return {
                        ...item,
                        ...sudokuData,
                        difficulty: parseFloat(item.difficulty),
                        size: parseInt(item.size),
                        layoutType: item.layout
                    };
                } catch (parseError) {
                    console.error('Failed to parse sudoku data:', parseError);
                    // Return a minimal valid object in case of parse error
                    return {
                        ...item,
                        grid: [],
                        solution: [],
                        regions: [],
                        boxWidth: 0,
                        boxHeight: 0,
                        difficulty: 0,
                        size: 0,
                        layoutType: 'unknown'
                    };
                }
            }),
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            page: result.page
        };
    } catch (error) {
        if (error.isAbort) {
            console.log('Request was cancelled, ignoring...');
            return { items: [], totalPages: 0, totalItems: 0, page: 1 };
        }
        console.error('Failed to fetch sudokus:', error);
        throw new Error('Failed to fetch sudokus');
    }
}

export async function doesSudokuExist(id) {
    try {
        const record = await pb.collection('sudokus').getOne(id);
        return true;
    } catch (error) {
        if (error.status === 404) {
            return false;
        }
        throw error;
    }
}
