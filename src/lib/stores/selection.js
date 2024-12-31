import { writable } from 'svelte/store';

const MAX_SELECTIONS = 50;

export const selectedSudokus = writable(new Set());

export function toggleSelection(sudoku) {
    selectedSudokus.update(selected => {
        const newSelected = new Set(selected);
        if (newSelected.has(sudoku.id)) {
            newSelected.delete(sudoku.id);
        } else if (newSelected.size < MAX_SELECTIONS) {
            newSelected.add(sudoku.id);
        } else {
            alert(`Maximale Auswahl von ${MAX_SELECTIONS} Sudokus erreicht!`);
        }
        return newSelected;
    });
}

export function clearSelection() {
    selectedSudokus.set(new Set());
}

export function bulkSelect(sudokus, selected = true) {
    selectedSudokus.update(currentSelected => {
        const newSelected = new Set(currentSelected);
        if (selected) {
            // Only add up to the maximum limit
            const remainingSlots = MAX_SELECTIONS - newSelected.size;
            const selectableSudokus = sudokus.slice(0, remainingSlots);
            selectableSudokus.forEach(sudoku => newSelected.add(sudoku.id));
            
            if (sudokus.length > remainingSlots) {
                alert(`Nur ${remainingSlots} weitere Sudokus konnten ausgewählt werden (Maximum: ${MAX_SELECTIONS})`);
            }
        } else {
            sudokus.forEach(sudoku => newSelected.delete(sudoku.id));
        }
        return newSelected;
    });
}
