define("model/model", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});
define("model/bins", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
        static fromArray(arr) {
            let hist = new Histogram(arr.length);
            arr.forEach((numItems, index) => { for (let i = 0; i < numItems; i++) {
                hist.addItem(index);
            } });
            return hist;
        }
        setAll(count) {
            for (let i = 0; i < this.histBins.length; i++) {
                while (this.histBins[i].length > count) {
                    this.removeItem(i);
                }
                while (this.histBins[i].length < count) {
                    this.addItem(i);
                }
            }
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
        bins() {
            return Array.from({ length: this.histBins.length }, (v, k) => this.getBin(k));
        }
        getBin(bin) {
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
define("model/trees", ["require", "exports"], function (require, exports) {
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
        static huffTree(binModel) {
            let bins = binModel.bins();
            let total = bins.reduce((prev, cur) => prev + cur.length, 0);
            let binFreqs = bins.map((k) => k.length / total);
            let binNodes = Array.from({ length: bins.length }, (v, k) => {
                let tl = new TreeLeaf();
                tl.itemType = String(k);
                return tl;
            });
            let binSortKeys = Array.from({ length: bins.length }, (v, k) => [0, k]);
            let sort = function () {
                let idxs = Array.from({ length: binFreqs.length }, (v, k) => k);
                idxs.sort((a, b) => {
                    return (binFreqs[b] - binFreqs[a] != 0) ? (binFreqs[b] - binFreqs[a]) : (b - a);
                });
                let newBinFreqs = Array.from({ length: binFreqs.length }, (v, k) => binFreqs[idxs[k]]);
                let newBinNodes = Array.from({ length: binNodes.length }, (v, k) => binNodes[idxs[k]]);
                let newBinSortKeys = Array.from({ length: binSortKeys.length }, (v, k) => binSortKeys[idxs[k]]);
                binFreqs = newBinFreqs;
                binNodes = newBinNodes;
                binSortKeys = newBinSortKeys;
            };
            while (binFreqs.length > 1) {
                sort();
                binFreqs.push(binFreqs.pop() + binFreqs.pop());
                let a = binNodes.pop();
                let ak = binSortKeys.pop();
                let b = binNodes.pop();
                let bk = binSortKeys.pop();
                if (ak[0] < bk[0]) {
                    let lk = [ak[0] + 1, ak[1]];
                    binNodes.push(new TreeNode(b, a));
                    binSortKeys.push(lk);
                }
                else if (ak[0] > bk[0]) {
                    let lk = [bk[0] + 1, bk[1]];
                    binNodes.push(new TreeNode(a, b));
                    binSortKeys.push(lk);
                }
                else {
                    if (ak[1] > bk[1]) {
                        let lk = [ak[0] + 1, ak[1]];
                        binNodes.push(new TreeNode(b, a));
                        binSortKeys.push(lk);
                    }
                    else {
                        let lk = [bk[0] + 1, bk[1]];
                        binNodes.push(new TreeNode(a, b));
                        binSortKeys.push(lk);
                    }
                }
            }
            let huffTree = binNodes[0];
            let balance = (layerIdx, nodeIdx, node) => {
                if (node.left().itemType && huffTree.depth() - (layerIdx + 1) > 1) {
                    let target = TreeNode.fullTree(huffTree.depth() - (layerIdx + 1));
                    let type = node.left().itemType;
                    target.treeMap((l, k, n) => { n.itemType = type; }, (l, k, n) => { n.itemType = type; });
                    node.leftChild = target;
                }
                if (node.right().itemType && huffTree.depth() - (layerIdx + 1) > 1) {
                    let target = TreeNode.fullTree(huffTree.depth() - (layerIdx + 1));
                    let type = node.right().itemType;
                    target.treeMap((l, k, n) => { n.itemType = type; }, (l, k, n) => { n.itemType = type; });
                    node.rightChild = target;
                }
            };
            huffTree.treeMap(balance, x => x);
            return huffTree;
        }
        constructor(leftChild, rightChild) {
            this.leftChild = leftChild;
            this.rightChild = rightChild;
            this.updateState();
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
        updateState() {
            this.leafs = this.leftChild.numLeaves() + this.rightChild.numLeaves();
            this.d = 1 + Math.max(this.leftChild.depth(), this.rightChild.depth());
        }
        _treeMap(layerIdx, nodeIdx, nodeFn, leafFn) {
            this.leftChild._treeMap(layerIdx + 1, 2 * nodeIdx, nodeFn, leafFn);
            this.rightChild._treeMap(layerIdx + 1, 2 * nodeIdx + 1, nodeFn, leafFn);
            nodeFn(layerIdx, nodeIdx, this);
            this.updateState();
        }
        treeMap(nodeFn, leafFn) {
            this._treeMap(0, 0, nodeFn, leafFn);
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
        _treeMap(layerIdx, nodeIdx, nodeFn, leafFn) {
            leafFn(layerIdx, nodeIdx, this);
        }
        treeMap(nodeFn, leafFn) {
            this._treeMap(0, 0, nodeFn, leafFn);
        }
    }
    exports.TreeLeaf = TreeLeaf;
});
define("view/binarytree", ["require", "exports", "model/trees", "d3", "jquery"], function (require, exports, trees_1, d3, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGBinaryTree {
        constructor(svgElement, initialDepth, conf) {
            this.svg = svgElement;
            this.tree = trees_1.TreeNode.fullTree(initialDepth);
            this.conf = conf;
            this.nodeColor = () => "#000";
            this.leafColor = () => "#000";
        }
        colorMap(nodeColor, leafColor) {
            this.nodeColor = (layerIdx, nodeIdx, node) => {
                node.color = nodeColor(layerIdx, nodeIdx, node);
            };
            this.leafColor = (layerIdx, nodeIdx, leaf) => {
                leaf.color = leafColor(layerIdx, nodeIdx, leaf);
            };
            this.refresh();
        }
        setDepth(n) {
            this.tree = trees_1.TreeNode.fullTree(n);
            this.refresh();
        }
        setTree(tree) {
            this.tree = tree;
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
            let d = this.tree.depth();
            this.tree.treeMap((layerIdx, nodeIdx, node) => {
                node.x = (node.left().x + node.right().x) / 2;
                node.y = 100 * (d - (layerIdx + 1)) / d;
            }, (layerIdx, nodeIdx, leaf) => {
                leaf.x = 2 * nodeIdx * itemSize;
                leaf.y = 0;
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
                    .attr("stroke-width", hScale(itemSize / 5))
                    .attr("stroke", "gray");
            }
            this.tree.treeMap(this.nodeColor, this.leafColor);
            this.tree.treeMap((layerIdx, nodeIdx, node) => {
                addEdge(this.svg, node, node.left());
                addEdge(this.svg, node, node.right());
            }, (layerIdx, leaf) => { });
            this.tree._treeMap(1, 0, (layerIdx, nodeIdx, node) => {
                d3.select(this.svg)
                    .append("circle")
                    .data([node])
                    .attr("id", "treeItem")
                    .attr("r", wScale(itemSize / 2))
                    .attr("cx", (d) => absX(d.x + itemSize / 2))
                    .attr("cy", (d) => absY(d.y + itemSize / 2))
                    .attr("fill", (d) => d.color);
            }, (layerIdx, nodeIdx, leaf) => {
                d3.select(this.svg)
                    .append("circle")
                    .data([leaf])
                    .attr("id", "treeItem")
                    .attr("r", wScale(itemSize / 2))
                    .attr("cx", (d) => absX(d.x + itemSize / 2))
                    .attr("cy", (d) => absY(d.y + itemSize / 2))
                    .attr("fill", (d) => d.color);
            });
        }
    }
    exports.SVGBinaryTree = SVGBinaryTree;
});
define("view/histogram", ["require", "exports", "d3", "jquery"], function (require, exports, d3, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGStaticHistogram {
        constructor(svgElement, model, conf) {
            this.svg = svgElement;
            this.model = model;
            this.conf = conf;
            this.model.addListener(this);
            d3.select(this.svg)
                .append("rect")
                .attr("class", "bottomBorder");
            this.refresh();
        }
        refresh() {
            let pad = this.conf.padding;
            let svgWidth = $(this.svg).width();
            let svgHeight = $(this.svg).height();
            let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
            let xOffset = (svgWidth - viewBoxSideLength) / 2;
            let yOffset = (svgHeight - viewBoxSideLength) / 2;
            let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);
            let s = scale.invert(viewBoxSideLength / this.model.numBins());
            this.s = s;
            this.pad = pad;
            this.width = svgWidth;
            this.height = svgHeight;
            this.viewBoxSideLength = viewBoxSideLength;
            this.xOffset = xOffset;
            this.yOffset = yOffset;
            let colors = this.conf.colors["histogram"];
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
                .attr("y", absY(0))
                .attr("height", scale(0.5))
                .attr("width", viewBoxSideLength)
                .attr("fill", this.conf.colors["border"][0])
                .attr("rx", 0.2 * s);
            var allItems = [].concat(...this.model.bins());
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
                .attr("x", (d) => absX(d.x * s + s * 0.075))
                .attr("y", (d) => absY((d.y + 1) * s + s * 0.075))
                .attr("fill", (d) => colors[d.x % colors.length]);
        }
    }
    exports.SVGStaticHistogram = SVGStaticHistogram;
    class SVGInteractiveHistogram extends SVGStaticHistogram {
        constructor(svgElement, model, conf) {
            super(svgElement, model, conf);
            this.model.addListener(this);
            this.refresh();
            d3.select(this.svg)
                .append("text")
                .text("*")
                .attr("class", "colHighlight")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle");
        }
        refresh() {
            super.refresh();
            let scale = d3.scaleLinear().domain([0, 100]).range([0, this.viewBoxSideLength]);
            let xOffset = this.xOffset;
            let yOffset = this.yOffset;
            let svgHeight = this.height;
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
                .on("click", () => this.selectCol(Math.floor(invAbsX(d3.event.x) / this.s)));
            if (this.model.selectedBin() != -1) {
                let binHeight = this.model.getBin(this.model.selectedBin()).length;
                d3.select(this.svg)
                    .selectAll(".colHighlight")
                    .attr("x", (d) => absX(this.s * this.model.selectedBin() + 0.5 * this.s))
                    .attr("y", (d) => absY(this.s * binHeight))
                    .attr("style", "font-size: " + scale(this.s) + "px;");
            }
        }
        selectCol(bin) {
            this.model.selectBin(bin);
        }
        incrSelectedBin() {
            if (this.model.selectedBin() != -1) {
                let curItems = this.model.getBin(this.model.selectedBin()).length;
                if ((curItems + 1) * this.s < 100) {
                    this.model.addItem(this.model.selectedBin());
                }
            }
        }
        decrSelectedBin() {
            if (this.model.selectedBin() != -1) {
                let curItems = this.model.getBin(this.model.selectedBin()).length;
                if (curItems > 1) {
                    this.model.removeItem(this.model.selectedBin());
                }
            }
        }
    }
    exports.SVGInteractiveHistogram = SVGInteractiveHistogram;
});
define("view/entropy", ["require", "exports", "model/trees", "view/histogram", "view/binarytree", "d3", "jquery"], function (require, exports, trees_2, histogram_1, binarytree_1, d3, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGSoloEntropy {
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
            this.tree = new binarytree_1.SVGBinaryTree(this.svgTree, 0, conf);
            this.hist = new histogram_1.SVGInteractiveHistogram(this.svgHist, this.model, conf);
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
            if (selectedBin != -1 && this.model.getBin(selectedBin).length > 0) {
                d3.select(this.svgTree).attr("style", "display: initial");
                d3.select(this.svgBar).attr("style", "display: initial");
                let items = this.model.getBin(selectedBin).length;
                let total = this.model.bins()
                    .reduce((running, cur) => (running + cur.length), 0);
                let distinct = total / items;
                let depth = Math.ceil(Math.log2(distinct)) + 1;
                this.tree.setDepth(depth);
                this.tree.refresh();
                let colors = this.conf.colors["histogram"];
                function isChildFn(targetLayer, targetNode) {
                    return (layerIdx, nodeIdx) => {
                        let diff = targetLayer - layerIdx;
                        return diff >= 0 && Math.floor(targetNode / (Math.pow(2, diff))) == nodeIdx;
                    };
                }
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
                    .attr("fill", (d) => (d == 0 ? colors[selectedBin % colors.length] : "#FFF"))
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
    exports.SVGSoloEntropy = SVGSoloEntropy;
    class SVGEntropy {
        constructor(divElement, model, conf) {
            this.conf = conf;
            let defaultIDs = ["svgHist", "svgTree"];
            this.div = divElement;
            this.svgHist = divElement + " > #" + defaultIDs[0];
            this.svgTree = divElement + " > #" + defaultIDs[1];
            let d = d3.select(divElement);
            d.append("svg").attr("id", defaultIDs[0]);
            d.append("br");
            d.append("svg").attr("id", defaultIDs[1]);
            this.model = model;
            this.tree = new binarytree_1.SVGBinaryTree(this.svgTree, 0, conf);
            this.hist = new histogram_1.SVGInteractiveHistogram(this.svgHist, this.model, conf);
            this.model.addListener(this);
        }
        refresh() {
            let svgHeight = $(this.div).height();
            let svgWidth = $(this.div).width();
            d3.select(this.svgHist).attr("height", svgHeight / 2).attr("width", svgHeight / 2);
            d3.select(this.svgTree).attr("height", svgHeight / 3).attr("width", svgWidth);
            let selectedBin = this.model.selectedBin();
            if (selectedBin != -1 && this.model.getBin(selectedBin).length > 0) {
                d3.select(this.svgTree).attr("style", "display: initial");
                let colors = this.conf.colors["histogram"];
                let h = trees_2.TreeNode.huffTree(this.model);
                this.tree.setTree(h);
                let color = (layerIdx, nodeIdx, node) => {
                    if (node.itemType) {
                        return colors[Number.parseInt(node.itemType) % colors.length];
                    }
                    else {
                        return "#000";
                    }
                };
                this.tree.colorMap(color, color);
                let unit = 100 / (Math.pow(2, (h.depth() - 1)));
                let markerLocs = Array.from({ length: (Math.pow(2, (h.depth() - 1))) }, (value, key) => key * unit);
            }
            else {
                d3.select(this.svgTree).attr("style", "display: none;");
            }
            this.hist.refresh();
        }
    }
    exports.SVGEntropy = SVGEntropy;
});
define("model/heatmap", ["require", "exports", "model/bins", "papaparse"], function (require, exports, bins_1, papaparse_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Cell {
        constructor(r, c, color, quantity) {
            this.r = r;
            this.c = c;
            this.color = color;
            this.quantity = quantity;
        }
    }
    exports.Cell = Cell;
    var Slice;
    (function (Slice) {
        Slice[Slice["ROWS"] = 0] = "ROWS";
        Slice[Slice["COLS"] = 1] = "COLS";
        Slice[Slice["ROW"] = 2] = "ROW";
        Slice[Slice["COL"] = 3] = "COL";
    })(Slice = exports.Slice || (exports.Slice = {}));
    class MatrixSlice {
        constructor(matrix, mode, index) {
            this.matrix = matrix;
            this.mode = mode;
            if (mode == Slice.ROW || mode == Slice.COL) {
                if (index == undefined) {
                    throw Error("Must provide an index to do a row slice.");
                }
                this.index = index;
            }
            else {
                this.index = -1;
            }
            let toDraw = [];
            let numItems = 50;
            switch (this.mode) {
                case Slice.ROW:
                    let row = this.matrix.getRow(this.index);
                    let rowTotal = row.map((c) => c.quantity).reduce((prev, cur) => prev + cur, 0);
                    if (rowTotal == 0) {
                        toDraw = row.map((c) => 0);
                    }
                    else {
                        toDraw = row.map((c) => Math.floor(numItems * c.quantity / rowTotal));
                    }
                    break;
                case Slice.COL:
                    let col = this.matrix.getCol(this.index);
                    let colTotal = col.map((c) => c.quantity).reduce((prev, cur) => prev + cur, 0);
                    if (colTotal == 0) {
                        toDraw = col.map((c) => 0);
                    }
                    else {
                        toDraw = col.map((c) => Math.floor(numItems * c.quantity / colTotal));
                    }
                    break;
                case Slice.COLS:
                    let rows = this.matrix.rows();
                    let quantityPerRow = rows.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
                    let rowsTotal = quantityPerRow.reduce((prev, cur) => cur + prev, 0);
                    if (rowsTotal == 0) {
                        toDraw = rows.map((c) => 0);
                    }
                    else {
                        toDraw = quantityPerRow.map((c) => Math.floor(numItems * c / rowsTotal));
                    }
                    break;
                case Slice.ROWS:
                    let cols = this.matrix.cols();
                    let quantityPerCol = cols.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
                    let colsTotal = quantityPerCol.reduce((prev, cur) => cur + prev, 0);
                    if (colsTotal == 0) {
                        toDraw = cols.map((c) => 0);
                    }
                    else {
                        toDraw = quantityPerCol.map((c) => Math.floor(numItems * c / colsTotal));
                    }
                    break;
            }
            this.histogram = bins_1.Histogram.fromArray(toDraw);
        }
        addListener(listener) {
            this.matrix.addListener(listener);
        }
        refresh() {
            this.matrix.refresh();
        }
        addItem(bin) {
            throw Error("Cannot add an item to a matrix slice.");
        }
        removeItem(bin) {
            throw Error("Cannot remove an item from a matrix slice.");
        }
        addBin() {
            throw Error("Cannot add a bin to a matrix slice.");
        }
        removeBin() {
            throw Error("Cannot remove a bin from a matrix slice.");
        }
        bins() {
            return this.histogram.bins();
        }
        getBin(bin) {
            return this.histogram.getBin(bin);
        }
        numBins() {
            return this.histogram.numBins();
        }
        selectBin(selection) {
            this.matrix.selectCol(selection);
            this.histogram.refresh();
            this.matrix.refresh();
        }
        selectedBin() {
            return this.matrix.selectedCol();
        }
    }
    exports.MatrixSlice = MatrixSlice;
    class HeatMap {
        constructor(sideLength) {
            this.mat = Array.from({ length: sideLength }, (v, r) => (Array.from({ length: sideLength }, (v, c) => new Cell(r, c, "#000", 1))));
            this.listeners = new Array();
            this.selection = -1;
        }
        static fromCSVStr(csv) {
            let dataStr = papaparse_1.parse(csv).data;
            let data = dataStr.map((r) => r.map((val) => Number.parseFloat(val)));
            data.forEach((row) => { if (row.length != data.length) {
                throw Error("The input data must be a square matrix");
            } });
            let hm = new HeatMap(data.length);
            data.forEach((row, rIdx) => {
                row.forEach((quantity, cIdx) => hm.setCell(rIdx, cIdx, quantity));
            });
            return hm;
        }
        rowHist() {
            return new MatrixSlice(this, Slice.ROWS);
        }
        colHist() {
            return new MatrixSlice(this, Slice.COLS);
        }
        rowSliceHist(row) {
            return new MatrixSlice(this, Slice.ROW, row);
        }
        refresh() {
            this.listeners.forEach((listener) => listener.refresh());
        }
        addListener(listener) {
            this.listeners.push(listener);
            listener.refresh();
        }
        setCell(row, col, quantity) {
            if (row >= 0 && row < this.mat.length && col >= 0 && col < this.mat.length) {
                this.mat[row][col].quantity = quantity;
            }
        }
        getCell(row, col) {
            return this.mat[row][col];
        }
        getRow(row) {
            return this.mat[row].map((cell) => new Cell(0, cell.c, cell.color, cell.quantity));
        }
        rows() {
            return Array.from(this.mat);
        }
        getCol(col) {
            return this.mat.map((row) => new Cell(row[col].r, 0, row[col].color, row[col].quantity));
        }
        cols() {
            return Array.from({ length: this.mat.length }, (v, k) => this.getCol(k));
        }
        selectCol(col) {
            if (col >= 0 && col < this.mat.length) {
                this.selection = col;
                this.refresh();
            }
        }
        selectedCol() {
            return this.selection;
        }
        sideLength() {
            return this.mat.length;
        }
    }
    exports.HeatMap = HeatMap;
});
define("view/heatmap", ["require", "exports", "d3"], function (require, exports, d3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGHeatmap {
        constructor(svgElement, model, conf) {
            this.svg = svgElement;
            this.model = model;
            this.conf = conf;
            this.model.addListener(this);
        }
        refresh() {
            let pad = this.conf.padding;
            let svgWidth = $(this.svg).width();
            let svgHeight = $(this.svg).height();
            let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
            let xOffset = (svgWidth - viewBoxSideLength) / 2;
            let yOffset = (svgHeight - viewBoxSideLength) / 2;
            let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);
            let s = scale.invert(viewBoxSideLength / this.model.sideLength());
            this.pad = pad;
            this.width = svgWidth;
            this.height = svgHeight;
            this.viewBoxSideLength = viewBoxSideLength;
            this.xOffset = xOffset;
            this.yOffset = yOffset;
            function absR(relR) {
                return yOffset + scale(relR);
            }
            function absC(relC) {
                return xOffset + scale(relC);
            }
            let allCells = [].concat(...this.model.rows());
            let max = allCells.reduce((prev, cur) => Math.max(prev, cur.quantity), -Infinity);
            let selectedCol = this.model.selectedCol();
            d3.select(this.svg)
                .selectAll("rect")
                .remove();
            d3.select(this.svg)
                .selectAll("rect")
                .data(allCells)
                .enter()
                .append("rect")
                .attr("x", (d) => absC(d.c * s + 0.075 * s))
                .attr("y", (d) => absR(d.r * s + 0.075 * s))
                .attr("width", (d) => scale(s * 0.85))
                .attr("height", (d) => scale(s * 0.85))
                .attr("fill", (d) => d3.interpolateBlues(0.1 + 0.9 * (d.quantity / max)))
                .attr("stroke", (d) => selectedCol != -1 && d.c == selectedCol ? "#222" : "none");
        }
    }
    exports.SVGHeatmap = SVGHeatmap;
});
define("view/transport", ["require", "exports", "view/histogram", "view/heatmap", "model/heatmap", "d3"], function (require, exports, histogram_2, heatmap_1, heatmap_2, d3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGTransport {
        constructor(divElement, model, conf) {
            this.conf = conf;
            this.div = divElement;
            let defaultIds = ["svgHeatMap", "svgRowHist", "svgColHist"];
            this.svgHeatMap = this.div + " > #" + defaultIds[0];
            this.svgRowHist = this.div + " > #" + defaultIds[1];
            this.svgColHist = this.div + " > #" + defaultIds[2];
            this.svgColOverlay = this.div + " > #" + defaultIds[2];
            let d = d3.select(this.div);
            d.append("svg").attr("id", defaultIds[1]);
            d.append("br");
            d.append("svg").attr("id", defaultIds[0]);
            d.append("svg").attr("id", defaultIds[2]).attr("transform", "rotate(90)");
            this.model = model;
            let rslice = new heatmap_2.MatrixSlice(this.model, heatmap_2.Slice.ROWS);
            let cslice = new heatmap_2.MatrixSlice(this.model, heatmap_2.Slice.COLS);
            this.heatmap = new heatmap_1.SVGHeatmap(this.svgHeatMap, this.model, this.conf);
            this.rowHist = new histogram_2.SVGInteractiveHistogram(this.svgRowHist, rslice, this.conf);
            this.colHist = new histogram_2.SVGStaticHistogram(this.svgColHist, cslice, this.conf);
            this.model.addListener(this);
        }
        refresh() {
            let svgHeight = $(this.div).height();
            let svgWidth = $(this.div).width();
            d3.select(this.svgRowHist).attr("width", svgWidth / 2).attr("height", svgHeight / 2);
            d3.select(this.svgHeatMap).attr("width", svgWidth / 2).attr("height", svgHeight / 2);
            d3.select(this.svgColHist).attr("width", svgWidth / 2).attr("height", svgHeight / 2);
            this.rowHist.refresh();
            this.colHist.refresh();
            this.heatmap.refresh();
        }
    }
    exports.SVGTransport = SVGTransport;
});
define("main", ["require", "exports", "view/binarytree", "view/histogram", "view/entropy", "view/transport", "view/heatmap", "model/bins", "model/heatmap", "d3"], function (require, exports, tree, hist, ent, transport, hm, histModel, matModel, d3) {
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
            "border": ["#505050",],
            "histogram": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7))
        };
        let conf = new CONF(8, colors, 15);
        let m = new histModel.Histogram(8);
        let vt = new tree.SVGBinaryTree("#treesvg", 4, conf);
        vt.setDepth(6);
        let i = 0;
        setInterval(() => { vt.setDepth((i++ % 6) + 1); }, 500);
        m.setAll(1);
        let v = new hist.SVGInteractiveHistogram("#svg", m, conf);
        let both = new ent.SVGEntropy("#plain-entropy0", m, conf);
        window.addEventListener("resize", () => { m.refresh(); });
        let mat = matModel.HeatMap.fromCSVStr('0,0,0,1,2,2,0,2,2,4,0,2,1,0,0\n1,0,0,1,0,1,2,1,2,0,0,1,0,0,0\n1,1,0,0,1,3,2,8,2,6,5,3,1,0,1\n3,1,4,4,7,3,11,8,7,4,4,5,2,0,0\n0,2,2,3,3,8,6,11,14,5,6,6,3,0,1\n0,3,1,6,8,8,20,12,14,18,8,6,7,5,4\n4,2,4,6,5,12,14,21,24,21,3,3,1,1,2\n2,0,6,11,11,11,16,14,17,13,13,6,3,0,2\n2,5,4,6,14,19,19,16,9,15,4,7,6,3,2\n0,1,7,3,8,7,21,12,13,14,8,7,7,0,1\n0,1,1,5,6,9,10,9,13,11,4,4,1,2,3\n0,1,0,3,5,7,8,7,3,3,4,6,3,1,1\n0,1,5,0,1,3,8,4,4,5,5,1,0,0,0\n0,0,0,2,2,2,4,4,2,1,1,0,0,1,0\n0,0,0,0,1,2,1,1,1,2,2,2,0,0,1');
        let svgHm = new hm.SVGHeatmap("#hmsvg", mat, conf);
        svgHm.refresh();
        let matSlice = new matModel.MatrixSlice(mat, matModel.Slice.ROWS);
        let svgMatSlice = new hist.SVGInteractiveHistogram("#hmslicesvg", matSlice, conf);
        svgMatSlice.refresh();
        let svgTransport = new transport.SVGTransport("#plain-transport0", mat, conf);
        svgTransport.refresh();
        document.addEventListener("keydown", event => {
            switch (event.key.toLowerCase()) {
                case ("h"):
                    svgMatSlice.selectCol(matSlice.selectedBin() - 1);
                    break;
                case ("l"):
                    svgMatSlice.selectCol(matSlice.selectedBin() + 1);
                    break;
                case ("k"):
                    break;
                case ("j"):
                    break;
            }
        });
    }
    exports.main = main;
    main();
});
//# sourceMappingURL=bundle.js.map