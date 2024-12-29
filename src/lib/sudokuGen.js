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
    
    // Add jigsaw as first option
    combinations.push({ width: size, height: 1, type: 'jigsaw' });
    
    // Add regular configurations, excluding 1xN and Nx1
    for (const width of factors) {
        for (const height of factors) {
            if (width * height === size && width > 1 && height > 1) {
                combinations.push({ width, height, type: 'regular' });
            }
        }
    }
    return combinations;
}

function generateJigsawRegions(size) {
    const regions = Array(size).fill().map(() => []);
    const cells = new Set();
    
    function getNeighbors(cell) {
        const [row, col] = [Math.floor(cell / size), cell % size];
        return [
            [row - 1, col], [row + 1, col],
            [row, col - 1], [row, col + 1]
        ].filter(([r, c]) => r >= 0 && r < size && c >= 0 && c < size)
         .map(([r, c]) => r * size + c)
         .filter(n => !cells.has(n));
    }

    // Start with random seed points for each region
    for (let region = 0; region < size; region++) {
        let startCell;
        do {
            startCell = Math.floor(Math.random() * (size * size));
        } while (cells.has(startCell));

        const queue = [startCell];
        regions[region].push(startCell);
        cells.add(startCell);

        // Grow region until it has exactly 'size' cells
        while (regions[region].length < size && queue.length > 0) {
            const currentCell = queue.shift();
            const neighbors = getNeighbors(currentCell);
            
            // Randomize neighbor selection
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }

            for (const neighbor of neighbors) {
                if (regions[region].length < size && !cells.has(neighbor)) {
                    regions[region].push(neighbor);
                    cells.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        // If region is incomplete, restart the whole process
        if (regions[region].length < size) {
            regions.fill([]);
            cells.clear();
            region = -1; // Will be incremented to 0 in next iteration
            continue;
        }
    }

    // Verify all regions are complete
    if (regions.some(region => region.length !== size)) {
        return generateJigsawRegions(size); // Try again if any region is incomplete
    }

    return regions;
}

class SudokuGenerator {
    constructor(size, boxWidth, boxHeight, layoutType = 'regular') {
        this.size = size;
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.layoutType = layoutType;
        // Increase timeout based on grid size, with extra time for jigsaw layout
        this.maxGenerationTime = layoutType === 'jigsaw' ? 
            Math.max(15000, size * size * 1000) : // 15 seconds minimum for jigsaw, scaling with size
            5000; // Keep original 5 seconds for regular layouts
        this.maxRetries = 5; // Increase retries as well
        // Initialize regions based on layoutType
        this.regions = this.layoutType === 'jigsaw' ? 
            generateJigsawRegions(size) : 
            this.generateRegions();
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
        const cellIndex = row * this.size + col;

        // Check row
        for (let x = 0; x < this.size; x++) {
            if (this.grid[row][x] === num && x !== col) return false;
        }

        // Check column
        for (let x = 0; x < this.size; x++) {
            if (this.grid[x][col] === num && x !== row) return false;
        }

        // Find which region this cell belongs to
        let regionIndex = -1;
        for (let i = 0; i < this.regions.length; i++) {
            if (this.regions[i].includes(cellIndex)) {
                regionIndex = i;
                break;
            }
        }

        // Check region
        if (regionIndex !== -1) {
            for (const idx of this.regions[regionIndex]) {
                const [r, c] = [Math.floor(idx / this.size), idx % this.size];
                if (this.grid[r][c] === num && (r !== row || c !== col)) {
                    return false;
                }
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
                
                // Ensure regions are initialized properly
                if (!this.regions || !Array.isArray(this.regions) || this.regions.length === 0) {
                    this.regions = this.layoutType === 'jigsaw' ? 
                        generateJigsawRegions(this.size) : 
                        this.generateRegions();
                }
                
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
                        regions: this.regions,
                        layoutType: this.layoutType
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
