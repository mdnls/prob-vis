define("view", ["require", "exports", "model", "d3", "jquery"], function (require, exports, model_1, d3, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGHistogram {
        constructor(svgElement, model, conf) {
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
        refresh() {
            let s = this.conf.gridBoxSize;
            let pad = this.conf.padding;
            let svgWidth = $(this.svg).width();
            let svgHeight = $(this.svg).height();
            let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
            let xOffset = (svgWidth - viewBoxSideLength) / 2;
            let yOffset = (svgHeight - viewBoxSideLength) / 2;
            let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);
            this.pad = pad;
            this.width = svgWidth;
            this.height = svgHeight;
            this.viewBoxSideLength = viewBoxSideLength;
            this.xOffset = xOffset;
            this.yOffset = yOffset;
            function absX(relX) {
                return xOffset + scale(relX);
            }
            function invAbsX(absX) {
                return scale.invert(absX - xOffset);
            }
            function absY(relY) {
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
            var allItems = [].concat(...Array.from({ length: this.model.numBins() }, (value, key) => this.model.bins(key)));
            d3.select(this.svg)
                .selectAll("#histItem")
                .remove();
            d3.select(this.svg)
                .selectAll("rect #histItem")
                .data(allItems)
                .enter()
                .append("rect")
                .attr("id", "histItem")
                .attr("width", scale(s * 0.85))
                .attr("height", scale(s * 0.85))
                .attr("x", (d) => absX(d.x * s))
                .attr("y", (d) => absY((d.y + 1) * s))
                .attr("fill", (d) => d3.schemePaired[2 * (d.x % 6)])
                .attr("stroke", (d) => d3.schemePaired[2 * (d.x % 6) + 1]);
            function handleClick() {
                let absX = d3.event.x;
                let col = Math.floor(invAbsX(absX) / s);
                this.selectCol(col);
            }
            d3.select(this.svg)
                .on("click", () => this.selectCol(Math.floor(invAbsX(d3.event.x) / s)));
            if (this.model.selectedBin() != -1) {
                let binHeight = this.model.bins(this.model.selectedBin()).length;
                d3.select(this.svg)
                    .selectAll(".colHighlight")
                    .attr("x", (d) => absX(s * this.model.selectedBin() + 0.85 * s / 2))
                    .attr("y", (d) => absY(s * binHeight))
                    .attr("style", "font-size: " + scale(s) + "px;");
            }
        }
        selectCol(bin) {
            this.model.selectBin(bin);
        }
        incrSelectedBin() {
            let s = this.conf.gridBoxSize;
            if (this.model.selectedBin() != -1 && this.model.bins(this.model.selectedBin()).length * s < 100) {
                let curItems = this.model.bins(this.model.selectedBin()).length;
                if ((curItems + 2) * s < 100) {
                    this.model.addItem(this.model.selectedBin());
                }
            }
        }
        decrSelectedBin() {
            if (this.model.selectedBin() != -1) {
                this.model.removeItem(this.model.selectedBin());
            }
        }
    }
    exports.SVGHistogram = SVGHistogram;
    class SVGBinaryTree {
        constructor(svgElement, initialDepth, conf) {
            this.svg = svgElement;
            this.tree = model_1.TreeNode.fullTree(initialDepth);
            this.conf = conf;
        }
        attention(layerIdx, nodeIdx) {
            this.attnNode = [layerIdx, nodeIdx];
            this.refresh();
        }
        noAttention() {
            delete this.attnNode;
            this.refresh();
        }
        setDepth(n) {
            this.tree = model_1.TreeNode.fullTree(n);
            this.refresh();
        }
        refresh() {
            let numLeafs = this.tree.numLeaves();
            let itemSize = 100 / (2 * numLeafs - 1);
            let pad = this.conf.padding;
            let svgWidth = $(this.svg).width();
            let svgHeight = $(this.svg).height();
            let viewBoxWidth = svgWidth - 2 * pad;
            let viewBoxHeight = svgHeight - 2 * pad;
            let wScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxWidth]);
            let hScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxHeight]);
            this.numLeafs = numLeafs;
            this.nodeRadius = hScale(itemSize / 2);
            this.width = svgWidth;
            this.height = svgHeight;
            this.viewBoxWidth = viewBoxWidth;
            this.viewBoxHeight = viewBoxHeight;
            function absX(relX) {
                return pad + wScale(relX);
            }
            function absY(relY) {
                return pad + hScale(relY);
            }
            this.tree.treeMap(0, 0, (layerIdx, nodeIdx, node) => {
                node.x = (node.left().x + node.right().x) / 2;
                node.y = node.left().y + 2 * itemSize;
                node.itemType = "treeNode";
            }, (layerIdx, nodeIdx, leaf) => {
                leaf.x = 2 * nodeIdx * itemSize;
                leaf.y = 0;
                leaf.itemType = "treeLeaf";
            });
            d3.select(this.svg)
                .selectAll("#treeItem")
                .remove();
            d3.select(this.svg)
                .selectAll("#treeEdge")
                .remove();
            function addEdge(svg, parent, child) {
                d3.select(svg)
                    .append("line")
                    .attr("id", "treeEdge")
                    .attr("x1", (d) => absX(parent.x + itemSize / 2))
                    .attr("x2", (d) => absX(child.x + itemSize / 2))
                    .attr("y1", (d) => absY(parent.y + itemSize / 2))
                    .attr("y2", (d) => absY(child.y + itemSize / 2))
                    .attr("stroke-width", hScale(itemSize / 10))
                    .attr("stroke", "gray");
            }
            this.tree.treeMap(0, 0, (layerIdx, nodeIdx, node) => {
                addEdge(this.svg, node, node.left());
                addEdge(this.svg, node, node.right());
            }, (layerIdx, leaf) => { });
            function attnChecker(targetLayer, targetNode) {
                return (layerIdx, nodeIdx) => {
                    let diff = targetLayer - layerIdx;
                    return diff >= 0 && Math.floor(targetNode / (Math.pow(2, diff))) == nodeIdx;
                };
            }
            let hasAttn = Boolean(this.attnNode) ? attnChecker(this.attnNode[0], this.attnNode[1]) : () => false;
            this.tree.treeMap(1, 0, (layerIdx, nodeIdx, node) => {
                d3.select(this.svg)
                    .append("circle")
                    .data([node])
                    .attr("id", "treeItem")
                    .attr("r", hScale(itemSize / 2))
                    .attr("cx", (d) => absX(d.x + itemSize / 2))
                    .attr("cy", (d) => absY(d.y + itemSize / 2))
                    .attr("fill", (d) => { return hasAttn(layerIdx, nodeIdx) ? "red" : "black"; });
            }, (layerIdx, nodeIdx, leaf) => {
                d3.select(this.svg)
                    .append("circle")
                    .data([leaf])
                    .attr("id", "treeItem")
                    .attr("r", hScale(itemSize / 2))
                    .attr("cx", (d) => absX(d.x + itemSize / 2))
                    .attr("cy", (d) => absY(d.y + itemSize / 2))
                    .attr("fill", (d) => { return hasAttn(layerIdx, nodeIdx) ? "red" : "black"; });
            });
        }
    }
    exports.SVGBinaryTree = SVGBinaryTree;
    class SVGEntropy {
        constructor(divElement, model, conf) {
            this.conf = conf;
            let defaultIDs = ["svgHist", "svgBar", "svgTree"];
            this.div = divElement;
            this.svgHist = divElement + " > #" + defaultIDs[0];
            this.svgBar = divElement + " > #" + defaultIDs[1];
            this.svgTree = divElement + " > #" + defaultIDs[2];
            let d = d3.select(divElement);
            d.append("svg").attr("id", defaultIDs[0]);
            d.append("br");
            d.append("svg").attr("id", defaultIDs[1]);
            d.append("br");
            d.append("svg").attr("id", defaultIDs[2]);
            this.model = model;
            this.tree = new SVGBinaryTree(this.svgTree, 0, conf);
            this.hist = new SVGHistogram(this.svgHist, this.model, conf);
            this.model.addListener(this);
        }
        refresh() {
            let svgHeight = $(this.div).height();
            let svgWidth = $(this.div).width();
            let sideLens = [svgHeight * (7 / 16), svgHeight * (1 / 8), svgHeight * (7 / 16)];
            d3.select(this.svgHist).attr("height", sideLens[0]).attr("width", sideLens[0]);
            d3.select(this.svgBar).attr("height", sideLens[1]).attr("width", sideLens[0]);
            d3.select(this.svgTree).attr("height", sideLens[2]).attr("width", sideLens[2]);
            let selectedBin = this.model.selectedBin();
            if (selectedBin != -1 && this.model.bins(selectedBin).length > 0) {
                d3.select(this.svgTree).attr("style", "display: initial");
                d3.select(this.svgBar).attr("style", "display: initial");
                let items = this.model.bins(selectedBin).length;
                let total = Array.from({ length: this.model.numBins() }, (value, key) => this.model.bins(key))
                    .reduce((running, cur) => (running + cur.length), 0);
                let distinct = total / items;
                let depth = Math.ceil(Math.log2(distinct)) + 1;
                this.tree.setDepth(depth);
                this.tree.refresh();
                let unit = 100 / (Math.pow(2, (depth - 1)));
                let markerLocs = Array.from({ length: (Math.pow(2, (depth - 1))) }, (value, key) => key * unit);
                let pad = this.conf.padding;
                let viewBoxHeight = sideLens[1] - 2 * pad;
                let viewBoxWidth = sideLens[0] - 2 * pad;
                let hScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxHeight]);
                let wScale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxWidth]);
                function absX(relX) {
                    return pad + wScale(relX);
                }
                function absY(relY) {
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
                    .attr("x", (d) => absX(d))
                    .attr("y", absY(0))
                    .attr("width", wScale(unit))
                    .attr("height", hScale(100))
                    .attr("fill", (d) => (d == 0 ? d3.schemePaired[2 * (selectedBin % 6)] : "#FFF"))
                    .attr("stroke", "#000")
                    .attr("stroke-width", sideLens[1] / 40);
            }
            else {
                d3.select(this.svgTree).attr("style", "display: none;");
                d3.select(this.svgBar).attr("style", "display: none;");
            }
            this.hist.refresh();
        }
    }
    exports.SVGEntropy = SVGEntropy;
});
define("model", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class TreeNode {
        static fullTree(d) {
            if (d <= 1) {
                return new TreeLeaf();
            }
            else {
                return new TreeNode(this.fullTree(d - 1), this.fullTree(d - 1));
            }
        }
        constructor(leftChild, rightChild) {
            this.leftChild = leftChild;
            this.rightChild = rightChild;
            this.leafs = this.leftChild.numLeaves() + this.rightChild.numLeaves();
            this.d = 1 + Math.max(this.leftChild.depth() + this.rightChild.depth());
        }
        addListener(listener) {
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
        layer(n) {
            if (n == 0) {
                return [this];
            }
            else {
                return this.leftChild.layer(n - 1).concat(this.rightChild.layer(n - 1));
            }
        }
        left() {
            return this.leftChild;
        }
        right() {
            return this.rightChild;
        }
        treeMap(layerIdx, nodeIdx, nodeFn, leafFn) {
            this.leftChild.treeMap(layerIdx + 1, 2 * nodeIdx, nodeFn, leafFn);
            this.rightChild.treeMap(layerIdx + 1, 2 * nodeIdx + 1, nodeFn, leafFn);
            nodeFn(layerIdx, nodeIdx, this);
        }
    }
    exports.TreeNode = TreeNode;
    class TreeLeaf {
        addListener(listener) {
            this.listeners.push(listener);
        }
        refresh() {
            this.listeners.forEach((listener) => listener.refresh());
        }
        numLeaves() {
            return 1;
        }
        depth() {
            return 1;
        }
        layer(n) {
            if (n == 0) {
                return [this];
            }
            else {
                return [];
            }
        }
        treeMap(layerIdx, nodeIdx, nodeFn, leafFn) {
            leafFn(layerIdx, nodeIdx, this);
        }
    }
    exports.TreeLeaf = TreeLeaf;
    class BinItem {
        constructor(x, y, itemType) {
            this.populate(x, y, itemType);
        }
        populate(x, y, itemType) {
            this.x = x;
            this.y = y;
            this.itemType = itemType;
        }
    }
    exports.BinItem = BinItem;
    class Histogram {
        constructor(numBins) {
            this.itemType = "default";
            this.histBins = Array.from({ length: numBins }, () => new Array());
            this.listeners = new Array();
            this.selection = -1;
        }
        addItem(bin) {
            this.histBins[bin].push(new BinItem(bin, this.histBins[bin].length, this.itemType));
            this.refresh();
        }
        removeItem(bin) {
            this.histBins[bin].pop();
            this.refresh();
        }
        addBin() {
            this.histBins.push(new Array());
            this.refresh();
        }
        removeBin() {
            this.histBins.pop();
            if (this.selection == this.histBins.length) {
                this.selection = -1;
            }
            this.refresh();
        }
        bins(bin) {
            var binArr = this.histBins[bin];
            return Array.from(binArr);
        }
        refresh() {
            this.listeners.forEach((listener) => listener.refresh());
        }
        addListener(listener) {
            this.listeners.push(listener);
            listener.refresh();
        }
        numBins() {
            return this.histBins.length;
        }
        selectBin(selection) {
            if (selection >= 0 && selection < this.histBins.length) {
                this.selection = selection;
                this.refresh();
            }
        }
        selectedBin() {
            return this.selection;
        }
    }
    exports.Histogram = Histogram;
});
define("main", ["require", "exports", "model", "view"], function (require, exports, model, view) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class CONF {
        constructor(gridBoxSize, colors, padding) {
            this.gridBoxSize = gridBoxSize;
            this.colors = colors;
            this.padding = padding;
        }
    }
    exports.CONF = CONF;
    function main() {
        let colors = {
            "default": ["#000", "#202020"],
            "border": ["#505050",]
        };
        let conf = new CONF(7, colors, 5);
        let m = new model.Histogram(15);
        let vt = new view.SVGBinaryTree("#treesvg", 4, conf);
        vt.setDepth(6);
        let i = 0;
        setInterval(() => { vt.setDepth((i++ % 6) + 1); }, 500);
        m.addItem(0);
        m.addItem(0);
        m.addItem(0);
        m.addItem(1);
        m.addItem(2);
        m.addItem(2);
        m.addItem(4);
        let v = new view.SVGHistogram("#svg", m, conf);
        let both = new view.SVGEntropy("#plain-entropy0", m, conf);
        window.addEventListener("resize", () => { m.refresh(); vt.refresh(); });
        $("#plain-histogram0 > .addItem").click(() => v.incrSelectedBin());
        $("#plain-histogram0 > .rmItem").click(() => v.decrSelectedBin());
    }
    exports.main = main;
    main();
});
//# sourceMappingURL=bundle.js.map