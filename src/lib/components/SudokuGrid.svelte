<script>
    export let sudokuData;
    export let forceSolution = false;
    export let sequenceNumber = null; // Add this to receive the sequence number
    export let small = false; // Add this prop
    export let colorRegions = false;  // Add this prop
    
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

    // Region index per cell: jigsaw uses the stored regions, regular layouts use boxes
    $: regionOf = buildRegionMap(size, boxWidth, boxHeight, regions, layoutType);

    function buildRegionMap(size, boxWidth, boxHeight, regions, layoutType) {
        const map = new Array(size * size).fill(-1);
        if (layoutType === 'jigsaw' && Array.isArray(regions) && regions.length) {
            regions.forEach((region, r) => region?.forEach?.(idx => { map[idx] = r; }));
        } else if (boxWidth && boxHeight) {
            const boxesPerRow = size / boxWidth;
            for (let i = 0; i < size * size; i++) {
                const row = Math.floor(i / size);
                const col = i % size;
                map[i] = Math.floor(row / boxHeight) * boxesPerRow + Math.floor(col / boxWidth);
            }
        }
        return map;
    }

    // Grid lines drawn as one SVG overlay (viewBox units = cells) so lines never
    // overlap cell content and thick segments join cleanly at corners
    $: thinPath = buildThinPath(size);
    $: thickPath = buildThickPath(size, regionOf);

    function buildThinPath(size) {
        let d = '';
        for (let i = 1; i < size; i++) d += `M${i} 0V${size}M0 ${i}H${size}`;
        return d;
    }

    function buildThickPath(size, regionOf) {
        let d = '';
        const differs = (a, b) => regionOf[a] !== regionOf[b];
        for (let line = 1; line < size; line++) {
            // Merge consecutive boundary edges into one segment per run
            let hStart = -1, vStart = -1;
            for (let k = 0; k <= size; k++) {
                const h = k < size && differs((line - 1) * size + k, line * size + k);
                if (h && hStart < 0) hStart = k;
                if (!h && hStart >= 0) { d += `M${hStart} ${line}H${k}`; hStart = -1; }

                const v = k < size && differs(k * size + line - 1, k * size + line);
                if (v && vStart < 0) vStart = k;
                if (!v && vStart >= 0) { d += `M${line} ${vStart}V${k}`; vStart = -1; }
            }
        }
        return d;
    }

    // regionOf/colorRegions passed in so the template re-renders when they change
    function getCellClasses(index, regionOf, colorRegions) {
        const classes = ['cell', 'flex', 'items-center', 'justify-center', 'font-bold'];
        if (colorRegions && regionOf[index] >= 0) {
            classes.push(`region-${regionOf[index] % 16}`);
        }
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
            class="grid sudoku-grid {small ? 'small' : ''}"
            style="grid-template-columns: repeat({size}, 1fr); grid-template-rows: repeat({size}, 1fr); --grid-size: {size};"
        >
        {#each grid as cell, index}
            {@const solutionValue = solution[index]}
            {@const displayValue = displaySolution ? solutionValue : cell}

            <div class={getCellClasses(index, regionOf, colorRegions)}>
                <div class="cell-content {displaySolution && !cell ? 'solution-number' : ''}">
                    {displayValue || ''}
                </div>
            </div>
        {/each}

        {#if size}
            <svg class="grid-lines" viewBox="0 0 {size} {size}" preserveAspectRatio="none" aria-hidden="true">
                <path class="line-thin" d={thinPath} />
                <path class="line-thick" d={thickPath} />
                <rect class="line-outer" x="0" y="0" width={size} height={size} />
            </svg>
        {/if}
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
        background: #ffffff;
        position: relative;
    }

    .cell {
        position: relative;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
    }

    /* All grid lines live in this overlay; widths are absolute (non-scaling) */
    .grid-lines {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        pointer-events: none;
    }

    .grid-lines path,
    .grid-lines rect {
        fill: none;
        vector-effect: non-scaling-stroke;
    }

    .line-thin {
        stroke: #9ca3af;
        stroke-width: 1px;
    }

    .line-thick {
        stroke: #000000;
        stroke-width: 3px;
        stroke-linecap: square;
    }

    .line-outer {
        stroke: #000000;
        stroke-width: 4px;
        stroke-linejoin: miter;
    }

    .small .line-thick { stroke-width: 1.5px; }
    .small .line-outer { stroke-width: 2px; }
    .small .line-thin { stroke-width: 0.5px; }

    .cell-content {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: min(4vw, 40px);  /* Default size */
    }

    /* Add small variant */
    :global(.small) .cell-content {
        font-size: min(1.8vw, 12px);  /* Even smaller size for grid view */
    }

    .solution-number {
        color: #2563eb;  /* Blue color for solution numbers */
    }
    
    /* Replace the region colors with the new soft and muted tones */
    .region-0  { background-color: #F2D7D5 !important; } /* Soft Pink */
    .region-1  { background-color: #D5E1DF !important; } /* Soft Green */
    .region-2  { background-color: #F8E5C8 !important; } /* Soft Peach */
    .region-3  { background-color: #DDEBF1 !important; } /* Light Blue */
    .region-4  { background-color: #FFF9C4 !important; } /* Pale Yellow */
    .region-5  { background-color: #E1D5E7 !important; } /* Lavender */
    .region-6  { background-color: #F3E0E0 !important; } /* Blush */
    .region-7  { background-color: #D7F2E4 !important; } /* Mint */
    .region-8  { background-color: #F5D0C5 !important; } /* Peach Pink */
    .region-9  { background-color: #D9F7D6 !important; } /* Soft Lime */
    .region-10 { background-color: #FFF4A3 !important; } /* Mellow Yellow */
    .region-11 { background-color: #CCE0F5 !important; } /* Sky Blue */
    .region-12 { background-color: #E5D5F2 !important; } /* Pale Purple */
    .region-13 { background-color: #F9E5CF !important; } /* Beige */
    .region-14 { background-color: #F2C2C2 !important; } /* Light Coral */
    .region-15 { background-color: #E2F3E4 !important; } /* Sage */

    @media print {
        .sudoku-grid {
            width: 100%;
            max-width: 180mm; /* A4 width minus margins */
            aspect-ratio: 1;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto;
            padding: 0;
            print-color-adjust: exact;
        }

        .line-thin  { stroke: #888888; stroke-width: 0.5pt; }
        .line-thick { stroke-width: 2pt; }
        .line-outer { stroke-width: 2.5pt; }

        .cell-content {
            font-size: calc(180mm / var(--grid-size) * 0.4); /* Scales with grid size */
            line-height: 1;
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

        /* Ensure colors print properly */
        .region-0  { background-color: #F2D7D5 !important; print-color-adjust: exact; }
        .region-1  { background-color: #D5E1DF !important; print-color-adjust: exact; }
        .region-2  { background-color: #F8E5C8 !important; print-color-adjust: exact; }
        .region-3  { background-color: #DDEBF1 !important; print-color-adjust: exact; }
        .region-4  { background-color: #FFF9C4 !important; print-color-adjust: exact; }
        .region-5  { background-color: #E1D5E7 !important; print-color-adjust: exact; }
        .region-6  { background-color: #F3E0E0 !important; print-color-adjust: exact; }
        .region-7  { background-color: #D7F2E4 !important; print-color-adjust: exact; }
        .region-8  { background-color: #F5D0C5 !important; print-color-adjust: exact; }
        .region-9  { background-color: #D9F7D6 !important; print-color-adjust: exact; }
        .region-10 { background-color: #FFF4A3 !important; print-color-adjust: exact; }
        .region-11 { background-color: #CCE0F5 !important; print-color-adjust: exact; }
        .region-12 { background-color: #E5D5F2 !important; print-color-adjust: exact; }
        .region-13 { background-color: #F9E5CF !important; print-color-adjust: exact; }
        .region-14 { background-color: #F2C2C2 !important; print-color-adjust: exact; }
        .region-15 { background-color: #E2F3E4 !important; print-color-adjust: exact; }
    }
</style>
