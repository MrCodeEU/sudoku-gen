import { writable } from 'svelte/store';

export const selectedSudokus = writable(new Set());

export function toggleSelection(sudoku) {
    selectedSudokus.update(selected => {
        const newSelected = new Set(selected);
        if (newSelected.has(sudoku.id)) {
            newSelected.delete(sudoku.id);
        } else {
            newSelected.add(sudoku.id);
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
        sudokus.forEach(sudoku => {
            if (selected) {
                newSelected.add(sudoku.id);
            } else {
                newSelected.delete(sudoku.id);
            }
        });
        return newSelected;
    });
}
