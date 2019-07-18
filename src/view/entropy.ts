import {Bins} from 'model/bins';
import {ModelListener} from 'model/model';
import {TreeNode, TreeItem} from 'model/trees';
import {SVGInteractiveHistogram, SVGHistogram} from 'view/histogram';
import {SVGBinaryTree} from 'view/binarytree';
import {CONF} from '../model/model';
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
       this.hist = new SVGInteractiveHistogram("entHist", this.svgHist, this.model, conf);
 
       this.model.addListener(this);
    }
 
    refresh() {
       let svgHeight = $(this.div).height();
 
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
          let colors = this.conf.colors[this.hist.name];
          if(colors == undefined) {
             colors = this.conf.colors["default"];
          }
          
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
    model: Bins;
    tree: SVGBinaryTree;
    hist: SVGHistogram;
    svgTree: string;
    svgHist: string;
    div: string;
    conf: CONF;
 
    constructor(divElement: string, model: Bins, conf: CONF) {
       this.conf = conf;
 
       let defaultIDs = ["svgHist", "svgTree"]; // single point of change for default ids. 
       this.div = divElement;
       this.svgHist = divElement + " > #" + defaultIDs[0];
       this.svgTree = divElement + " > #" + defaultIDs[1];
 
       let d = d3.select(divElement);
       d.append("svg").attr("id", defaultIDs[0]);
       d.append("svg").attr("id", defaultIDs[1]);
 
       this.model = model;
       this.tree = new SVGBinaryTree(this.svgTree, 0, conf);
       this.hist = new SVGHistogram("entHist", this.svgHist, this.model, conf);
 
       this.model.addListener(this);
    }
 
    refresh() {
      let svgHeight = $(this.div).height();
      let svgWidth = $(this.div).width();

      d3.select(this.svgHist).attr("height", svgHeight/2).attr("width", svgWidth/2);
      d3.select(this.svgTree).attr("height", svgHeight/2).attr("width", svgWidth);

      d3.select(this.svgTree).attr("style", "display: initial");

      let colors = this.conf.colors[this.hist.name];
      if(colors == undefined) {
         colors = this.conf.colors["default"];
      }
      
      let h = TreeNode.huffTree(this.model);
      this.tree.setTree(h);
      let color = (layerIdx: number, nodeIdx: number, node: TreeItem) => {
         if(node.itemType) {
            if(node.itemType[0] == "c") {
               let c = d3.color(colors[Number.parseInt(node.itemType[1]) % colors.length]);
               c.opacity = 0.7;
               return c.toString();
            }
            else {
               return colors[Number.parseInt(node.itemType) % colors.length];
            }
         }
         else {
            return "#000";
         }
      }
      this.tree.colorMap(color, color);

      this.hist.refresh();
    }
 }

 export class SVGInteractiveEntropy extends SVGEntropy {
   hist: SVGInteractiveHistogram;
   constructor(divElement: string, model: Bins, conf: CONF) {
      super(divElement, model, conf);
      // overwrite the histogram
      this.hist = new SVGInteractiveHistogram("entHist", this.svgHist, this.model, conf);
   }
 }

 export class SVGIndicatorEntropy extends SVGInteractiveEntropy {
    constructor(divElement: string, model: Bins, conf: CONF) {
       super(divElement, model, conf);

       d3.select(this.svgTree)
         .append("line")
         .attr("id", "actualEntInd")
         .attr("x1", 0)
         .attr("x2", 0)
         .attr("y1", 0)
         .attr("y2", 0);
      d3.select(this.svgTree)
         .append("line")
         .attr("id", "realizedEntInd")
         .attr("x1", 0)
         .attr("x2", 0)
         .attr("y1", 0)
         .attr("y2", 0);
    }

    refresh() {
      super.refresh();

      if(this.model.selectedBin() != -1) {
         let treeModel = this.tree.tree;
         let binModel = this.model;
   
         // calculate actual and realized entropy
         let total = binModel.bins().reduce((p, c) => c.length + p, 0);
         let prob = binModel.bins().map(v => v.length / total);
   
         let binLayers: number[][] = [];
         // TODO: introduce hufftree class which can make this calculation at the model level, in a way that is more concrete.
         let treeFn = (layerIdx: number, nodeIdx: number, node: TreeItem) => {
            if(node.itemType != undefined && node.itemType[0] != "c") { // this is awful ood
               binLayers.push([Number.parseInt(node.itemType), layerIdx])
           }
         };
         treeModel.treeMap(treeFn, treeFn);

         let actual = prob.reduce((p, c) => p + (c * Math.log2(1/c)), 0);
         let realized = binLayers.reduce((p, c) => p + prob[c[0]] * c[1], 0)
   
         // set up drawing items
         
         let pad = this.conf.padding + (this.tree.width / (2 * this.tree.numLeafs - 1))/2;
         let wScale = d3.scaleLinear().domain([0, 100]).range([0, this.tree.viewBoxWidth])
         let hScale = d3.scaleLinear().domain([0, 100]).range([0, this.tree.viewBoxHeight]);
         let r = this.tree.nodeRadius;
   
         function absX(relX: number) {
            return pad + wScale(relX);
         }
         function absY(relY: number) {
            return pad + hScale(relY);
         }
   
         let d = treeModel.depth();
   
         d3.select("#actualEntInd")
            .attr("x1", absX(0))
            .attr("x2", absX(100))
            .attr("y1", absY((100 / d) * (d - actual - 1)) + r)
            .attr("y2", absY((100 / d) * (d - actual - 1)) + r)
            .attr("stroke", "#AA2020")
            .attr("stroke-width", "2px");
         d3.select("#realizedEntInd")
            .attr("x1", absX(0))
            .attr("x2", absX(100))
            .attr("y1", absY((100 / d) * (d - realized - 1)) + r)
            .attr("y2", absY((100 / d) * (d - realized - 1)) + r)
            .attr("stroke", "#999")
            .attr("stroke-width", "2px");

      }
    }
 }

export class SVGInteractiveCrossEntropy implements ModelListener {
   div: string;
   divSourceEnt: string;
   divTargetEnt: string;
   sourceEnt: SVGInteractiveEntropy;
   targetEnt: SVGEntropy;
   sourceModel: Bins;
   targetModel: Bins;
   conf: CONF;
   constructor(divElement: string, pModel: Bins, qModel: Bins, conf: CONF) {
      let defaultIDs = ["pEnt", "qEnt"];
      this.div = divElement;
      this.divSourceEnt = divElement + " > #" + defaultIDs[0];
      this.divTargetEnt = divElement + " > #" + defaultIDs[1];

      let d = d3.select(divElement);
      d.attr("class", "row");
      d.append("div").attr("id", defaultIDs[0]).attr("class", "col-6");
      d.append("div").attr("id", defaultIDs[1]).attr("class", "col-6");

      this.sourceModel = pModel;
      this.targetModel = qModel;
      this.conf = conf;

      this.sourceEnt = new SVGInteractiveEntropy(this.divSourceEnt, this.sourceModel, conf)
      this.targetEnt = new SVGEntropy(this.divTargetEnt, this.targetModel, conf);
      this.sourceModel.addListener(this);
      this.targetModel.addListener(this);
   }

   refresh() {
      let selectedBin = this.sourceModel.selectedBin();
      if(selectedBin != -1) {

         let findInTree = function(selectedBin: number, tree: TreeItem) {
            let layerIdx = -1;
            let nodeIdx = -1;
            let d = 0;
            while(d < tree.depth() && layerIdx == -1) {
               let layer = tree.layer(d);
               layer.forEach((v: TreeItem, i: number) => {
                  if(v.itemType == selectedBin + "") {
                     layerIdx = d;
                     nodeIdx = i;
                  }
              });
              d += 1;
            }
            return [layerIdx, nodeIdx];
         } 

         let inSource = findInTree(selectedBin, this.sourceEnt.tree.tree);
         let inTarget = findInTree(selectedBin, this.targetEnt.tree.tree);

         if(inSource[0] == -1 || inTarget[0] == -1) {
            this.sourceEnt.refresh();
            this.targetEnt.refresh();
            return;
         }
         
         this.sourceEnt.tree.highlightNode(inSource[0], inSource[1]);
         this.targetEnt.tree.highlightNode(inTarget[0], inTarget[1]);
      }

      this.sourceEnt.refresh();
      this.targetEnt.refresh();
   }
}