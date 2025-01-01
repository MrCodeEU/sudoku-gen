<script>
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { listSudokus } from '$lib/client/api';
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
    let totalItems = 0;  // Add this line
    let showSidebar = false;

    // Filter and sort states
    let filters = {
        difficulty: '',
        size: '',
        layout: '',
        dateFrom: '',
        dateTo: ''
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
            totalItems = result.totalItems;  // Add this line
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
            layout: '',
            dateFrom: '',
            dateTo: ''
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

    // Add this function for handling clicks outside
    function handleClickOutside(event) {
        const sidebar = document.getElementById('selection-sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        if (showSidebar && 
            sidebar && 
            !sidebar.contains(event.target) && 
            !toggleButton.contains(event.target)) {
            showSidebar = false;
        }
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="flex h-screen relative">
    <!-- Main Content -->
    <div class="flex-1 flex flex-col items-center gap-8 p-4 overflow-y-auto">
        <div class="w-full max-w-[1200px] flex justify-between items-center">
            <h1 class="text-2xl font-bold">Sudoku Liste</h1>
            <div class="text-lg font-semibold text-gray-600">
                {totalItems} Sudokus gefunden
            </div>
        </div>
        
        <!-- Add page size selector -->
        <div class="w-full max-w-[1200px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <select 
                bind:value={perPage}
                class="p-2 rounded border w-full sm:w-auto"
            >
                {#each pageSizes as size}
                    <option value={size}>{size} pro Seite</option>
                {/each}
            </select>

            <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                <button 
                    id="sidebar-toggle"
                    on:click={() => showSidebar = !showSidebar}
                    class="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2 flex-grow sm:flex-grow-0"
                >
                    <span>Auswahl ({$selectedSudokus.size})</span>
                    {#if showSidebar}
                        <span>→</span>
                    {:else}
                        <span>←</span>
                    {/if}
                </button>
                <button 
                    on:click={handleSelectAll}
                    class="bg-blue-500 text-white px-4 py-2 rounded flex-grow sm:flex-grow-0"
                >
                    Alle auswählen
                </button>
                <button 
                    on:click={handleDeselectAll}
                    class="bg-gray-500 text-white px-4 py-2 rounded flex-grow sm:flex-grow-0"
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

                <div class="flex flex-col">
                    <label for="dateFrom">Von Datum:</label>
                    <input 
                        type="date" 
                        id="dateFrom"
                        bind:value={filters.dateFrom}
                        class="p-2 rounded"
                    />
                </div>

                <div class="flex flex-col">
                    <label for="dateTo">Bis Datum:</label>
                    <input 
                        type="date" 
                        id="dateTo"
                        bind:value={filters.dateTo}
                        class="p-2 rounded"
                    />
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
        
        <!-- Modified grid layout -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 w-full max-w-[1200px]">
            {#each sudokus as sudoku, index}
                <div class="flex flex-col items-center relative">
                    <input 
                        type="checkbox"
                        checked={$selectedSudokus.has(sudoku.id)}
                        on:change={() => toggleSelection(sudoku)}
                        class="absolute top-0 right-0 w-6 h-6 z-10"
                    />
                    <div class="text-xs text-gray-500 mb-2">
                        Erstellt am: {new Date(sudoku.created).toLocaleString()}
                    </div>
                    <div class="transform scale-75 origin-top small w-full">
                        <SudokuGrid 
                            sudokuData={sudoku} 
                            sequenceNumber={currentPage * perPage - perPage + index + 1}
                            small={true}
                        />
                    </div>
                </div>
            {/each}
        </div>
    </div>

    <!-- Modified Selection Sidebar with ID -->
    <div id="selection-sidebar"
         class="fixed top-0 right-0 h-full bg-gray-100 border-l border-gray-200 overflow-y-auto transition-all duration-300 z-50 shadow-lg"
         class:w-64={showSidebar}
         class:w-0={!showSidebar}
    >
        <div class="w-64 p-4 {showSidebar ? '' : 'hidden'}">
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
</div>
