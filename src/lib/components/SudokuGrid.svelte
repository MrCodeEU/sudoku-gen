<script>
    export let sudokuData;
    export let forceSolution = false;
    
    // Add default initialization
    $: ({ 
        grid = [], 
        solution = [], 
        size = 0, 
        boxWidth = 0, 
        boxHeight = 0, 
        regions = [], 
        puzzleId = 0,
        layoutType = 'regular'
    } = sudokuData || {});
    
    let showSolution = false;

    function getDifficultyText(difficulty) {
        if (difficulty <= 0.2) return "Sehr einfach";
        if (difficulty <= 0.4) return "Einfach";
        if (difficulty <= 0.6) return "Mittel";
        if (difficulty <= 0.8) return "Schwer";
        return "Sehr schwer";
    }

    $: console.log('Grid component received data:', { grid, size, boxWidth, boxHeight });
    $: displaySolution = showSolution || forceSolution;

    function getCellClasses(row, col, isRightBorder, isBottomBorder) {
        if (!regions || !Array.isArray(regions)) return ['cell', 'bg-white', 'flex', 'items-center', 'justify-center', 'font-bold'];
        
        const cellIndex = row * size + col;
        const currentRegion = regions.findIndex(r => r?.includes?.(cellIndex));
        const classes = ['cell', 'bg-white', 'flex', 'items-center', 'justify-center', 'font-bold'];
        
        // Only add box borders for regular layout
        if (layoutType === 'regular') {
            if (isRightBorder) classes.push('border-r-thick');
            if (isBottomBorder) classes.push('border-b-thick');
        }
        
        // Add jigsaw borders
        if (layoutType === 'jigsaw' && currentRegion !== -1) {
            // Right border
            const rightNeighborIndex = cellIndex + 1;
            if (col < size - 1 && !regions[currentRegion].includes(rightNeighborIndex)) {
                classes.push('border-r-thick');
            }
            
            // Bottom border
            const bottomNeighborIndex = cellIndex + size;
            if (row < size - 1 && !regions[currentRegion].includes(bottomNeighborIndex)) {
                classes.push('border-b-thick');
            }
        }
        
        if (row === size - 1) classes.push('last-row');
        if (col === size - 1) classes.push('last-column');
        return classes.join(' ');
    }
</script>

<div class="flex flex-col items-center gap-2 w-full">
    <h2 class="text-lg font-bold text-center">
        Sudoku Nr. {puzzleId} - {size}x{size} - {getDifficultyText(sudokuData.difficulty)}
    </h2>
    
    {#if !forceSolution}
    <button 
        class="bg-blue-500 text-white px-4 py-2 rounded mb-2 hover:bg-blue-600 no-print"
        on:click={() => showSolution = !showSolution}
    >
      {showSolution ? 'Lösung ausblenden' : 'Lösung anzeigen'}
    </button>
    {/if}


    <div 
            class="grid bg-gray-300 sudoku-grid"
            style="grid-template-columns: repeat({size}, 1fr); --grid-size: {size};"
        >
        {#each grid as cell, index}
            {@const row = Math.floor(index / size)}
            {@const col = index % size}
            {@const isRightBorder = (col + 1) % boxWidth === 0 && col < size - 1}
            {@const isBottomBorder = (row + 1) % boxHeight === 0 && row < size - 1}
            {@const solutionValue = solution[index]}
            {@const displayValue = displaySolution ? solutionValue : cell}
            
            <div class={getCellClasses(row, col, isRightBorder, isBottomBorder)}>
                <div class="cell-content {displaySolution && !cell ? 'solution-number' : ''}">
                    {displayValue || ''}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .sudoku-grid {
        border: 2px solid #374151;
        width: 100%;
        max-width: 800px;  /* Increased from 600px */
        aspect-ratio: 1;
        margin: 0 auto;  /* Center the grid */
        padding: 0;
        display: grid;
        border-right: none;  /* Remove right border */
        border-bottom: none; /* Remove bottom border */
    }
    
    .cell {
        position: relative;
        width: 100%;
        padding-bottom: 100%; /* Makes the cell square */
        border-right: 1px solid #d1d5db;
        border-bottom: 1px solid #d1d5db;
    }

    .cell-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: min(4vw, 40px);  /* Adjusted for larger cells */
    }

    .solution-number {
        color: #2563eb;  /* Blue color for solution numbers */
    }
    
    .border-r-thick {
        border-right: 2px solid #374151 !important; /* Added !important */
    }
    
    .border-b-thick {
        border-bottom: 2px solid #374151 !important; /* Added !important */
    }

    .last-row {
        border-bottom: 2px solid #374151;
    }
    
    .last-column {
        border-right: 2px solid #374151;
    }

    @media print {
      .sudoku-grid {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        grid-template-rows: repeat(9, 1fr);
        aspect-ratio: 1;
        page-break-after: always;
        page-break-inside: avoid;
        border: 3pt solid black; /* Ensure the outer border is consistent */
        border-collapse: collapse; /* Ensure borders collapse */
    }

    .cell {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0.5pt solid #666; /* Thinner and gray */
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        background-color: white;
    }

    .border-r-thick, .border-b-thick {
        border-color: black !important;
        border-width: 2pt !important;
    }

    .last-row {
        border-bottom: 3pt solid black !important;
    }

    .last-column {
        border-right: 3pt solid black !important;
    }

    .cell-content {
        font-size: min(20pt, 3.5vh); /* Adjust font size for larger grid */
    }
    }
</style>
