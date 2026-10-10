<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import SudokuGrid from '$lib/components/SudokuGrid.svelte';
    import { getSudoku } from '$lib/client/api';

    let sudokus = [];
    let loading = true;
    let error = null;
    let includeSolutions = true;
    let alternateLayout = false; // false = solutions at end, true = alternating
    let colorRegions = false;  // Add this line

    onMount(async () => {
        try {
            const ids = $page.url.searchParams.get('ids')?.split(',').filter(Boolean) || [];
            if (ids.length === 0) {
                error = 'Keine Sudokus ausgewählt';
                return;
            }

            const promises = ids.map(async (id) => {
                try {
                    return await getSudoku(id);
                } catch (e) {
                    console.error(`Failed to fetch sudoku ${id}:`, e);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            sudokus = results.filter(Boolean); // Remove any failed fetches

            if (sudokus.length === 0) {
                error = 'Keine Sudokus konnten geladen werden';
            }
        } catch (e) {
            console.error('Error loading sudokus:', e);
            error = e.message;
        } finally {
            loading = false;
        }
    });
</script>

<div class="flex flex-col items-center gap-8 p-4">
    <div class="no-print flex flex-col items-center gap-4">
        <h1 class="text-2xl font-bold">Ausgewählte Sudokus</h1>

        <div class="flex flex-col gap-4 bg-gray-100 p-4 rounded-lg">
            <h2 class="font-semibold">Druckoptionen:</h2>
            
            <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={includeSolutions}>
                Lösungen drucken
            </label>

            {#if includeSolutions}
                <label class="flex items-center gap-2">
                    <input type="checkbox" bind:checked={alternateLayout}>
                    Lösungen auf Rückseite (alternierend)
                </label>
            {/if}

            <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={colorRegions}>
                Regionen einfärben
            </label>

            <button 
                class="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                on:click={() => window.print()}
            >
                Drucken
            </button>
        </div>
    </div>

    {#if loading}
        <div class="no-print">Lade Sudokus...</div>
    {:else if error}
        <div class="text-red-500 no-print">{error}</div>
    {:else}
        <div class="print-content w-full max-w-[1200px]">
            {#if alternateLayout}
                <!-- Alternating Layout -->
                <div class="grid grid-cols-1 gap-16">
                    {#each sudokus as sudoku, index}
                        <div class="flex flex-col items-center puzzle-grid">
                            <SudokuGrid 
                                sudokuData={sudoku}
                                sequenceNumber={index + 1}
                                forceSolution={false}
                                {colorRegions}
                            />
                        </div>
                        {#if includeSolutions}
                            <div class="flex flex-col items-center puzzle-grid solution-page">
                                <SudokuGrid 
                                    sudokuData={sudoku}
                                    sequenceNumber={index + 1}
                                    forceSolution={true}
                                    {colorRegions}
                                />
                            </div>
                        {/if}
                    {/each}
                </div>
            {:else}
                <!-- Solutions at End Layout -->
                <div class="grid grid-cols-1 gap-16 mb-16">
                    {#each sudokus as sudoku, index}
                        <div class="flex flex-col items-center puzzle-grid">
                            <SudokuGrid 
                                sudokuData={sudoku}
                                sequenceNumber={index + 1}
                                forceSolution={false}
                                {colorRegions}
                            />
                        </div>
                    {/each}
                </div>

                {#if includeSolutions}
                    <h2 class="solutions-header text-2xl font-bold text-center">Lösungen</h2>
                    <div class="grid grid-cols-1 gap-16">
                        {#each sudokus as sudoku, index}
                            <div class="flex flex-col items-center puzzle-grid">
                                <SudokuGrid 
                                    sudokuData={sudoku}
                                    sequenceNumber={index + 1}
                                    forceSolution={true}
                                    {colorRegions}
                                />
                            </div>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</div>

<style>
@media print {
    .no-print {
        display: none !important;
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

    .solutions-header {
        break-before: page;
        page-break-before: always;
        margin-bottom: 2cm;
    }

    .puzzle-grid {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 2cm;
    }

    .print-content {
        position: relative;
        width: calc(100% - 4cm);
        max-width: 100%;
        margin: 0 auto;
    }

    .solution-page {
        break-before: page;
        page-break-before: always;
    }

    /* Ensure each puzzle starts on a new page in alternate layout */
    .puzzle-grid {
        break-before: page;
        page-break-before: always;
        break-after: avoid;
        page-break-after: avoid;
        margin-bottom: 0;
    }

    /* First puzzle shouldn't have a page break */
    .puzzle-grid:first-child {
        break-before: auto;
        page-break-before: auto;
    }
}
</style>
