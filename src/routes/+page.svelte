<script>
    import SudokuGrid from '$lib/components/SudokuGrid.svelte';
    import { getValidBoxCombinations } from '$lib/sudokuGen';
    import { browser } from '$app/environment';
    import { uploadSudoku } from '$lib/services/db';
    import BulkUpload from '$lib/components/BulkUpload.svelte';
    
    let layoutType = 'regular';
    let gridSize = 9;
    let boxConfig = { width: 3, height: 3, type: 'regular' };
    let difficulty = 0.5;
    let count = 1;
    let sudokuDataList = [];
    let error = null;
    let generating = false;
    let progress = 0;
    let progressGrid = null;
    
    let worker;

    $: validSizes = [4, 6, 8, 9, 12, 16];
    $: boxCombinations = getValidBoxCombinations(gridSize);
    $: if (boxCombinations.length > 0 && !boxCombinations.some(c => c.width === boxConfig.width && c.height === boxConfig.height)) {
        boxConfig = boxCombinations[0];
    }

    async function generatePuzzle() {
        try {
            console.log('Starting puzzle generation:', { gridSize, boxConfig, difficulty, count, layoutType });
            error = null;
            generating = true;
            progress = 0;
            sudokuDataList = [];
            
            if (!browser) {
                console.log('Skipping generation in SSR');
                generating = false;
                return;
            }
            
            if (worker) {
                console.log('Terminating existing worker');
                worker.terminate();
            }
            
            worker = new Worker(new URL('../lib/workers/sudokuWorker.js', import.meta.url), { type: 'module' });
            
            worker.onmessage = (e) => {
                const { type, progress: currentProgress, puzzles, error: workerError, progressGrid: currentProgressGrid } = e.data;
                console.log('Worker message:', type, { currentProgress, hasResult: !!puzzles });
                
                if (type === 'progress') {
                    progress = currentProgress;
                    progressGrid = currentProgressGrid;
                } else if (type === 'success') {
                    console.log('Received new puzzles:', puzzles);
                    sudokuDataList = puzzles.map(puzzle => ({
                        ...puzzle,
                        id: generateSudokuId(puzzle),
                        timestamp: Date.now()
                    }));
                    generating = false;
                    progressGrid = null;
                } else if (type === 'error') {
                    error = workerError;
                    generating = false;
                    progressGrid = null;
                }
            };

            worker.postMessage({ 
                size: gridSize,
                boxWidth: boxConfig.width, 
                boxHeight: boxConfig.height, 
                difficulty, 
                count,
                layoutType: boxConfig.type  // Make sure this is passed
            });
        } catch (e) {
            console.error('Generation error:', e);
            error = e.message;
            sudokuDataList = [];
            generating = false;
            progressGrid = null;
        }
    }
    
    // Remove automatic regeneration on parameter change to avoid race conditions
    $: console.log('Current sudoku data:', sudokuDataList);

    // Only cleanup worker on component destruction
    import { onDestroy } from 'svelte';
    onDestroy(() => {
        if (worker) {
            console.log('Cleaning up worker');
            worker.terminate();
        }
    });
    
    // Only generate initial puzzle in browser
    $: if (browser && !sudokuDataList.length) {
        generatePuzzle();
    }

    function printSudokus() {
        window.print();
    }

    // Add new functions for export/import
    function generateSudokuId(sudoku) {
        const { grid, solution, size, boxWidth, boxHeight, difficulty, regions } = sudoku;
        const str = [
            grid.join(''),
            solution.join(''),
            size,
            boxWidth,
            boxHeight,
            difficulty,
            JSON.stringify(regions)
        ].join('|');
        
        // Using a more thorough hashing approach
        return Array.from(str).reduce((hash, char) => {
            const chr = char.charCodeAt(0);
            hash = ((hash << 5) - hash) + chr;
            hash = hash & hash;
            return Math.abs(hash);
        }, 0).toString(36);
    }

    function exportSudokus() {
        const exportData = sudokuDataList.map(sudoku => ({
            ...sudoku,
            id: generateSudokuId(sudoku)
        }));
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sudoku-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function importSudokus(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            const text = await file.text();
            const imported = JSON.parse(text);
            
            if (!Array.isArray(imported)) {
                throw new Error('Invalid import format');
            }

            // Validate each sudoku
            imported.forEach(sudoku => {
                if (!sudoku.grid || !sudoku.solution || !sudoku.size || 
                    !sudoku.boxWidth || !sudoku.boxHeight || !sudoku.regions) {
                    throw new Error('Invalid sudoku data');
                }
            });

            sudokuDataList = imported;
        } catch (e) {
            error = `Import failed: ${e.message}`;
        } finally {
            event.target.value = ''; // Reset input
        }
    }

    // Add upload functionality
    async function uploadCurrentSudoku(sudoku) {
        try {
            if (!sudoku.id) {
                sudoku.id = generateSudokuId(sudoku);
            }
            await uploadSudoku(sudoku);
            return true;
        } catch (e) {
            error = `Upload failed: ${e.message}`;
            return false;
        }
    }

    // Add upload button handler
    async function uploadSelectedSudoku(sudoku) {
        if (await uploadCurrentSudoku(sudoku)) {
            alert('Sudoku uploaded successfully!');
        }
    }
</script>

<svelte:head>
    <style media="print">
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            width: 100%;
            min-height: 100vh;
        }
        body * {
            visibility: hidden;
        }
        .print-content, .print-content * {
            visibility: visible;
        }
        .print-content {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: calc(100% - 4cm);
            max-width: 100%;
        }
        .no-print {
            display: none !important;
        }
        .page-break {
            break-before: page;
            page-break-before: always;
        }
        .puzzle-grid {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 2cm;
        }
        .solutions-header {
            break-before: page;
            page-break-before: always;
            margin-bottom: 2cm;
        }
    </style>
</svelte:head>

<div class="flex flex-col items-center gap-4 p-4">
    <div class="flex gap-4 items-center flex-wrap no-print">
        <label>
            Gittergröße:
            <select bind:value={gridSize} class="border p-1">
                {#each validSizes as size}
                    <option value={size}>{size}x{size}</option>
                {/each}
            </select>
        </label>
        
        <label>
            Box-Konfiguration:
            <select bind:value={boxConfig} class="border p-1">
                {#each boxCombinations as combo}
                    <option value={combo}>
                        {combo.type === 'jigsaw' ? 'Jigsaw' : `${combo.width}x${combo.height}`}
                    </option>
                {/each}
            </select>
        </label>
        
        <label>
            Schwierigkeit:
            <input type="range" bind:value={difficulty} min="0.2" max="0.8" step="0.1">
            {(difficulty * 100).toFixed(0)}%
        </label>
        
        <label>
            Anzahl:
            <select bind:value={count} class="border p-1">
                {#each Array(50) as _, i}
                    <option value={i + 1}>{i + 1}</option>
                {/each}
            </select>
        </label>
        
        <button 
            class="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            on:click={generatePuzzle}
            disabled={generating}
        >
            {generating ? `Generiere (${progress}%)` : 'Neue Rätsel generieren'}
        </button>

        <button 
            class="bg-green-500 text-white px-4 py-2 rounded disabled:bg-green-300"
            on:click={printSudokus}
            disabled={generating || sudokuDataList.length === 0}
        >
            Sudokus drucken
        </button>

        <button 
            class="bg-purple-500 text-white px-4 py-2 rounded disabled:bg-purple-300"
            on:click={exportSudokus}
            disabled={generating || sudokuDataList.length === 0}
        >
            Export Sudokus
        </button>

        <label class="bg-orange-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-orange-600 disabled:bg-orange-300">
            Import Sudokus
            <input
                type="file"
                accept=".json"
                on:change={importSudokus}
                class="hidden"
                disabled={generating}
            />
        </label>
        <BulkUpload sudokus={sudokuDataList} />
    </div>

    {#if generating && progressGrid}
        <div class="w-full max-w-[600px]">
            <h3 class="text-center mb-2">Generation Progress: {progress}%</h3>
            <SudokuGrid 
                sudokuData={{
                    grid: progressGrid,
                    solution: progressGrid,
                    size: gridSize,
                    boxWidth: boxConfig.width,
                    boxHeight: boxConfig.height,
                    regions: boxConfig.type === 'jigsaw' ? [] : Array.from({ length: gridSize }, (_, i) => {
                        const boxY = Math.floor(i / boxConfig.width);
                        const boxX = i % boxConfig.width;
                        const cells = [];
                        for (let y = 0; y < boxConfig.height; y++) {
                            for (let x = 0; x < boxConfig.width; x++) {
                                cells.push((boxY * boxConfig.height + y) * gridSize + (boxX * boxConfig.width + x));
                            }
                        }
                        return cells;
                    }),
                    layoutType: boxConfig.type,
                    puzzleId: 'progress'
                }}
            />
        </div>
    {/if}

    {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded no-print">
            {error}
        </div>
    {/if}

    <div class="print-content w-full max-w-[1200px]">
        <div class="grid grid-cols-1 gap-16 mb-16 w-full">
            {#each sudokuDataList as sudoku, index}
                <div class="flex flex-col items-center puzzle-grid w-full">
                    <SudokuGrid 
                        sudokuData={{...sudoku}} 
                        sequenceNumber={index + 1}
                    />
                    <button 
                        class="bg-indigo-500 text-white px-4 py-2 rounded mt-4 no-print hover:bg-indigo-600"
                        on:click={() => uploadSelectedSudoku(sudoku)}
                    >
                        Upload Sudoku
                    </button>
                </div>
            {/each}
        </div>

        <h2 class="solutions-header text-2xl font-bold text-center">Lösungen</h2>
        
        <div class="grid grid-cols-1 gap-16 w-full">
            {#each sudokuDataList as sudoku, index}
                <div class="flex flex-col items-center puzzle-grid w-full">
                    <SudokuGrid 
                        sudokuData={{...sudoku}} 
                        sequenceNumber={index + 1}
                        forceSolution={true}
                    />
                </div>
            {/each}
        </div>
    </div>
</div>