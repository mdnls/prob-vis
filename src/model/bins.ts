import {Model, ModelListener} from 'model/model';

/**
 * Represents an Item in a Bin. Its position is on the scale [0, 100],
 * size is in px, and colors is a hex string.
 */
export interface Item {
    x: number;
    y: number;
    itemType: string;
}


/**
 * Represents an item that can be stored in a bin.
 */
export class BinItem implements Item {
    x: number;
    y: number;
    itemType: string;

    /**
     * Create a new bin item.
     * 
     * @param x the relative x position of this item. 
     * @param y the relative y position of this item. 
     * @param itemType the string type of this item, used for formatting.
     */
    constructor(x: number, y: number, itemType: string) {
      this.populate(x, y, itemType);
    }
    
    /**
     * Populate the values of this item. In particular, each item corresponds to a box in a grid, identified by its
     * x and y coordinates with respect to the bottom left.
     * 
     * @param x the relative x position of this item. 
     * @param y the relative y position of this item. 
     * @param itemType the color of this item.
     */
    populate(x: number, y: number, itemType: string) {
      this.x = x;
      this.y = y;
      this.itemType = itemType;
    }
}


/**
 * Represents a set of bins containing items.
 */
export abstract class Bins extends Model {
    abstract addItem(bin: number): void;
    abstract removeItem(bin: number): void;
    abstract addBin(): void;
    abstract removeBin(): void;
    abstract getBin(bin: number): Item[];
    abstract bins(): Item[][];
    abstract numBins(): number;
    abstract selectBin(selection: number): void;
    abstract selectedBin(): number;
}

/**
 * Represents a histogram.
 */
export class Histogram extends Bins {
    private histBins: BinItem[][];
    private selection: number;
    private itemType: string = "default";

    /**
     * Return a histogram with one bin for every element in the input integer array. This bin contains as many items as specified
     * by the array at that index.
     * 
     * @param arr an array of integers describing how many items should be in each bin.
     */
    public static fromArray(arr: number[]) {
      let hist = new Histogram(arr.length);
      arr.forEach((numItems, index) => { for(let i = 0; i < numItems; i++) { hist.addItem(index)} });
      return hist;
    }

    public static full(length: number, n: number) {
      let hist = new Histogram(length);
      hist.setAll(n);
      return hist;
    }

    /**
     * Represents a histogram containing different bins with unique items.
     * @param numBins Create a histogram with the specified number of bins.
     */
    constructor(numBins: number) {
      super();
      this.histBins = Array.from({length: numBins}, () => new Array<BinItem>());
      this.listeners = new Array<ModelListener>();
      this.selection = -1;
    }

    setAll(count: number) {
      for(let i = 0; i < this.histBins.length; i++) {
        while(this.histBins[i].length > count) {
          this.removeItem(i);
        }
        while(this.histBins[i].length < count) {
          this.addItem(i);
        }
      }
    }

    /**
     * Adds an item to the given bin.
     * @param bin index of a bin.
     */
    addItem(bin: number) {
      this.histBins[bin].push(new BinItem(bin, this.histBins[bin].length, this.itemType));
      this.refresh();
    }

    /**
     * Remove an item from the given bin.
     * @param bin index of a bin.
     */
    removeItem(bin: number) {
      this.histBins[bin].pop();
      this.refresh();
    }

    /**
     * Add a new bin in the rightmost position.
     */
    addBin() {
      this.histBins.push(new Array<BinItem>());
      this.refresh();
    }

    /**
     * Remove the bin in the rightmost position.
     */
    removeBin() {
      this.histBins.pop();
      if(this.selection == this.histBins.length) {
        this.selection = -1;
      }
      this.refresh();
    }

    /**
     * Return all bins.
     */
    bins() {
      return Array.from({length: this.histBins.length}, (v, k) => this.getBin(k));
    }
    /**
     * Return the bin with the given index.
     * @param bin index of a bin.
     */
    getBin(bin: number) {
      var binArr = this.histBins[bin];
      return Array.from(binArr);
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

    /**
     * Returns the number of bins
     */
    numBins() {
      return this.histBins.length;
    }

    /**
     * Select the bin with the given index. If the index does not match a bin, the selection is discarded.
     */
    selectBin(selection: number) {
      if(selection >= 0 && selection < this.histBins.length) {
        this.selection = selection;
        this.refresh();
      }
    }

    /**
     * If a bin is selected, returns the index of that bin. Otherwise returns -1.
     */
    selectedBin() {
      return this.selection;
    }
}
