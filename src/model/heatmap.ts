import {Bins, Item} from './bins';
import {ModelListener} from './model';

export interface Matrix {
    colHist(): Bins;
    rowHist(): Bins;
    rowSliceHist(row: number): Bins;
    getCell(r: number, c: number): Cell;
    addListener(listener: ModelListener);
    refresh();
    selectRow(row: number);
    selectedRow(): number;
    getRow(r: number): Cell[];
    rows(): Cell[][];
    getCol(r: number): Cell[];
    cols(): Cell[][];
}

export interface MatCell {
    x: number;
    y: number;
    color: string;
    quantity: number;
}

export class Cell {
    r: number;
    c: number;
    color: string;
    quantity: number;

    constructor(r, c, color, quantity) {
        this.r = r;
        this.c = c;
        this.color = color;
        this.quantity = quantity;
    }
}

export enum Slice {
    ROWS,
    COLS,
    ROW
}

export class MatrixSlice implements Bins {
    constructor(matrix: Matrix, mode: Slice, index?: number) {

    }

    addItem(bin: number): void {
        throw Error("Cannot add an item to a matrix slice.");
    }
    removeItem(bin: number): void {
        throw Error("Cannot remove an item from a matrix slice.");
    }
    addBin(): void {
        throw Error("Cannot add a bin to a matrix slice.");
    }
    removeBin(): void {
        throw Error("Cannot remove a bin from a matrix slice.");
    }

    bins(): Item[][] {
        return new Array<Item[]>();
    }
    getBin(bin: number): Item[] {
        return new Array<Item>();
    }
    numBins(): number {
        return 0;
    }
    selectBin(): void {

    }
    selectedBin(): number {
        return 0;
    }
}

export class HeatMap implements Matrix {
    private mat: Cell[][];
    private listeners: ModelListener[];
    private selection;
    constructor(sideLength: number) {
        this.mat = Array.from({length: sideLength}, (v, r) => (Array.from({length: sideLength}, (v, c) => new Cell(r, c, "#000", 0))));
        this.listeners = new Array<ModelListener>();
        this.selection = -1;
    }

    rowHist(): MatrixSlice {
        return new MatrixSlice(this, Slice.ROWS);
    }

    colHist(): MatrixSlice {
        return new MatrixSlice(this, Slice.COLS);
    }
    
    rowSliceHist(row: number): MatrixSlice {
        return new MatrixSlice(this, Slice.ROW, row);
    }

    /**
     * Update the parameters of all items in all bins, then update all listeners.
     */
    refresh() {
      // Each item needs to know its relative x and y coordinate. But this could be set any time an item is added, so that
      // updating all items is not necessary to refresh. 
      this.listeners.forEach((listener) => listener.refresh());
    }

    /**
     * Add a listener. When the model is refreshed, this listener will be notified.
     * @param listener a listener of this model.
     */
    addListener(listener: ModelListener) {
      this.listeners.push(listener);
      listener.refresh();
    }

    getCell(row: number, col: number): Cell {
        return this.mat[row][col];
    }

    getRow(row: number): Cell[] {
        return new Array<Cell>();
    }

    rows(): Cell[][] {
        return new Array<Array<Cell>>();
    }

    getCol(col: number): Cell[] {
        return new Array<Cell>();
    }

    cols(): Cell[][] {
        return new Array<Array<Cell>>();
    }

    selectRow(row: number) {
        if(row >= 0 && row < this.cols.length) {
            this.selection = row;
            this.refresh();
        }
    }

    selectedRow(): number {
        return this.selection;
    }

}