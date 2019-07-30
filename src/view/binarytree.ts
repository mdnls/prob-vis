import {ModelListener} from 'model/model';
import {CONF} from '../model/model';
import {TreeItem, TreeNode, TreeLeaf} from 'model/trees'
import * as d3 from "d3";
import * as $ from "jquery";

/**
 * Draw binary trees.
 */
export class SVGBinaryTree implements ModelListener {
    // given an integer N, draw the smallest binary tree with at least N leaves
    // highlight one such leaf and the path from the root to that leaf
 
    tree: TreeItem;
    svg: string;
    attnNode: number[];
    conf: CONF;
    nodeColor: (layerIdx: number, nodeIdx: number, node: TreeNode) => void;
    leafColor: (layerIdx: number, nodeIdx: number, node: TreeLeaf) => void;
 
 
    // helpful public information about this view's visual configuration
    numLeafs: number;
    nodeRadius: number;
    width: number;
    height: number;
    viewBoxWidth: number;
    viewBoxHeight: number;
    itemSize: number;
    pad: number;

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
     * Update the tree that is on display. 
     * 
     * @param tree a tree model to display.
     */
    setTree(tree: TreeItem) {
       this.tree = tree;
       this.refresh();
    }

    /**
     * Call attention to a node and its children.
     * @param layerIdx layer index of node
     * @param nodeIdx index in layer of node
     */
    highlightNode(layerIdx: number, nodeIdx: number) {
       this.attnNode = [layerIdx, nodeIdx];
       this.refresh();
    }
 
    /**
     * Redraw the binary tree.
     */
    refresh() {
       let numLeafs: number = this.tree.numLeaves();
       let itemSize: number = 100 / (2 * numLeafs - 1);
 
       let svgWidth = $(this.svg).width();
       let svgHeight = $(this.svg).height();
 
       let pad = this.conf.padding + (svgWidth / (2*numLeafs - 1))/2;

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
       this.itemSize = itemSize;
       this.pad = pad;
 
       function absX(relX: number) {
          return pad + wScale(relX);
       }
       function absY(relY: number) {
          return pad + hScale(relY);
       }
 
       let d = this.tree.depth();
 
       this.tree.treeMap(
          (layerIdx, nodeIdx, node) => {
             node.x = (node.left().x + node.right().x)/2;
             node.y = 100 * (d - (layerIdx+ 1)) / d;
          },
          (layerIdx, nodeIdx, leaf) => {
             leaf.x = 2*nodeIdx*itemSize;
             leaf.y = 0;
          }
       );
          
       d3.select(this.svg)
          .selectAll("#treeItem")
          .remove();
       d3.select(this.svg)
          .selectAll("#treeEdge")
          .remove();
       
      function isChildFn(targetLayer: number, targetNode: number) {
         return (layerIdx: number, nodeIdx: number) => {
            let diff = targetLayer - layerIdx;
            // the nodeIdx of the parent of node k is Math.floor(k/2), similar to child equations for heap structures.
            // it is a nontrivial proof that repeatedly taking the floor of k/2 is the same as taking the floor after
            //    dividing all the 2s.
            return diff >= 0 && Math.floor(targetNode / (2**diff)) == nodeIdx;
         }
      }

      let childCheck = (this.attnNode != undefined) ? isChildFn(this.attnNode[0], this.attnNode[1]) : () => false;

       function addEdge(svg: string, parent: TreeItem, child: TreeItem, cLayer: number, cIndex: number) {
         let pLayer = cLayer - 1;
         let pIndex = Math.floor(cIndex/2);
         let highlight = (childCheck(pLayer, pIndex) && childCheck(cLayer, cIndex))
         let color = highlight ? "#0074D9" : "gray";
         let width = highlight ? hScale(itemSize/3) : hScale(itemSize/5);
         d3.select(svg)
             .append("line")
             .attr("id", "treeEdge")
             .attr("x1", (d) => absX(parent.x + itemSize/2))
             .attr("x2", (d) => absX(child.x + itemSize/2))
             .attr("y1", (d) => absY(parent.y + itemSize/2))
             .attr("y2", (d) => absY(child.y + itemSize/2))
             .attr("stroke-width", width)
             .attr("stroke", color);
       }

      this.tree.treeMap(this.nodeColor, this.leafColor);
 
      this.tree.treeMap(
          (layerIdx, nodeIdx, node) => {
             addEdge(this.svg, node, node.left(), layerIdx + 1, 2 * nodeIdx);
             addEdge(this.svg, node, node.right(), layerIdx + 1, 2 * nodeIdx + 1);
          },
          (layerIdx, leaf) => {});
 
      this.tree._treeMap(0, 0,
         (layerIdx, nodeIdx, node) => {
            d3.select(this.svg)
               .append("circle")
               .data([node])
               .attr("id", "treeItem")
               .attr("r", wScale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2))
               .attr("fill", (d) => d.color )
               .attr("stroke", (d) => childCheck(layerIdx, nodeIdx) ? "#0074D9" : "#000")
               .attr("stroke-width", (d) => childCheck(layerIdx, nodeIdx) ? 3 : 1);
         },
         (layerIdx, nodeIdx, leaf) => {
            d3.select(this.svg)
               .append("circle")
               .data([leaf])
               .attr("id", "treeItem")
               .attr("r", wScale(itemSize/2))
               .attr("cx", (d) => absX(d.x + itemSize/2))
               .attr("cy", (d) => absY(d.y + itemSize/2))
               .attr("fill", (d) => d.color)
               .attr("stroke", (d) => childCheck(layerIdx, nodeIdx) ? "#0074D9" : "#000")
               .attr("stroke-width", childCheck(layerIdx, nodeIdx) ? 3 : 1);
         });
    }
 }
 

 export class SVGLabeledBinaryTree extends SVGBinaryTree {
    constructor(svgElement: string, initialDepth: number, conf: CONF) {
       super(svgElement, initialDepth, conf);
    }

    refresh() {
      super.refresh();

      let wScale = d3.scaleLinear().domain([0, 100]).range([0, this.viewBoxWidth])
      let hScale = d3.scaleLinear().domain([0, 100]).range([0, this.viewBoxHeight]);

      let pad = this.pad;
      let itemSize = this.itemSize; 

      function absX(relX: number) {
         return pad + wScale(relX);
      }
      function absY(relY: number) {
         return pad + hScale(relY);
      }

      d3.select(this.svg)
         .selectAll(".edgeLabel")
         .remove();

      let fontSize = 12;
      let labelPad = 4;
      function addEdgeLabel(svg: string, parent: TreeItem, child: TreeItem) {
         let isRightEdge = parent.x < child.x;
         d3.select(svg)
            .append("rect")
            .attr("class", "edgeLabel")
            .attr("x", (absX(parent.x + itemSize/2) + absX(child.x + itemSize/2)) /2 - fontSize/2 - labelPad/2)
            .attr("y", (absY(parent.y + itemSize/2) + absY(child.y + itemSize/2)) /2 - fontSize + labelPad/2)
            .attr("width", fontSize+labelPad)
            .attr("height", fontSize+labelPad)
            .attr("fill", "#FFF")
            .attr("stroke", "#000")
            .attr("rx", labelPad)
            .attr("stroke-width", "1");

         d3.select(svg)
             .append("text")
             .attr("class", "edgeLabel")
             .attr("x", (absX(parent.x + itemSize/2) + absX(child.x + itemSize/2)) /2 )
             .attr("y", (absY(parent.y + itemSize/2) + absY(child.y + itemSize/2)) /2 + labelPad/2)
             .attr("text-anchor", "middle")
             .attr("font-size", fontSize + "px")
             .text(isRightEdge ? "1" : "0");
       }

       this.tree.treeMap(
         (layerIdx, nodeIdx, node) => {
            addEdgeLabel(this.svg, node, node.left());
            addEdgeLabel(this.svg, node, node.right());
         },
         (layerIdx, leaf) => {});
    }
 }