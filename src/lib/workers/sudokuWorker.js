import { SudokuGenerator } from '../sudokuGen.js';

function generateSudokuId(sudoku) {
    const { grid, size, boxWidth, boxHeight, difficulty } = sudoku;
    const str = `${grid.join('')}${size}${boxWidth}${boxHeight}${difficulty}`;
    return Array.from(str).reduce((hash, char) => {
        const chr = char.charCodeAt(0);
        hash = ((hash << 5) - hash) + chr;
        return hash & hash;
    }, 0).toString(36);
}

let generator;

function updateProgress(progress, elapsedTime) {
    if (generator) {
        // Convert the 2D grid to 1D array
        const flatGrid = generator.grid.flat();
        self.postMessage({ 
            type: 'progress', 
            progress: Math.min(99, progress),
            progressGrid: flatGrid
        });
    }
}

self.onmessage = async function(e) {
    const { size, boxWidth, boxHeight, difficulty, count, layoutType, mode } = e.data;
    
    if (mode === 'bulk') {
        try {
            const puzzles = [];
            generator = new SudokuGenerator(size, boxWidth, boxHeight, layoutType);
            
            for (let i = 0; i < count; i++) {
                const puzzle = await generator.createPuzzle(difficulty);
                puzzle.id = generateSudokuId(puzzle);
                puzzles.push(puzzle);
                
                // Send progress update
                self.postMessage({ 
                    type: 'bulk-progress', 
                    current: i + 1,
                    total: count
                });
            }
            
            self.postMessage({ type: 'bulk-complete', puzzles });
        } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
        }
        return;
    }
    
    console.log('Worker received request:', { size, boxWidth, boxHeight, difficulty, count, layoutType });
    
    try {
        const puzzles = [];
        generator = new SudokuGenerator(size, boxWidth, boxHeight, layoutType);
        let lastProgressTime = Date.now();
        const progressInterval = 500; // Minimum ms between progress updates
        
        for (let i = 0; i < count; i++) {
            const progressCallback = (percent) => {
                if (percent === -1) {
                    console.log(`Retrying puzzle ${i + 1}/${count} due to timeout`);
                    const now = Date.now();
                    if (now - lastProgressTime > progressInterval) {
                        updateProgress((i * 100) / count, now - lastProgressTime);
                        lastProgressTime = now;
                    }
                } else {
                    const now = Date.now();
                    if (now - lastProgressTime > progressInterval) {
                        const overallProgress = Math.floor((i * 100 + percent) / count);
                        updateProgress(overallProgress, now - lastProgressTime);
                        lastProgressTime = now;
                    }
                }
            };
            
            const puzzle = await generator.createPuzzle(difficulty, progressCallback);
            if (!puzzle || !puzzle.grid || !Array.isArray(puzzle.grid)) {
                throw new Error('Invalid puzzle generated');
            }
            
            // Add unique ID
            puzzle.id = generateSudokuId(puzzle);
            puzzles.push(puzzle);
        }
        
        console.log(`Generated ${count} puzzles`);
        self.postMessage({ type: 'success', puzzles });
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
};
