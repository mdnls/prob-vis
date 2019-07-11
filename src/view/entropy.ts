import {Bins} from 'model/bins';
import {ModelListener} from 'model/model';
import {TreeNode, TreeItem} from 'model/trees';
import {SVGInteractiveHistogram} from 'view/histogram';
import {SVGBinaryTree} from 'view/binarytree';
import {CONF} from 'main';
import * as d3 from "d3";
import * as $ from "jquery";

export class SVGSoloEntropy implements ModelListener {
    private model: Bins;
    private tree: SVGBinaryTree;
    private hist: SVGInteractiveHistogram;
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
       this.hist = new SVGInteractiveHistogram(this.svgHist, this.model, conf);
 
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
 
          let unit = 100 / (2**(depth-1));
          let markerLocs = Array.from({length: (2**(depth-1)) }, (value, key) => key * unit);
 
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
    private hist: SVGInteractiveHistogram;
    private svgTree: string;
    private svgHist: string;
    private div: string;
    private conf: CONF;
 
    constructor(divElement: string, model: Bins, conf: CONF) {
       this.conf = conf;
 
       let defaultIDs = ["svgHist", "svgTree"]; // single point of change for default ids. 
       this.div = divElement;
       this.svgHist = divElement + " > #" + defaultIDs[0];
       this.svgTree = divElement + " > #" + defaultIDs[1];
 
       let d = d3.select(divElement);
       d.append("svg").attr("id", defaultIDs[0]);
       d.append("br")
       d.append("svg").attr("id", defaultIDs[1]);
 
       this.model = model;
       this.tree = new SVGBinaryTree(this.svgTree, 0, conf);
       this.hist = new SVGInteractiveHistogram(this.svgHist, this.model, conf);
 
       this.model.addListener(this);
    }
 
    refresh() {
       let svgHeight = $(this.div).height();
       let svgWidth = $(this.div).width();
 
       // again, single point of control for the magic numbers that determine sub-element sizing
       // 0 -> histogram, 1 -> bar, 2 -> tree
       
       d3.select(this.svgHist).attr("height", svgHeight/2).attr("width", svgHeight/2);
       d3.select(this.svgTree).attr("height", svgHeight/3).attr("width", svgWidth);
 
       let selectedBin = this.model.selectedBin();
 
       if(selectedBin != -1 && this.model.getBin(selectedBin).length > 0) {
          d3.select(this.svgTree).attr("style", "display: initial");
 
          let colors = this.conf.colors["histogram"];
          let h = TreeNode.huffTree(this.model);
          this.tree.setTree(h);
          let color = (layerIdx: number, nodeIdx: number, node: TreeItem) => {
             if(node.itemType) { 
                return colors[Number.parseInt(node.itemType) % colors.length];
             }
             else {
                return "#000";
             }
          }
          this.tree.colorMap(color, color);
 
 
          // units for the bar
          let unit = 100 / (2**(h.depth()-1));
          let markerLocs = Array.from({length: (2**(h.depth()-1)) }, (value, key) => key * unit);
       }
       else { 
          d3.select(this.svgTree).attr("style", "display: none;");
       }
 
       this.hist.refresh();
    }
 }