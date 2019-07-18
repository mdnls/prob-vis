import {Item, Bins} from 'model/bins';
import {Model, ModelListener} from 'model/model'

/**
 * Represents items in a binary tree. These can be either nodes or leafs.
 */
export interface TreeItem extends Item, Model {

    /**
     * The color of this tree item.
     */
    color: string;
  
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
     * Helper for treeMap.
     * 
     * @param layerIdx the relative index of this item's layer with respect to root.
     * @param nodeIdx the relative index of this item within its layer.
     * @param nodeFn function to be applied to a node in the tree, given the node's heap index
     * @param leafFn function to be applied to a leaf in the tree, given the leaf's heap index
     */
    _treeMap(layerIdx: number, nodeIdx: number, 
      nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
      leafFn: (layerIdx: number, nodeIdx: number, leaf: TreeLeaf) => any): void;
    
  
  
    /**
     * Run a bottom-up map operation against items in the tree, treating separately the leafs and nodes.
     * 
     * @param nodeFn function to be applied to a node in the tree, given the node's heap index
     * @param leafFn function to be applied to a leaf in the tree, given the leaf's heap index
     */
    treeMap(nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
            leafFn: (layerIdx: number, nodeIdx: number, leaf: TreeLeaf) => any): void;
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
      if(d <= 1) {
        return new TreeLeaf();
      }
      else {
        return new TreeNode(this.fullTree(d - 1), this.fullTree(d - 1));
      } 
    }
  
    /**
     * Create a huffman tree which encodes events corresponding to bins, with relative frequencies
     * given by the relative number of items in each bin.
     * @param bins: a set of bins.
     */
    public static huffTree(binModel: Bins, requiredDepth?: number) {
      let bins = binModel.bins();
      let total = bins.reduce((prev, cur) => prev + cur.length, 0);
  
      let binFreqs = bins.map((k) => k.length / total);
      let binNodes: TreeItem[] = Array.from({length: bins.length}, (v, k) => {
        let tl = new TreeLeaf(); // it would be worth introducing stringable setters
        tl.itemType = String(k); // but the need is not critical outside this method
        return tl;
      })
  
  
      let binSortKeys: number[][] = Array.from({length: bins.length}, (v, k) => [0, k]);
  
      let sort = function() {
        let idxs: number[] = Array.from({length: binFreqs.length}, (v, k) => k);
        idxs.sort((a:number, b:number) => {
          return (binFreqs[b] - binFreqs[a] != 0) ? (binFreqs[b] - binFreqs[a]) : (b - a);
        });
        let newBinFreqs = Array.from({length: binFreqs.length}, (v, k) => binFreqs[idxs[k]]);
        let newBinNodes = Array.from({length: binNodes.length}, (v, k) => binNodes[idxs[k]]);
        let newBinSortKeys = Array.from({length: binSortKeys.length}, (v, k) => binSortKeys[idxs[k]]);
        binFreqs = newBinFreqs;
        binNodes = newBinNodes;
        binSortKeys = newBinSortKeys;
      }
  
      // For node combinations,
      // a is greater than b if a's path length to leaf is smaller than b's path length to leaf
      //       in the balanced tree
      // ties are broken by bin index, a comes after b if it has a greater bin index
      // if a tie is broken by a bin index, keep the first value
      while(binFreqs.length > 1) {
        sort();
        binFreqs.push(binFreqs.pop() + binFreqs.pop());
        let a = binNodes.pop();
        let ak = binSortKeys.pop();
        let b = binNodes.pop();
        let bk = binSortKeys.pop();
  
        // ordering should be, 
        // left nodes have a itemType that is closer to root
        // ties are broken by the itemType value
        // my item type is the itemtype which is nearest to my root
        if(ak[0] < bk[0]) {
          // a comes after b
          let lk = [ak[0] + 1, ak[1]];
          binNodes.push(new TreeNode(b, a));
          binSortKeys.push(lk);
        }
        else if(ak[0] > bk[0]) {
          // a comes before b
          let lk = [bk[0] + 1, bk[1]];
          binNodes.push(new TreeNode(a, b));
          binSortKeys.push(lk);
        }
        else {
          if(ak[1] > bk[1]) {
            // a comes after b
            let lk = [ak[0] + 1, ak[1]];
            binNodes.push(new TreeNode(b, a));
            binSortKeys.push(lk);
          }
          else {
            // b comes after a
            let lk = [bk[0] + 1, bk[1]];
            binNodes.push(new TreeNode(a, b));
            binSortKeys.push(lk);
          }
        }
      }
  
      let huffTree = binNodes[0];

      let depth = huffTree.depth();
      if(requiredDepth != undefined) {
        depth = Math.max(depth, requiredDepth);
      }
      let balance = (layerIdx: number, nodeIdx: number, node: TreeNode) => {
        // if I have children, and my depth + 1 = total depth, then no change
        // if my depth + 1 < total depth, I need to extend out my children 
        if(node.left().itemType && depth - (layerIdx + 1) > 1) {
          let target = TreeNode.fullTree(depth - (layerIdx + 1));
          let type = "c" + node.left().itemType; // "c" indicates a child
          target.treeMap(
            (l, k, n) => {n.itemType = type},
            (l, k, n) => {n.itemType = type});
          target.itemType = node.left().itemType;
          node.leftChild = target;
        }
        if(node.right().itemType && depth - (layerIdx + 1) > 1) {
          let target = TreeNode.fullTree(depth - (layerIdx + 1));
          let type = "c" + node.right().itemType; // "c" indicates a child
          target.treeMap(
            (l, k, n) => {n.itemType = type},
            (l, k, n) => {n.itemType = type});
          target.itemType = node.right().itemType;
          node.rightChild = target;
        }
      }
  
      huffTree.treeMap(balance, x => x);
  
      return huffTree;
    }
  
    x: number;
    y: number; 
    color: string;
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
      this.updateState();
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
    
  
    /**
     * Update the state of this tree in case some nodes were mutated.
     */
    private updateState(): void {
      this.leafs = this.leftChild.numLeaves() + this.rightChild.numLeaves();
      this.d = 1 + Math.max(this.leftChild.depth(), this.rightChild.depth());
    }
  
    _treeMap(layerIdx: number, nodeIdx: number, 
     nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
     leafFn: (layerIdx: number, nodeIdx: number, left: TreeLeaf) => any) {
      this.leftChild._treeMap(layerIdx + 1, 2 * nodeIdx, nodeFn, leafFn);
      this.rightChild._treeMap(layerIdx + 1, 2 * nodeIdx + 1, nodeFn, leafFn);
      nodeFn(layerIdx, nodeIdx, this);
      this.updateState(); // update state uses child cached values, which keeps this from blowing up 
    }
  
    treeMap(nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
            leafFn: (layerIdx: number, nodeIdx: number, left: TreeLeaf) => any) {
      this._treeMap(0, 0, nodeFn, leafFn);
    }
    
  }
  
  /**
   * Represents an item that can be stored in a tree as a leaf.
   */
  export class TreeLeaf implements Item {
    x: number;
    y: number;
    itemType: string;
    color: string;
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
  
    _treeMap(layerIdx: number, nodeIdx: number,
      nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
      leafFn: (layerIdx: number, nodeIdx: number, leaf: TreeLeaf) => any) {
      leafFn(layerIdx, nodeIdx, this);
    }
  
    treeMap(nodeFn: (layerIdx: number, nodeIdx: number, node: TreeNode) => any,
            leafFn: (layerIdx: number, nodeIdx: number, left: TreeLeaf) => any) {
      this._treeMap(0, 0, nodeFn, leafFn);
     }
  }
  
