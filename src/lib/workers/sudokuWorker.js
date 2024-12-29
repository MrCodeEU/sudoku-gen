import { SudokuGenerator } from '../sudokuGen.js';

self.onmessage = async function(e) {
    const { size, boxWidth, boxHeight, difficulty, count, layoutType } = e.data;
    console.log('Worker received request:', { size, boxWidth, boxHeight, difficulty, count, layoutType });
    
    try {
        const puzzles = [];
        const generator = new SudokuGenerator(size, boxWidth, boxHeight, layoutType);
        
        for (let i = 0; i < count; i++) {
            const progressCallback = (percent) => {
                if (percent === -1) {
                    console.log(`Retrying puzzle ${i + 1}/${count} due to timeout`);
                } else {
                    console.log(`Generation progress for puzzle ${i + 1}/${count}:`, percent);
                    const overallProgress = Math.floor((i * 100 + percent) / count);
                    self.postMessage({ type: 'progress', progress: overallProgress });
                }
            };
            
            const puzzle = await generator.createPuzzle(difficulty, progressCallback);
            if (!puzzle || !puzzle.grid || !Array.isArray(puzzle.grid)) {
                throw new Error('Invalid puzzle generated');
            }
            puzzles.push(puzzle);
        }
        
        console.log(`Generated ${count} puzzles`);
        self.postMessage({ type: 'success', puzzles });
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
};
