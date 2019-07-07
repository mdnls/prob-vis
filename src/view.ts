import {Bins, Item, TreeNode, TreeLeaf, TreeItem} from "model";
import * as d3 from "d3";
import * as $ from "jquery";
import {CONF} from "main";

/**
 * Interface for view elements that can pull from a model.
 */
export interface ModelListener {
   /**
    * Redraw any svg component this view is responsible for.
    */
   refresh(): void; 
}

/**
 * Draw a histogram.
 */
export class SVGHistogram implements ModelListener {
   private svg: string;
   private model: Bins;
   private conf: CONF;

   /**
    * Draw a histogram in the given div representing the given model.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    */
   constructor(svgElement: string, model: Bins, conf: CONF) {
      this.svg = svgElement;
      this.model = model;
      this.conf = conf;

      this.model.addListener(this);

      d3.select(this.svg)
        .append("rect")
        .attr("class", "bottomBorder");
      d3.select(this.svg)
        .append("text")
        .text("*")
        .attr("class", "colHighlight")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle");
      this.refresh();
   }

   /**
    * Redraw the histogram.
    */
   refresh(): void {
      let s: number = this.conf.gridBoxSize;
      let pad: number = 0.2 * s;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
      let xOffset = (svgWidth - viewBoxSideLength)/2;
      let yOffset = (svgHeight - viewBoxSideLength)/2;
      let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);

      function absX(relX: number) {
         return xOffset + pad + scale(relX);
      }
      function invAbsX(absX: number) {
         return scale.invert(absX - xOffset - pad);
      }
      function absY(relY: number) {
         return svgHeight - yOffset - pad - scale(relY);
      }

      d3.select(this.svg)
         .selectAll(".bottomBorder")
         .attr("x", absX(0) - pad)
         .attr("y", absY(0) + pad)
         .attr("height", pad)
         .attr("width", viewBoxSideLength + 2 * pad)
         .attr("fill", this.conf.colors["border"][0])
         .attr("rx", 0.2 * s);

      // get the new data for components
      var allItems: Item[] = [].concat(...Array.from({length: this.model.numBins()}, (value, key) => this.model.bins(key))); 

      // get rid of old data rectangles before redraw
      d3.select(this.svg)
         .selectAll("#histItem")
         .remove();

      // redraw
      d3.select(this.svg)
         .selectAll("rect #histItem")
         .data(allItems)
         .enter()
         .append("rect")
         .attr("id", "histItem")
         .attr("width", scale(s * 0.85))
         .attr("height", scale(s * 0.85))
         .attr("x", (d) => absX(d.x * s))
         .attr("y", (d) => absY((d.y+1) * s))
         .attr("fill", (d) => d3.schemePaired[2 * (d.x % 6)])
         .attr("stroke", (d) => d3.schemePaired[2 * (d.x % 6) + 1]);
      
      // add click handler
      function handleClick() {
         let absX = d3.event.x;
         let relX = scale.invert(absX - xOffset - pad);
         let col = Math.floor(relX / s);
         this.selectCol(col);
      }

      d3.select(this.svg)
        .on("click", () => this.selectCol(Math.floor(invAbsX(d3.event.x) / s)));;

      if(this.model.selectedBin() != -1) {
         let binHeight = this.model.bins(this.model.selectedBin()).length;
         d3.select(this.svg)
         .selectAll(".colHighlight")
         .attr("x", (d) => absX(s * this.model.selectedBin() + 0.85 * s/2))
         .attr("y", (d) => absY(s * binHeight))
         .attr("style", "font-size: " + scale(s) + "px;");
      }
   }

   /**
    * Select one of the histogram bins. Other interactions can use the selected bin as an action target.
    * ie. add one item to the selected bin.
    * @param bin bin to select.
    */
   selectCol(bin: number) {
      this.model.selectBin(bin);
   }

   /**
    * Add an item to the selected bin, unless the item would extend past the view box.
    */
   incrSelectedBin() {
      let s = this.conf.gridBoxSize;
      if(this.model.selectedBin() != -1 && this.model.bins(this.model.selectedBin()).length * s < 100) {
         let curItems = this.model.bins(this.model.selectedBin()).length;
         // curItems+2 * s marks the ending y position of the extra block above the column.
         // this leaves a place for the selected column indicator.
         if((curItems+2) * s < 100) {
            this.model.addItem(this.model.selectedBin());
         }
      }
   }

   /**
    * Remove an item from the selected bin, if there is at least one item.
    */
   decrSelectedBin() {
      if(this.model.selectedBin() != -1) {
         this.model.removeItem(this.model.selectedBin());
      }
   }
}

/**
 * Draw binary trees.
 */
export class SVGBinaryTree implements ModelListener {
   // given an integer N, draw the smallest binary tree with at least N leaves
   // highlight one such leaf and the path from the root to that leaf

   private tree: TreeItem;
   private svg: string;
   private attnNode: number[];
   private conf: CONF;

   /**
    * Draw a binary tree with some number of distinguishable (ie. tied to a leaf) outcomes.
    * @param svgElement the selector for the svg element to draw in.
    * @param initialDepth the depth of the tree to draw initially.
    * @param conf the config for this view.
    */
   constructor(svgElement: string, initialDepth: number, conf: CONF) {
      this.svg = svgElement;
      this.tree = TreeNode.fullTree(initialDepth);
      this.conf = conf;
   }

   /**
    * Call attention to a node by highlighting the path to that node from the root node.
    * 
    * @param layerIdx layer index of node with attention, relative to the root node.
    * @param nodeIdx left-to-right index of node with attention in its layer.
    */
   attention(layerIdx: number, nodeIdx: number) {
      this.attnNode = [layerIdx, nodeIdx];
      this.refresh();
   }

   /**
    * Remove attention from all nodes.
    */
   noAttention() {
      delete this.attnNode;
      this.refresh();
   }

   /**
    * Discard the current model, replace it with one of a given depth, and refresh the tree.
    * 
    * @param n the depth of the new tree model.
    */
   setDepth(n: number) {
      this.tree = TreeNode.fullTree(n);
      this.refresh();
   }

   /**
    * Redraw the binary tree.
    */
   refresh() {
      let numLeafs: number = this.tree.numLeaves();
      let itemSize: number = 100 / (2 * numLeafs - 1);

      let pad: number = 0.2 * itemSize;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxWidth = svgWidth - 2 * pad;
      let viewBoxHeight = svgHeight - 2 * pad;
      let xOffset = pad; // maintain var names for consistency
      let yOffset = pad;
      
      let wScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxWidth])
      let hScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxHeight]);

      function absX(relX: number) {
         return xOffset + pad + wScale(relX);
      }
      function absY(relY: number) {
         return yOffset + pad + hScale(relY);
      }

      this.tree.treeMap(0, 0,
         (layerIdx, nodeIdx, node) => {
            node.x = (node.left().x + node.right().x)/2;
            node.y = node.left().y + 2*itemSize;
            node.itemType = "treeNode";
         },
         (layerIdx, nodeIdx, leaf) => {
            leaf.x = 2*nodeIdx*itemSize;
            leaf.y = 0;
            leaf.itemType = "treeLeaf";
         }
      );

      

      d3.select(this.svg)
         .selectAll("#treeItem")
         .remove();
      d3.select(this.svg)
         .selectAll("#treeEdge")
         .remove();
      
      function addEdge(svg: string, parent: TreeItem, child: TreeItem) {
         d3.select(svg)
            .append("line")
            .attr("id", "treeEdge")
            .attr("x1", (d) => absX(parent.x + itemSize/2))
            .attr("x2", (d) => absX(child.x + itemSize/2))
            .attr("y1", (d) => absY(parent.y + itemSize/2))
            .attr("y2", (d) => absY(child.y + itemSize/2))
            .attr("stroke-width", hScale(itemSize/10))
            .attr("stroke", "gray");
      }

      this.tree.treeMap(0, 0,
         (layerIdx, nodeIdx, node) => {
            addEdge(this.svg, node, node.left());
            addEdge(this.svg, node, node.right());
         },
         (layerIdx, leaf) => {});

      // jank currying
      function attnChecker(targetLayer: number, targetNode: number) {
         return (layerIdx: number, nodeIdx: number) => {
            let diff = targetLayer - layerIdx;
            // the nodeIdx of the parent of node k is Math.floor(k/2), similar to child equations for heap structures.
            // it is a nontrivial proof that repeatedly taking the floor of k/2 is the same as taking the floor after
            //    dividing all the 2s.
            return diff >= 0 && Math.floor(targetNode / (2**diff)) == nodeIdx;
         }
      }

      let hasAttn = Boolean(this.attnNode) ? attnChecker(this.attnNode[0], this.attnNode[1]) : () => false;

      this.tree.treeMap(1, 0,
         (layerIdx, nodeIdx, node) => {
            d3.select(this.svg)
               .append("circle")
               .data([node])
               .attr("id", "treeItem")
               .attr("r", hScale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2))
               .attr("fill", (d) => { return hasAttn(layerIdx, nodeIdx) ? "red" : "black" });
         },
         (layerIdx, nodeIdx, leaf) => {
            d3.select(this.svg)
               .append("circle")
               .data([leaf])
               .attr("id", "treeItem")
               .attr("r", hScale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2))
               .attr("fill", (d) => { return hasAttn(layerIdx, nodeIdx) ? "red" : "black" });
         });
   }
}

export class SVGEntropy implements ModelListener {
   private bins: Bins;
   private tree: SVGBinaryTree;
   private hist: SVGHistogram;
   private svgTree: string;
   private svgBar: string;
   private svgHist: string;

   constructor(divElement: string, model: Bins, conf: CONF) {
      let defaultIDs = ["svgTree", "svgBar", "svgHist"]; // single point of change for default ids. 
      this.svgTree = divElement + " > #" + defaultIDs[0];
      this.svgBar = divElement + " > #" + defaultIDs[1];
      this.svgHist = divElement + " > #" + defaultIDs[2];

      let d = d3.select(divElement);
      d.append("svg").attr("id", defaultIDs[0]);
      d.append("svg").attr("id", defaultIDs[1]);
      d.append("svg").attr("id", defaultIDs[2]);

      this.bins = model;
      this.tree = new SVGBinaryTree(this.svgTree, 0, conf);
      this.hist = new SVGHistogram(this.svgHist, this.bins, conf);

      model.addListener(this);
   }

   refresh() {
      /*
      1. get width of div
      2. calculate width and heights of each sub element
      3. set width and heights of each sub element
      4. refresh histogram
      5. get the selected column
      6. calculate target depth of tree
      7. set the depth of tree
      8. refresh the tree
      */

   }
}