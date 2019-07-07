import {ModelListener} from 'view';
import {CONF} from 'main';
import { max } from 'd3';


/**
 * Represents a model, which views can use to draw information.
 */
export interface Model {
  addListener(listener: ModelListener): void;
  refresh(): void;
}

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
 * Represents a set of bins containing items.
 */
export interface Bins extends Model {
    addItem(bin: number): void;
    removeItem(bin: number): void;
    addBin(): void;
    removeBin(): void;
    bins(bin: number): Item[];
    numBins(): number;
}


/**
 * Represents items in a binary tree. These can be either nodes or leafs.
 */
export interface TreeItem extends Item, Model {
  /**
   * Return the number of leafs in this tree.
   */
  numLeaves(): number;

  /**
   * Return the depth of this tree. Leafs have depth 0.
   */
  depth(): number;

  /**
   * Return all TreeItems in this tree which are n-th children of this TreeItem.
   * 
   * This method introduces potential mutation bugs, since constants like depth and number of leaves
   * cannot be updated to reflect external children mutation. Instance access to children is necessary
   * for d3 data binding.
   */
  layer(n: number): TreeItem[];

  /**
   * Run a bottom-up map operation against items in the tree, treating separately the leafs and nodes.
   * 
   * @param layerIdx the relative index of this item's layer with respect to root.
   * @param nodeIdx the relative index of this item within its layer.
   * @param nodeFn function to be applied to a node in the tree, given the node's heap index
   * @param leafFn function to be applied to a leaf in the tree, given the leaf's heap index
   */
  treeMap(layerIdx: number, nodeIdx: number, 
    nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
    leafFn: (layerIdx: number, nodeIdx: number, left: TreeLeaf) => any): void;
}

/**
 * Represents an item that can be stored in a tree as a node.
 */
export class TreeNode implements TreeItem {
  /**
   * Generate a full tree of depth d.
   * @param d depth of the full tree.
   */
  public static fullTree(d: number): TreeItem {
    if(d == 1) {
      return new TreeLeaf();
    }
    else {
      return new TreeNode(this.fullTree(d - 1), this.fullTree(d-1));
    } 
  }

  x: number;
  y: number; 
  itemType: string;

  private leftChild: TreeItem;
  private rightChild: TreeItem;
  private leafs: number;
  private d: number;
  private listeners: ModelListener[];

  /**
   * Create a new tree node.
   * @param leftChild the left child of this node.
   * @param rightChild the right child of this node.
   */
  constructor(leftChild: TreeItem, rightChild: TreeItem) {
    this.leftChild = leftChild;
    this.rightChild = rightChild;
    this.leafs = this.leftChild.numLeaves() + this.rightChild.numLeaves();
    this.d = 1 + Math.max(this.leftChild.depth() + this.rightChild.depth());
  }

  addListener(listener: ModelListener) {
    this.listeners.push(listener);
  }

  refresh() {
    this.listeners.forEach((listener) => listener.refresh());
  }
  
  numLeaves() {
    return this.leafs;
  }

  depth() {
    return this.d;
  }
  
  layer(n: number): TreeItem[] {
    if(n == 0) {
      return [this];
    }
    else {
      return this.leftChild.layer(n - 1).concat(this.rightChild.layer(n - 1));
    }
  }

  /**
   * Return the left child of this node.
   * 
   * This method introduces potential mutation bugs, since constants like depth and number of leaves
   * cannot be updated to reflect external children mutation. Instance access to children is necessary
   * for d3 data binding.
   */
  left(): TreeItem {
    return this.leftChild;
  }

  /**
   * Return the right child of this node.
   * 
   * This method introduces potential mutation bugs, since constants like depth and number of leaves
   * cannot be updated to reflect external children mutation. Instance access to children is necessary
   * for d3 data binding.
   */
  right(): TreeItem {
    return this.rightChild;
  }

  treeMap(layerIdx: number, nodeIdx: number, 
   nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
   leafFn: (layerIdx: number, nodeIdx: number, left: TreeLeaf) => any) {
    this.leftChild.treeMap(layerIdx + 1, 2 * nodeIdx, nodeFn, leafFn);
    this.rightChild.treeMap(layerIdx + 1, 2 * nodeIdx + 1, nodeFn, leafFn);
    nodeFn(layerIdx, nodeIdx, this);
  }
  
}

/**
 * Represents an item that can be stored in a tree as a leaf.
 */
export class TreeLeaf implements Item {
  x: number;
  y: number;
  itemType: string;
  private listeners: ModelListener[];

  addListener(listener: ModelListener) {
    this.listeners.push(listener);
  }

  refresh() {
    this.listeners.forEach((listener) => listener.refresh());
  }
  
  numLeaves(): number {
    return 1;
  }

  depth(): number {
    return 1;
  }

  layer(n: number): TreeItem[] {
    if(n == 0) {
      return [this];
    }
    else {
      return [];
    }
  }

  treeMap(layerIdx: number, nodeIdx: number,
    nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
    leafFn: (layerIdx: number, nodeIdx: number, leaf: TreeLeaf) => any) {
    leafFn(layerIdx, nodeIdx, this);
  }
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
 * Represents a histogram.
 */
export class Histogram implements Bins {
    private histBins: BinItem[][];
    private listeners: ModelListener[];
    private itemType: string = "default";

    /**
     * Represents a histogram containing different bins with unique items.
     * @param numBins Create a histogram with the specified number of bins.
     */
    constructor(numBins: number) {
      this.histBins = Array.from({length: numBins}, () => new Array<BinItem>());
      this.listeners = new Array<ModelListener>();
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
      this.refresh();
    }

    /**
     * Return the bin with the given index.
     * @param bin index of a bin.
     */
    bins(bin: number) {
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
      listener.refresh();
    }

    /**
     * Returns the number of bins
     */
    numBins() {
      return this.histBins.length;
    }
}
