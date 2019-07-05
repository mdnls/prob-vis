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
   private selectedBin: number; 

   /**
    * Draw a histogram in the given div representing the given model.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    */
   constructor(svgElement: string, model: Bins, conf: CONF) {
      this.svg = svgElement;
      this.model = model;
      this.conf = conf;
      this.selectedBin = -1;

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

      if(this.selectedBin != -1) {
         let binHeight = this.model.bins(this.selectedBin).length;
         d3.select(this.svg)
         .selectAll(".colHighlight")
         .attr("x", (d) => absX(s * this.selectedBin + 0.85 * s/2))
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
         if(bin < this.model.numBins()) {
         this.selectedBin = bin;
         this.refresh();
      }
   }

   /**
    * Add an item to the selected bin, unless the item would extend past the view box.
    */
   incrSelectedBin() {
      let s = this.conf.gridBoxSize;
      if(this.selectedBin != -1 && this.model.bins(this.selectedBin).length * s < 100) {
         let curItems = this.model.bins(this.selectedBin).length;
         // curItems+2 * s marks the ending y position of the extra block above the column.
         // this leaves a place for the selected column indicator.
         if((curItems+2) * s < 100) {
            this.model.addItem(this.selectedBin);
         }
      }
      this.refresh();
   }

   /**
    * Remove an item from the selected bin, if there is at least one item.
    */
   decrSelectedBin() {
      if(this.selectedBin != -1) {
         this.model.removeItem(this.selectedBin);
      }
      this.refresh();
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
   private conf: CONF;

   /**
    * Draw a binary tree with some number of distinguishable (ie. tied to a leaf) outcomes.
    * @param svgElement the selector for the svg element to draw in.
    * @param tree the tree to draw.
    * @param conf the config for this view.
    */
   constructor(svgElement: string, tree: TreeItem, conf: CONF) {
      this.svg = svgElement;
      this.tree = tree;
      this.conf = conf;
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

      let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
      let xOffset = (svgWidth - viewBoxSideLength)/2;
      let yOffset = (svgHeight - viewBoxSideLength)/2;
      let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);

      function absX(relX: number) {
         return xOffset + pad + scale(relX);
      }
      function absY(relY: number) {
         return yOffset + pad + scale(relY);
      }

      this.tree.treeMap(0,
         (layerIdx, node) => {
            node.x = (node.left().x + node.right().x)/2;
            node.y = node.left().y + 2*itemSize;
            node.itemType = "treeNode";
         },
         (layerIdx, leaf) => {
            leaf.x = 2*layerIdx*itemSize;
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
            .attr("stroke-width", scale(itemSize/10))
            .attr("stroke", "gray");
      }

      this.tree.treeMap(0,
         (layerIdx, node) => {
            addEdge(this.svg, node, node.left());
            addEdge(this.svg, node, node.right());
         },
         (layerIdx, leaf) => {});

      this.tree.treeMap(0,
         (layerIdx, node) => {
            d3.select(this.svg)
               .append("circle")
               .data([node])
               .attr("id", "treeItem")
               .attr("r", scale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2));
         },
         (layerIdx, leaf) => {
            d3.select(this.svg)
               .append("circle")
               .data([leaf])
               .attr("id", "treeItem")
               .attr("r", scale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2));
         });
   }
}