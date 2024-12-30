<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { listSudokus } from '$lib/services/db';
    import SudokuGrid from '$lib/components/SudokuGrid.svelte';
    import { selectedSudokus, toggleSelection, clearSelection, bulkSelect } from '$lib/stores/selection';
    import { getValidBoxCombinations } from '$lib/sudokuGen';
    import { goto } from '$app/navigation';
    
    let currentPage = 1;
    let perPage = 20; // Changed default
    const pageSizes = [10, 20, 50, 100, 500];
    let loading = false;
    let error = null;
    let sudokus = [];
    let totalPages = 0;

    // Filter and sort states
    let filters = {
        difficulty: '',
        size: '',
        layout: ''
    };
    let sortField = 'created';
    let sortOrder = 'desc';

    // Filter options
    const difficulties = [
        { value: '0.2', label: 'Sehr einfach' },
        { value: '0.4', label: 'Einfach' },
        { value: '0.6', label: 'Mittel' },
        { value: '0.8', label: 'Schwer' },
        { value: '1.0', label: 'Sehr schwer' }
    ];
    const sizes = ['9', '12', '16'];

    // Dynamic layout options based on available sizes
    $: layoutOptions = [
        { value: 'regular', label: 'Regulär (alle)' },
        { value: 'jigsaw', label: 'Jigsaw' },
        ...sizes.flatMap(size => {
            const boxCombos = getValidBoxCombinations(parseInt(size));
            return boxCombos
                .filter(combo => combo.type === 'regular')
                .map(combo => ({
                    value: `${combo.width}x${combo.height}`,
                    label: `${size}x${size} (${combo.width}x${combo.height} Boxen)`
                }));
        })
    ];

    // Replace the static layouts array with our dynamic layoutOptions
    $: layouts = layoutOptions;

    const sortOptions = [
        { value: 'created', label: 'Erstelldatum' },
        { value: 'difficulty', label: 'Schwierigkeit' },
        { value: 'size', label: 'Größe' }
    ];

    function getDifficultyLabel(difficulty) {
        if (!difficulty) return 'Alle';
        const diff = parseFloat(difficulty);
        if (diff <= 0.2) return 'Sehr einfach';
        if (diff <= 0.4) return 'Einfach';
        if (diff <= 0.6) return 'Mittel';
        if (diff <= 0.8) return 'Schwer';
        return 'Sehr schwer';
    }

    function getLayoutLabel(layout) {
        if (!layout) return 'Alle';
        const found = layouts.find(l => l.value === layout);
        return found ? found.label : layout;
    }
    
    async function loadSudokus() {
        try {
            loading = true;
            error = null;
            const result = await listSudokus(
                currentPage, 
                perPage, 
                filters, 
                sortField, 
                sortOrder
            );
            sudokus = result.items;
            totalPages = result.totalPages;
        } catch (e) {
            console.error('Error loading sudokus:', e);
            error = e.message;
            sudokus = [];
        } finally {
            loading = false;
        }
    }
    
    function resetFilters() {
        filters = {
            difficulty: '',
            size: '',
            layout: ''
        };
        currentPage = 1;
    }

    function goToPage(page) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }

    function handleSelectAll() {
        bulkSelect(sudokus, true);
    }

    function handleDeselectAll() {
        bulkSelect(sudokus, false);
    }

    function viewSelected() {
        const ids = Array.from($selectedSudokus);
        if (ids.length === 0) {
            alert('Bitte wählen Sie mindestens ein Sudoku aus.');
            return;
        }
        goto(`/view-selected?ids=${ids.join(',')}`);
    }

    onMount(() => {
        loadSudokus();
    });
    
    $: if (browser && (currentPage || filters || sortField || sortOrder || perPage)) {
        loadSudokus();
    }
</script>

<div class="flex h-screen">
    <!-- Main Content -->
    <div class="flex-1 flex flex-col items-center gap-8 p-4 overflow-y-auto">
        <h1 class="text-2xl font-bold">Sudoku Liste</h1>
        
        <!-- Add page size selector -->
        <div class="w-full max-w-[1200px] flex justify-between items-center">
            <select 
                bind:value={perPage}
                class="p-2 rounded border"
            >
                {#each pageSizes as size}
                    <option value={size}>{size} pro Seite</option>
                {/each}
            </select>

            <div class="flex gap-2">
                <button 
                    on:click={handleSelectAll}
                    class="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Alle auswählen
                </button>
                <button 
                    on:click={handleDeselectAll}
                    class="bg-gray-500 text-white px-4 py-2 rounded"
                >
                    Alle abwählen
                </button>
            </div>
        </div>
        
        <!-- Filter and Sort Controls -->
        <div class="w-full max-w-[1200px] bg-gray-100 p-4 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="flex flex-col">
                    <label for="difficulty">Schwierigkeit:</label>
                    <select 
                        id="difficulty" 
                        bind:value={filters.difficulty} 
                        class="p-2 rounded"
                    >
                        <option value="">Alle</option>
                        {#each difficulties as diff}
                            <option value={diff.value}>{diff.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex flex-col">
                    <label for="size">Größe:</label>
                    <select 
                        id="size" 
                        bind:value={filters.size} 
                        class="p-2 rounded"
                    >
                        <option value="">Alle</option>
                        {#each sizes as size}
                            <option value={size}>{size}x{size}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex flex-col">
                    <label for="layout">Layout:</label>
                    <select 
                        id="layout" 
                        bind:value={filters.layout} 
                        class="p-2 rounded"
                    >
                        <option value="">Alle</option>
                        {#each layouts as layout}
                            <option value={layout.value}>{layout.label}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex flex-col">
                    <label for="sort">Sortierung:</label>
                    <div class="flex gap-2">
                        <select 
                            id="sort" 
                            bind:value={sortField} 
                            class="p-2 rounded flex-grow"
                        >
                            {#each sortOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                        <button 
                            on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
                            class="px-3 py-2 bg-gray-200 rounded"
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="mt-4 flex justify-end">
                <button 
                    on:click={resetFilters}
                    class="bg-gray-500 text-white px-4 py-2 rounded"
                >
                    Filter zurücksetzen
                </button>
            </div>
        </div>
        
        <div class="flex gap-2 items-center">
            <button 
                class="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
                on:click={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
            >
                Vorherige
            </button>
            
            <span class="px-4">
                Seite {currentPage} von {totalPages}
            </span>
            
            <button 
                class="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
                on:click={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
            >
                Nächste
            </button>
        </div>
        
        {#if loading}
            <div class="text-center">Lade Sudokus...</div>
        {/if}
        
        {#if error}
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        {/if}
        
        <div class="grid grid-cols-1 gap-16 w-full max-w-[1200px]">
            {#each sudokus as sudoku, index}
                <div class="flex flex-col items-center relative">
                    <input 
                        type="checkbox"
                        checked={$selectedSudokus.has(sudoku.id)}
                        on:change={() => toggleSelection(sudoku)}
                        class="absolute top-0 right-0 w-6 h-6 z-10"
                    />
                    <div class="text-sm text-gray-500 mb-2">
                        Erstellt am: {new Date(sudoku.created).toLocaleString()}
                    </div>
                    <SudokuGrid 
                        sudokuData={sudoku} 
                        sequenceNumber={currentPage * perPage - perPage + index + 1}
                    />
                </div>
            {/each}
        </div>
    </div>

    <!-- Selection Sidebar -->
    <div class="w-64 bg-gray-100 p-4 border-l border-gray-200 overflow-y-auto">
        <h2 class="text-lg font-bold mb-4">Ausgewählte Sudokus ({$selectedSudokus.size})</h2>
        
        {#if $selectedSudokus.size > 0}
            <div class="flex flex-col gap-2 mb-4">
                <button 
                    on:click={viewSelected}
                    class="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    Ausgewählte anzeigen/drucken
                </button>
                <button 
                    on:click={clearSelection}
                    class="bg-red-500 text-white px-4 py-2 rounded"
                >
                    Auswahl löschen
                </button>
            </div>

            <div class="flex flex-col gap-1">
                {#each Array.from($selectedSudokus) as id}
                    <div class="text-sm bg-white p-2 rounded">
                        ID: {id}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
