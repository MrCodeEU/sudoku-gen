function getFactors(n) {
    const factors = [];
    for (let i = 1; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
            factors.push(i);
            if (i !== n/i) factors.push(n/i);
        }
    }
    return factors.sort((a, b) => a - b);
}

function getValidBoxCombinations(size) {
    const factors = getFactors(size);
    const combinations = [];
    for (const width of factors) {
        for (const height of factors) {
            if (width * height === size) {
                combinations.push({ width, height });
            }
        }
    }
    return combinations;
}

class SudokuGenerator {
    constructor(size, boxWidth, boxHeight) {
        this.size = size;
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.maxGenerationTime = 5000; // 5 seconds timeout
        this.maxRetries = 3;
        this.reset();
    }

    reset() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.filledCells = 0;
        this.totalCells = this.size * this.size;
        this.lastProgress = 0;
        this.startTime = null;
        this.lastProgressTime = null;
        this.attempts = 0;
    }

    isValid(num, pos) {
        const [row, col] = pos;

        // Check row
        for (let x = 0; x < this.size; x++) {
            if (this.grid[row][x] === num && x !== col) return false;
        }

        // Check column
        for (let x = 0; x < this.size; x++) {
            if (this.grid[x][col] === num && x !== row) return false;
        }

        // Check box
        const boxX = Math.floor(col / this.boxWidth);
        const boxY = Math.floor(row / this.boxHeight);
        for (let i = boxY * this.boxHeight; i < boxY * this.boxHeight + this.boxHeight; i++) {
            for (let j = boxX * this.boxWidth; j < boxX * this.boxWidth + this.boxWidth; j++) {
                if (this.grid[i][j] === num && (i !== row || j !== col)) return false;
            }
        }

        return true;
    }

    getEmptyPosition() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) return [i, j];
            }
        }
        return null;
    }

    generate(progressCallback = null) {
        if (!this.startTime) {
            this.startTime = Date.now();
            this.lastProgressTime = this.startTime;
        }

        const empty = this.getEmptyPosition();
        if (!empty) return true;

        const currentTime = Date.now();
        if (currentTime - this.startTime > this.maxGenerationTime) {
            throw new Error('Generation timeout');
        }

        const [row, col] = empty;
        const numbers = Array.from({length: this.size}, (_, i) => i + 1);
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        for (const num of numbers) {
            if (this.isValid(num, [row, col])) {
                this.grid[row][col] = num;
                this.filledCells++;

                if (progressCallback) {
                    const currentTime = Date.now();
                    const progress = Math.floor((this.filledCells * 100) / this.totalCells);
                    if (progress >= this.lastProgress + 5 || (currentTime - this.lastProgressTime) > 5000) {
                        progressCallback(progress, (currentTime - this.startTime) / 1000);
                        this.lastProgress = progress;
                        this.lastProgressTime = currentTime;
                    }
                }

                if (this.generate(progressCallback)) return true;

                this.grid[row][col] = 0;
                this.filledCells--;
            }
        }

        return false;
    }

    async createPuzzle(difficulty = 0.5, progressCallback = null) {
        let retries = 0;
        
        while (retries < this.maxRetries) {
            try {
                this.reset();
                
                if (progressCallback) {
                    progressCallback(0);
                }

                if (this.generate(progressCallback)) {
                    // Store the solution before creating the puzzle
                    const solution = this.grid.map(row => [...row]);
                    
                    const cells = [];
                    for (let i = 0; i < this.size; i++) {
                        for (let j = 0; j < this.size; j++) {
                            cells.push([i, j]);
                        }
                    }

                    const toRemove = Math.floor(cells.length * difficulty);
                    for (let i = 0; i < toRemove; i++) {
                        if (cells.length === 0) break;
                        const idx = Math.floor(Math.random() * cells.length);
                        const [row, col] = cells.splice(idx, 1)[0];
                        this.grid[row][col] = 0;
                    }

                    return {
                        grid: this.grid.flat(),
                        solution: solution.flat(),
                        size: this.size,
                        boxWidth: this.boxWidth,
                        boxHeight: this.boxHeight,
                        regions: this.generateRegions()
                    };
                }
            } catch (error) {
                if (error.message === 'Generation timeout') {
                    retries++;
                    if (progressCallback) {
                        progressCallback(-1);
                    }
                    continue;
                }
                throw error;
            }
            retries++;
        }
        
        throw new Error(`Failed to generate puzzle after ${this.maxRetries} attempts`);
    }

    generateRegions() {
        const regions = [];
        for (let boxY = 0; boxY < this.boxHeight; boxY++) {
            for (let boxX = 0; boxX < this.boxWidth; boxX++) {
                const region = [];
                for (let i = 0; i < this.boxHeight; i++) {
                    for (let j = 0; j < this.boxWidth; j++) {
                        const row = boxY * this.boxHeight + i;
                        const col = boxX * this.boxWidth + j;
                        region.push(row * this.size + col);
                    }
                }
                regions.push(region);
            }
        }
        return regions;
    }
}

export { SudokuGenerator, getValidBoxCombinations };
