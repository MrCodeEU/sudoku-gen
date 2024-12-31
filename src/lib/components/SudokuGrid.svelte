<script>
    export let sudokuData;
    export let forceSolution = false;
    export let sequenceNumber = null; // Add this to receive the sequence number
    
    // Add default initialization
    $: ({ 
        grid = [], 
        solution = [], 
        size = 0, 
        boxWidth = 0, 
        boxHeight = 0, 
        regions = [], 
        id = null,  // Change puzzleId to id to match the property name in the data
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
        if (layoutType !== 'jigsaw') {
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

    function formatPuzzleId(id) {
        if (id === undefined || id === null) return 'N/A';
        return id.toString();
    }

    // Remove the sudokuDataList reference that was causing issues
    $: displayNumber = forceSolution ? '?' : '?';
</script>

<div class="flex flex-col items-center gap-2 w-full">
    <h2 class="text-lg font-bold text-center">
        Sudoku #{sequenceNumber || '?'} - {size}x{size} - {getDifficultyText(sudokuData?.difficulty ?? 0)}
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

    <!-- Add puzzle ID at bottom -->
    <div class="text-sm text-gray-600 mt-2">
        ID: {formatPuzzleId(id)}  <!-- Change puzzleId to id -->
    </div>
</div>

<style>
    .sudoku-grid {
        width: 100%;
        height: 100%;
        max-width: 800px;  /* Increased from 600px */
        aspect-ratio: 1;
        margin: 0 auto;  /* Center the grid */
        padding: 0;
        display: grid;
        border-right: none;  /* Remove right border */
        border-bottom: none; /* Remove bottom border */
        border: 4px solid #000000;  /* Add border around the grid */
        /* Add these properties to fix sizing */
        position: relative;
        overflow: hidden;
    }
    
    .cell {
        position: relative;
        width: 100%;
        height: 100%;
        border-right: 1px solid #d1d5db;
        border-bottom: 1px solid #d1d5db;
        /* Add this to ensure content stays within bounds */
        overflow: hidden;
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
        margin-right: -1px; /* Add this to fix corner gaps */
    }
    
    .border-b-thick {
        border-bottom: 2px solid #374151 !important; /* Added !important */
        margin-bottom: -1px; /* Add this to fix corner gaps */
    }

    @media print {
        .sudoku-grid {
            width: 100%;
            max-width: 180mm; /* A4 width minus margins */
            aspect-ratio: 1;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 3pt solid black;
            margin: 0 auto;
            /* Add this to ensure borders are fully visible */
            padding: 0;
            overflow: visible;
            position: relative;
        }

        .cell {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background-color: white;
            /* Adjust position to help with border overlap */
            z-index: 1;
            /* Remove default border to prevent interference */
            border: none;
            border: 0.25pt solid #999999;
            margin-right: -0.75pt;
            margin-bottom: -0.75pt;
            position: relative; /* Ensure positioning context */
        }

        /* Thicker borders for regions */
        .border-r-thick {
            border-right: 4pt solid black !important;
            margin-right: -3pt !important;
            position: relative;
            z-index: 2;
        }

        .border-b-thick {
            border-bottom: 4pt solid black !important;
            margin-bottom: -3pt !important;
            position: relative;
            z-index: 2;
        }

        /* Single corner fix */
        .border-r-thick.border-b-thick::after {
            content: '';
            position: absolute;
            bottom: -3pt;
            right: -3pt;
            width: 6pt;
            height: 6pt;
            background: black;
            z-index: 3;
            transform: translate(50%, 50%);
        }

        /* Fix for L-shaped intersections */
        .border-r-thick::after {
            content: '';
            position: absolute;
            top: 0;
            right: -3pt;
            width: 3pt;
            height: calc(100% + 3pt); /* Extend slightly past the bottom */
            background: black;
            z-index: 3;
        }

        .border-b-thick::after {
            content: '';
            position: absolute;
            bottom: -3pt;
            left: 0;
            width: calc(100% + 3pt); /* Extend slightly past the right edge */
            height: 3pt;
            background: black;
            z-index: 3;
        }

        .cell-content {
            font-size: calc(180mm / var(--grid-size) * 0.4); /* Scales with grid size */
            line-height: 1;
        }
        
        /* Add intersection fixes */
        .border-r-thick.border-b-thick {
            z-index: 3;
        }

        /* Force white background */
        @page {
            margin: 15mm;
        }

        .solution-number {
            color: #2563eb !important; /* Keep the same blue color as web version */
        }

        .text-sm {
            font-size: 8pt;
            color: #666666 !important;
        }
    }
</style>
