<script>
    import { uploadSudoku, doesSudokuExist } from '$lib/services/db';
    
    export let sudokus = [];
    
    let isUploading = false;
    let progress = 0;
    let skipped = 0;
    let error = null;
    
    async function uploadAllSudokus() {
        isUploading = true;
        progress = 0;
        skipped = 0;
        error = null;
        
        try {
            for (let i = 0; i < sudokus.length; i++) {
                const sudoku = sudokus[i];
                // Check if sudoku already exists
                const exists = await doesSudokuExist(sudoku.id);
                if (exists) {
                    skipped++;
                } else {
                    await uploadSudoku(sudoku);
                }
                progress = i + 1;
            }
        } catch (err) {
            error = err.message;
        } finally {
            isUploading = false;
        }
    }
</script>

<div class="inline-block">
    <button
        on:click={uploadAllSudokus}
        disabled={isUploading || sudokus.length === 0}
        class="bg-green-500 text-white px-4 py-2 rounded disabled:bg-green-300"
    >
        {#if isUploading}
            Uploading ({progress}/{sudokus.length})...
        {:else}
            Upload All Sudokus
        {/if}
    </button>
    
    {#if progress > 0 && skipped > 0}
        <div class="text-gray-600 mt-2">
            Skipped {skipped} existing sudoku{skipped === 1 ? '' : 's'}
        </div>
    {/if}
    
    {#if error}
        <div class="text-red-500 mt-2">
            Error: {error}
        </div>
    {/if}
</div>
