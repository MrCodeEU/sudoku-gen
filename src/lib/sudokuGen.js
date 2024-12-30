function getFactors(n) {
    const factors = [];
    for (let i = 1; i <= Math.sqrt(n); i++) {
        if (n % i === 0) {
            factors.push(i);
            if (i !== n / i) factors.push(n / i);
        }
    }
    return factors.sort((a, b) => a - b);
}

function getValidBoxCombinations(size) {
    const factors = getFactors(size);
    const combinations = [];

    // Support jigsaw for common sizes and 12x12
    if ([9, 12, 16].includes(size)) {
        combinations.push({ width: size, height: 1, type: 'jigsaw' });
    }

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
    let attempts = 0;
    const maxAttempts = 1000000;

    while (attempts < maxAttempts) {
        attempts++;
        
        const regions = Array(size).fill(null).map(() => []);
        const cells = new Set();
        const adjacencies = Array(size * size).fill(null).map(() => []);

        // Build adjacency list
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const index = r * size + c;
                const neighbors = [];
                if (r > 0) neighbors.push((r - 1) * size + c);
                if (r < size - 1) neighbors.push((r + 1) * size + c);
                if (c > 0) neighbors.push(r * size + (c - 1));
                if (c < size - 1) neighbors.push(r * size + (c + 1));
                adjacencies[index] = neighbors;
            }
        }

        let isValid = true;
        // Generate each region
        for (let regionIndex = 0; regionIndex < size; regionIndex++) {
            const potentialStarts = Array.from({ length: size * size }, (_, i) => i)
                .filter(i => !cells.has(i));

            if (potentialStarts.length === 0) {
                isValid = false;
                break;
            }

            const startCell = potentialStarts[Math.floor(Math.random() * potentialStarts.length)];
            const region = [startCell];
            cells.add(startCell);
            
            // Grow the region
            while (region.length < size) {
                const candidates = region
                    .flatMap(cell => adjacencies[cell])
                    .filter(n => !cells.has(n));

                if (candidates.length === 0) {
                    isValid = false;
                    break;
                }

                const nextCell = candidates[Math.floor(Math.random() * candidates.length)];
                region.push(nextCell);
                cells.add(nextCell);
            }

            if (!isValid) break;
            regions[regionIndex] = region;
        }

        if (isValid && cells.size === size * size) {
            return regions;
        }
    }

    throw new Error('Failed to generate valid jigsaw regions');
}

class SudokuGenerator {
    constructor(size, boxWidth, boxHeight, layoutType = 'regular') {
        this.size = size;
        this.boxWidth = boxWidth;
        this.boxHeight = boxHeight;
        this.layoutType = layoutType;
        this.maxGenerationTime = layoutType === 'jigsaw' ?
            Math.max(15000, size * size * 50) :
            5000;
        this.maxRetries = 7;

        this.regions = [];
        if (this.layoutType === 'jigsaw') {
            let jigsawAttempts = 0;
            const maxJigsawAttempts = 2;

            while (jigsawAttempts < maxJigsawAttempts) {
                try {
                    this.regions = generateJigsawRegions(size);
                    break;
                } catch (error) {
                    jigsawAttempts++;
                    if (jigsawAttempts >= maxJigsawAttempts) {
                        throw new Error('Failed to generate jigsaw regions after multiple attempts');
                    }
                    console.log(`Retrying jigsaw generation, attempt ${jigsawAttempts}`);
                }
            }
        } else {
            this.regions = this.generateRegions();
        }

        // Verify regions are valid
        if (!Array.isArray(this.regions) || this.regions.length === 0 || 
            !this.regions.every(region => Array.isArray(region))) {
            throw new Error('Invalid regions generated');
        }

        this.cellRegionMap = new Array(size * size);
        this.populateCellRegionMap();
        this.reset();
    }

    populateCellRegionMap() {
        for (let i = 0; i < this.regions.length; i++) {
            for (const cellIndex of this.regions[i]) {
                this.cellRegionMap[cellIndex] = i;
            }
        }
    }

    reset() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
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

        // Check region (using precomputed map)
        const regionIndex = this.cellRegionMap[cellIndex];
        for (const idx of this.regions[regionIndex]) {
            const r = Math.floor(idx / this.size);
            const c = idx % this.size;
            if (this.grid[r][c] === num && (r !== row || c !== col)) {
                return false;
            }
        }

        return true;
    }

    getEmptyPositionWithMRV() {
        let minRemaining = this.size + 1;
        let bestPosition = null;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) {
                    let count = 0;
                    for (let num = 1; num <= this.size; num++) {
                        if (this.isValid(num, [r, c])) {
                            count++;
                        }
                    }
                    if (count < minRemaining) {
                        minRemaining = count;
                        bestPosition = [r, c];
                    }
                }
            }
        }
        return bestPosition;
    }

    generate(progressCallback = null) {
        if (!this.startTime) {
            this.startTime = Date.now();
            this.lastProgressTime = this.startTime;
        }

        const empty = this.getEmptyPositionWithMRV();
        if (!empty) return true;

        const currentTime = Date.now();
        if (currentTime - this.startTime > this.maxGenerationTime) {
            throw new Error('Generation timeout');
        }

        const [row, col] = empty;
        const numbers = Array.from({ length: this.size }, (_, i) => i + 1);
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
                    if (progress >= this.lastProgress + 5 || (currentTime - this.lastProgressTime) > 1000) {
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

                if (!this.regions || !Array.isArray(this.regions) || this.regions.length === 0) {
                    this.regions = this.layoutType === 'jigsaw' ?
                        generateJigsawRegions(this.size) :
                        this.generateRegions();
                    this.populateCellRegionMap();
                }

                if (progressCallback) {
                    progressCallback(0);
                }

                if (this.generate(progressCallback)) {
                    const solution = this.grid.map(row => [...row]);
                    const cells = [];
                    for (let i = 0; i < this.size; i++) {
                        for (let j = 0; j < this.size; j++) {
                            cells.push([i, j]);
                        }
                    }

                    for (let i = cells.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [cells[i], cells[j]] = [cells[j], cells[i]];
                    }

                    const toRemove = Math.floor(cells.length * difficulty);
                    for (let i = 0; i < toRemove; i++) {
                        const [row, col] = cells[i];
                        this.grid[row][col] = 0;
                    }

                    return {
                        grid: this.grid.flat(),
                        solution: solution.flat(),
                        size: this.size,
                        boxWidth: this.boxWidth,
                        boxHeight: this.boxHeight,
                        regions: this.regions,
                        layoutType: this.layoutType,
                        difficulty: difficulty
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
        const boxesPerRow = Math.ceil(this.size / this.boxWidth);
        const boxesPerCol = Math.ceil(this.size / this.boxHeight);

        for (let boxY = 0; boxY < boxesPerCol; boxY++) {
            for (let boxX = 0; boxX < boxesPerRow; boxX++) {
                const region = [];
                for (let i = 0; i < this.boxHeight; i++) {
                    for (let j = 0; j < this.boxWidth; j++) {
                        const row = boxY * this.boxHeight + i;
                        const col = boxX * this.boxWidth + j;
                        if (row < this.size && col < this.size) {
                            region.push(row * this.size + col);
                        }
                    }
                }
                if (region.length > 0) {
                    regions.push(region);
                }
            }
        }
        return regions;
    }
}

export { SudokuGenerator, getValidBoxCombinations };