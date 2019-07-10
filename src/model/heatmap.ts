import {Bins, Item, Histogram} from './bins';
import {ModelListener} from './model';

export interface Matrix {
    colHist(): Bins;
    rowHist(): Bins;
    rowSliceHist(row: number): Bins;
    getCell(r: number, c: number): Cell;
    addListener(listener: ModelListener): void;
    refresh(): void;
    selectRow(row: number): void;
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

    constructor(r: number, c: number, color: string, quantity: number) {
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

/**
 * Immutable bins which implements a histogram representing the rows or columns of a matrix.
 */
export class MatrixSlice implements Bins {
    private matrix: Matrix;
    private histogram: Histogram;
    private mode: Slice;
    private index: number;
    constructor(matrix: Matrix, mode: Slice, index?: number) {
        this.matrix = matrix;
        this.mode = mode;
        if(mode == Slice.ROW) {
            if(index == undefined) {
                throw Error("Must provide an index to do a row slice.");
            }
            this.index = index;
        }
        else {
            this.index = -1;
        }

        let toDraw: number[] = [];
        if(this.mode == Slice.ROW) {
            let row = this.matrix.getRow(this.index);
            // every bin gets an item representing a fraction of the total quantity of the row allocated to that cell
            // int(cell quantity / total quantity * 100)
            let total = row.map((c) => c.quantity).reduce((prev, cur) => prev + cur, 0);
            toDraw = row.map((c) => Math.floor(100 * c.quantity / total));
        }
        else if(this.mode == Slice.COLS) {
            let cols = this.matrix.cols();
            let quantityPerCol = cols.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
            
            let total = quantityPerCol.reduce((prev, cur) => cur + prev, 0);
            toDraw = quantityPerCol.map((c) => Math.floor(100 * c / total));
        }
        else if(this.mode == Slice.ROWS) {
            let rows = this.matrix.rows();
            let quantityPerRow = rows.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
            
            let total = quantityPerRow.reduce((prev, cur) => cur + prev, 0);
            toDraw = quantityPerRow.map((c) => Math.floor(100 * c / total));
        }
        this.histogram = Histogram.fromArray(toDraw);
    }

    addListener(listener: ModelListener) {
       this.matrix.addListener(listener); 
    }

    refresh() {
        this.matrix.refresh();
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
        return this.histogram.bins();
    }
    getBin(bin: number): Item[] {
        return this.histogram.getBin(bin);
    }
    numBins(): number {
        return this.histogram.numBins();
    }
    selectBin(selection: number): void {
        return this.histogram.selectBin(selection);
    }
    selectedBin(): number {
        return this.histogram.selectedBin();
    }
}

export class HeatMap implements Matrix {
    private mat: Cell[][];
    private listeners: ModelListener[];
    private selection: number;

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
        return this.mat[row].map((cell) => new Cell(0, cell.c, cell.color, cell.quantity));
    }

    rows(): Cell[][] {
        return Array.from(this.mat);
    }

    getCol(col: number): Cell[] {
        return this.mat.map((row) => new Cell(row[col].r, 0, row[col].color, row[col].quantity));
    }

    cols(): Cell[][] {
        return Array.from({length: this.mat.length}, (v, k) => this.getCol(k));
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