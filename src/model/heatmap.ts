import {Bins, Item, Histogram} from './bins';
import {ModelListener} from './model';
import {parse} from 'papaparse';

export interface Matrix {
    colHist(): Bins;
    rowHist(): Bins;
    rowSliceHist(row: number): Bins;
    setCell(r: number, c: number, quantity: number): void;
    getCell(r: number, c: number): Cell;
    addListener(listener: ModelListener): void;
    refresh(): void;
    selectCol(col: number): void;
    selectedCol(): number;
    getRow(r: number): Cell[];
    rows(): Cell[][];
    getCol(r: number): Cell[];
    cols(): Cell[][];
    sideLength(): number;
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
    ROW,
    COL
}

/**
 * Immutable bins which implements a histogram representing the rows or columns of a matrix.
 */
export class MatrixSlice extends Bins {
    protected matrix: Matrix;
    protected histogram: Histogram;
    protected mode: Slice;
    protected index: number;
    constructor(matrix: Matrix, mode: Slice, index?: number) {
        super();
        this.matrix = matrix;
        this.mode = mode;
        if(mode == Slice.ROW || mode == Slice.COL) {
            if(index == undefined) {
                throw Error("Must provide an index to do a row slice.");
            }
            this.index = index;
        }
        else {
            this.index = -1;
        }

        let toDraw: number[] = [];
        let numItems: number = 25; // this is approximate, due to floor operation

        let rows = this.matrix.rows();
        let quantityPerRow = rows.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
        let rowsTotal = quantityPerRow.reduce((prev, cur) => cur + prev, 0);

        let cols = this.matrix.cols();
        let quantityPerCol = cols.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
        let colsTotal = quantityPerCol.reduce((prev, cur) => cur + prev, 0);
    
        switch(this.mode) {
            case Slice.ROW:
                let row = this.matrix.getRow(this.index);
                // every bin gets an item representing a fraction of the total quantity of the row allocated to that cell
                // int(cell quantity / total quantity * 100)

                if(rowsTotal == 0) {
                    toDraw = row.map((c) => 0);
                }
                else {
                    toDraw = row.map((c) => Math.floor(numItems * c.quantity / rowsTotal));
                }
                break;
            case Slice.COL:
                let col = this.matrix.getCol(this.index);
                
                if(colsTotal == 0) {
                    toDraw = col.map((c) => 0);
                }
                else {
                    toDraw = col.map((c) => Math.floor(numItems * c.quantity / colsTotal));
                }
                break;
            case Slice.COLS:
                // this is not reversed - or rather, the swap here is intentional
                // this is supposed to show cols by averageing across all columns, ie. averaging across the vals of every row
                if(rowsTotal == 0) {
                    toDraw = rows.map((c) => 0);
                }
                else {
                    toDraw = quantityPerRow.map((c) => Math.floor(numItems * c / rowsTotal));
                }
                break;
            case Slice.ROWS:
                if(colsTotal == 0) {
                    toDraw = cols.map((c) => 0);
                }
                else {
                    toDraw = quantityPerCol.map((c) => Math.floor(numItems * c / colsTotal));
                }
                break;
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
        this.matrix.selectCol(selection);
        this.histogram.refresh();
        this.matrix.refresh();
    }
    selectedBin(): number {
        return this.matrix.selectedCol();
    }
}

export class HeatMap implements Matrix {
    private mat: Cell[][];
    private listeners: ModelListener[];
    private selection: number;

    constructor(sideLength: number) {
        this.mat = Array.from({length: sideLength}, (v, r) => (Array.from({length: sideLength}, (v, c) => new Cell(r, c, "#000", 1))));
        this.listeners = new Array<ModelListener>();
        this.selection = -1;
    }

    static fromCSVStr(csv: string) {
        let dataStr = parse(csv).data;
        let data: number[][] = dataStr.map((r) => r.map((val: string) => Number.parseFloat(val)));

        data.forEach((row) => { if(row.length != data.length) { throw Error("The input data must be a square matrix") }});
        let hm = new HeatMap(data.length);
        data.forEach((row, rIdx) => {
            row.forEach((quantity, cIdx) => hm.setCell(rIdx, cIdx, quantity));
        });
        return hm;
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
    }

    setCell(row: number, col: number, quantity: number) {
        if(row >= 0 && row < this.mat.length && col >= 0 && col < this.mat.length) {
            this.mat[row][col].quantity = quantity;
        }
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

    selectCol(col: number) {
        if(col >= 0 && col < this.mat.length) {
            this.selection = col;
            this.refresh();
        }
    }

    selectedCol(): number {
        return this.selection;
    }

    sideLength(): number {
        return this.mat.length;
    }
}

export class UnnormalizedMatrixSlice extends MatrixSlice {
    constructor(matrix: Matrix, mode: Slice, index?: number) {
        super(matrix, mode, index);


        let toDraw: number[] = [];

        let rows = this.matrix.rows();
        let quantityPerRow = rows.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));

        let cols = this.matrix.cols();
        let quantityPerCol = cols.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
    
        switch(this.mode) {
            case Slice.ROW:
                toDraw = this.matrix.getRow(this.index).map(c => c.quantity);
                break;
            case Slice.COL:
                toDraw = this.matrix.getCol(this.index).map(c => c.quantity);
                break;
            case Slice.COLS:
                toDraw = quantityPerRow;
                break;
            case Slice.ROWS:
                toDraw = quantityPerCol;
                break;
        }
        this.histogram = Histogram.fromArray(toDraw);
    }

}