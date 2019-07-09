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

   // public information about this view's visual configuration which can be helpful to have on the fly
   width: number;
   height: number;
   viewBoxSideLength: number;
   xOffset: number;
   yOffset: number;
   pad: number;

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
      let pad: number = this.conf.padding;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
      let xOffset = (svgWidth - viewBoxSideLength)/2;
      let yOffset = (svgHeight - viewBoxSideLength)/2;
      let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);

      let s: number = scale.invert(viewBoxSideLength / this.model.numBins())

      this.pad = pad;
      this.width= svgWidth;
      this.height = svgHeight;
      this.viewBoxSideLength = viewBoxSideLength;
      this.xOffset = xOffset;
      this.yOffset = yOffset;
      
      let colors = this.conf.colors["histogram"]

      function absX(relX: number) {
         return xOffset + scale(relX);
      }
      function invAbsX(absX: number) {
         return scale.invert(absX - xOffset);
      }
      function absY(relY: number) {
         return svgHeight - yOffset - scale(relY);
      }

      d3.select(this.svg)
         .selectAll(".bottomBorder")
         .attr("x", absX(0))
         .attr("y", absY(-1))
         .attr("height", scale(0.5))
         .attr("width", viewBoxSideLength)
         .attr("fill", this.conf.colors["border"][0])
         .attr("rx", 0.2 * s);

      // get the new data for components
      var allItems: Item[] = [].concat(...this.model.bins()); 

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
         .attr("x", (d) => absX(d.x * s + s*0.075))
         .attr("y", (d) => absY((d.y+1) * s + s*0.075))
         .attr("fill", (d) => colors[d.x % colors.length]);
      
      // add click handler
      function handleClick() {
         let absX = d3.event.x;
         let col = Math.floor(invAbsX(absX) / s);
         this.selectCol(col);
      }

      d3.select(this.svg)
        .on("click", () => this.selectCol(Math.floor(invAbsX(d3.event.x) / s)));

      if(this.model.selectedBin() != -1) {
         let binHeight = this.model.getBin(this.model.selectedBin()).length;
         d3.select(this.svg)
         .selectAll(".colHighlight")
         .attr("x", (d) => absX(s * this.model.selectedBin() + 0.5 * s ))
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
      if(this.model.selectedBin() != -1 && this.model.getBin(this.model.selectedBin()).length * s < 100) {
         let curItems = this.model.getBin(this.model.selectedBin()).length;
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
   private nodeColor: (layerIdx: number, nodeIdx: number, node: TreeNode) => void;
   private leafColor: (layerIdx: number, nodeIdx: number, node: TreeLeaf) => void;


   // helpful public information about this view's visual configuration
   numLeafs: number;
   nodeRadius: number;
   width: number;
   height: number;
   viewBoxWidth: number;
   viewBoxHeight: number;

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
      this.nodeColor = () => "#000";
      this.leafColor = () => "#000";
   }


   /**
    * Color nodes by applying a treemap function which sets their color property.
    * 
    * @param lookup function to color a given tree item.
    */
   colorMap(nodeColor: (layerIdx: number, nodeIdx: number, node: TreeNode) => string,
            leafColor: (layerIdx: number, nodeIdx: number, leaf: TreeLeaf) => string) {

      this.nodeColor = (layerIdx: number, nodeIdx: number, node: TreeNode) => {
         node.color = nodeColor(layerIdx, nodeIdx, node);
      };
      this.leafColor = (layerIdx: number, nodeIdx: number, leaf: TreeLeaf) => {
         leaf.color = leafColor(layerIdx, nodeIdx, leaf);
      };

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

      let pad = this.conf.padding;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxWidth = svgWidth - 2 * pad;
      let viewBoxHeight = svgHeight - 2 * pad;
      
      let wScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxWidth])
      let hScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxHeight]);

      this.numLeafs = numLeafs;
      this.nodeRadius = hScale(itemSize/2);
      this.width = svgWidth;
      this.height = svgHeight;
      this.viewBoxWidth = viewBoxWidth;
      this.viewBoxHeight = viewBoxHeight;

      function absX(relX: number) {
         return pad + wScale(relX);
      }
      function absY(relY: number) {
         return pad + hScale(relY);
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

      this.tree.treeMap(0, 0, this.nodeColor, this.leafColor);

      this.tree.treeMap(0, 0,
         (layerIdx, nodeIdx, node) => {
            addEdge(this.svg, node, node.left());
            addEdge(this.svg, node, node.right());
         },
         (layerIdx, leaf) => {});

      this.tree.treeMap(1, 0,
         (layerIdx, nodeIdx, node) => {
            d3.select(this.svg)
               .append("circle")
               .data([node])
               .attr("id", "treeItem")
               .attr("r", hScale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2))
               .attr("fill", (d) => d.color );
         },
         (layerIdx, nodeIdx, leaf) => {
            d3.select(this.svg)
               .append("circle")
               .data([leaf])
               .attr("id", "treeItem")
               .attr("r", hScale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2))
               .attr("fill", (d) => d.color);
         });
   }
}

export class SVGSoloEntropy implements ModelListener {
   private model: Bins;
   private tree: SVGBinaryTree;
   private hist: SVGHistogram;
   private svgTree: string;
   private svgBar: string;
   private svgHist: string;
   private div: string;
   private conf: CONF;

   constructor(divElement: string, model: Bins, conf: CONF) {
      this.conf = conf;

      let defaultIDs = ["svgHist", "svgBar", "svgTree"]; // single point of change for default ids. 
      this.div = divElement;
      this.svgHist = divElement + " > #" + defaultIDs[0];
      this.svgBar = divElement + " > #" + defaultIDs[1];
      this.svgTree = divElement + " > #" + defaultIDs[2];

      let d = d3.select(divElement);
      d.append("svg").attr("id", defaultIDs[0]);
      d.append("br")
      d.append("svg").attr("id", defaultIDs[1]);
      d.append("br")
      d.append("svg").attr("id", defaultIDs[2]);

      this.model = model;
      this.tree = new SVGBinaryTree(this.svgTree, 0, conf);
      this.hist = new SVGHistogram(this.svgHist, this.model, conf);

      this.model.addListener(this);
   }

   refresh() {
      let svgHeight = $(this.div).height();
      let svgWidth = $(this.div).width();

      // again, single point of control for the magic numbers that determine sub-element sizing
      // 0 -> histogram, 1 -> bar, 2 -> tree
      let sideLens = [svgHeight * (7/16), svgHeight * (1/8), svgHeight * (7/16)];
      
      d3.select(this.svgHist).attr("height", sideLens[0]).attr("width", sideLens[0]);
      d3.select(this.svgBar).attr("height", sideLens[1]).attr("width", sideLens[0]); // use same width as other elements
      d3.select(this.svgTree).attr("height", sideLens[2]).attr("width", sideLens[2]);

      let selectedBin = this.model.selectedBin();

      if(selectedBin != -1 && this.model.getBin(selectedBin).length > 0) {
         d3.select(this.svgTree).attr("style", "display: initial");
         d3.select(this.svgBar).attr("style", "display: initial");

         // configure the tree for this selected item
         let items = this.model.getBin(selectedBin).length;
         let total = this.model.bins()
                          .reduce((running, cur) => (running + cur.length), 0);
         let distinct = total / items;
         let depth = Math.ceil(Math.log2(distinct)) + 1;
         this.tree.setDepth(depth);
         this.tree.refresh();

         let unit = 100 / (2**(depth-1));
         let markerLocs = Array.from({length: (2**(depth-1)) }, (value, key) => key * unit);

         // set the colors for the tree
         let colors = this.conf.colors["histogram"];
         function isChildFn(targetLayer: number, targetNode: number) {
            return (layerIdx: number, nodeIdx: number) => {
               let diff = targetLayer - layerIdx;
               // the nodeIdx of the parent of node k is Math.floor(k/2), similar to child equations for heap structures.
               // it is a nontrivial proof that repeatedly taking the floor of k/2 is the same as taking the floor after
               //    dividing all the 2s.
               return diff >= 0 && Math.floor(targetNode / (2**diff)) == nodeIdx;
            }
         }
         let childFn = isChildFn(depth, 0);
         let color = (layerIdx: number, nodeIdx: number, node: TreeItem) => {
            return childFn(layerIdx, nodeIdx) ? colors[selectedBin % colors.length] : "#000";
         }
         this.tree.colorMap(color, color);

         // determine bar display information
         let pad = this.conf.padding;
         let viewBoxHeight = sideLens[1] - 2 * pad;
         let viewBoxWidth = sideLens[0] - 2 * pad;
         let hScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxHeight]);
         let wScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxWidth]);

         function absX(relX: number) {
            return pad + wScale(relX);
         }
         function absY(relY: number) {
            return pad + hScale(relY);
         }

         d3.select(this.svgBar)
           .selectAll("rect, line")
           .remove();
         
         d3.select(this.svgBar)
           .selectAll("rect")
           .data(markerLocs)
           .enter()
           .append("rect")
           .attr("x",  (d) => absX(d))
           .attr("y", absY(0))
           .attr("width", wScale(unit))
           .attr("height", hScale(100))
           .attr("fill", (d) => (d == 0 ? colors[selectedBin % colors.length] : "#FFF"))
           .attr("stroke", "#000")
           .attr("stroke-width", sideLens[1]/40);
      }
      else { 
         d3.select(this.svgTree).attr("style", "display: none;");
         d3.select(this.svgBar).attr("style", "display: none;");
      }

      this.hist.refresh();
   }
}

export class SVGEntropy implements ModelListener {
   private model: Bins;
   private tree: SVGBinaryTree;
   private hist: SVGHistogram;
   private svgTree: string;
   private svgBar: string;
   private svgHist: string;
   private div: string;
   private conf: CONF;

   constructor(divElement: string, model: Bins, conf: CONF) {
      this.conf = conf;

      let defaultIDs = ["svgHist", "svgBar", "svgTree"]; // single point of change for default ids. 
      this.div = divElement;
      this.svgHist = divElement + " > #" + defaultIDs[0];
      this.svgBar = divElement + " > #" + defaultIDs[1];
      this.svgTree = divElement + " > #" + defaultIDs[2];

      let d = d3.select(divElement);
      d.append("svg").attr("id", defaultIDs[0]);
      d.append("br")
      d.append("svg").attr("id", defaultIDs[1]);
      d.append("br")
      d.append("svg").attr("id", defaultIDs[2]);

      this.model = model;
      this.tree = new SVGBinaryTree(this.svgTree, 0, conf);
      this.hist = new SVGHistogram(this.svgHist, this.model, conf);

      this.model.addListener(this);
   }

   refresh() {
      let svgHeight = $(this.div).height();
      let svgWidth = $(this.div).width();

      // again, single point of control for the magic numbers that determine sub-element sizing
      // 0 -> histogram, 1 -> bar, 2 -> tree
      let sideLens = [svgHeight * (7/16), svgHeight * (1/8), svgHeight * (7/16)];
      
      d3.select(this.svgHist).attr("height", sideLens[0]).attr("width", sideLens[0]);
      d3.select(this.svgBar).attr("height", sideLens[1]).attr("width", sideLens[0]); // use same width as other elements
      d3.select(this.svgTree).attr("height", sideLens[2]).attr("width", sideLens[2]);

      let selectedBin = this.model.selectedBin();

      if(selectedBin != -1 && this.model.getBin(selectedBin).length > 0) {
         d3.select(this.svgTree).attr("style", "display: initial");
         d3.select(this.svgBar).attr("style", "display: initial");

         // configure the tree for this selected item
         let allBins = this.model.bins();
         let total = allBins.reduce((running, cur) => (running + cur.length), 0);
         let items = allBins.reduce((running, cur) => cur.length > 0 ? Math.min(running, cur.length) : running, Infinity);

         let distinct = total / items;
         let depth = Math.ceil(Math.log2(distinct)) + 1;
         this.tree.setDepth(depth);
         this.tree.refresh();

         let unit = 100 / (2**(depth-1));
         let markerLocs = Array.from({length: (2**(depth-1)) }, (value, key) => key * unit);

         // set the colors for the tree
         let colors = this.conf.colors["histogram"];

         let colorsPerBin = [].concat(
            ...Array.from({length: this.model.numBins()}, (value, key) => key) // get an array of indices
            .map((idx) => this.model.getBin(idx).map(() => colors[idx % colors.length]))); // map every item in every bin to the color of that bin
      
         let leafColor = (layerIdx: number, nodeIdx: number) => nodeIdx < colorsPerBin.length ? colorsPerBin[nodeIdx] : "#000";
         let nodeColor = (layerIdx: number, nodeIdx: number, node: TreeNode) => {
            if(node.left().color == node.right().color) {
               return node.left().color;
            }
            else {
               return "#000";
            }
         }
         this.tree.colorMap(nodeColor, leafColor);

         // determine bar display information
         let pad = this.conf.padding;
         let viewBoxHeight = sideLens[1] - 2 * pad;
         let viewBoxWidth = sideLens[0] - 2 * pad;
         let hScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxHeight]);
         let wScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxWidth]);

         function absX(relX: number) {
            return pad + wScale(relX);
         }
         function absY(relY: number) {
            return pad + hScale(relY);
         }

         d3.select(this.svgBar)
           .selectAll("rect, line")
           .remove();
         
         d3.select(this.svgBar)
           .selectAll("rect")
           .data(markerLocs)
           .enter()
           .append("rect")
           .attr("x",  (d) => absX(d))
           .attr("y", absY(0))
           .attr("width", wScale(unit))
           .attr("height", hScale(100))
           .attr("fill", (d) => (d == 0 ? colors[selectedBin % colors.length] : "#FFF"))
           .attr("stroke", "#000")
           .attr("stroke-width", sideLens[1]/40);
      }
      else { 
         d3.select(this.svgTree).attr("style", "display: none;");
         d3.select(this.svgBar).attr("style", "display: none;");
      }

      this.hist.refresh();
   }
}