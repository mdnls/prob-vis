define("model/model", ["require", "exports"], function (require, exports) {
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
        static full(length, n) {
            let hist = new Histogram(length);
            hist.setAll(n);
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
            let numItems = 25;
            let rows = this.matrix.rows();
            let quantityPerRow = rows.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
            let rowsTotal = quantityPerRow.reduce((prev, cur) => cur + prev, 0);
            let cols = this.matrix.cols();
            let quantityPerCol = cols.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
            let colsTotal = quantityPerCol.reduce((prev, cur) => cur + prev, 0);
            switch (this.mode) {
                case Slice.ROW:
                    let row = this.matrix.getRow(this.index);
                    if (rowsTotal == 0) {
                        toDraw = row.map((c) => 0);
                    }
                    else {
                        toDraw = row.map((c) => Math.floor(numItems * c.quantity / rowsTotal));
                    }
                    break;
                case Slice.COL:
                    let col = this.matrix.getCol(this.index);
                    if (colsTotal == 0) {
                        toDraw = col.map((c) => 0);
                    }
                    else {
                        toDraw = col.map((c) => Math.floor(numItems * c.quantity / colsTotal));
                    }
                    break;
                case Slice.COLS:
                    if (rowsTotal == 0) {
                        toDraw = rows.map((c) => 0);
                    }
                    else {
                        toDraw = quantityPerRow.map((c) => Math.floor(numItems * c / rowsTotal));
                    }
                    break;
                case Slice.ROWS:
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
    class UnnormalizedMatrixSlice extends MatrixSlice {
        constructor(matrix, mode, index) {
            super(matrix, mode, index);
            let toDraw = [];
            let rows = this.matrix.rows();
            let quantityPerRow = rows.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
            let cols = this.matrix.cols();
            let quantityPerCol = cols.map((cells) => cells.reduce((prev, cur) => cur.quantity + prev, 0));
            switch (this.mode) {
                case Slice.ROW:
                    toDraw = this.matrix.getRow(this.index).map(c => c.quantity);
                    break;
                case Slice.COL:
                    toDraw = this.matrix.getCol(this.index).map(c => c.quantity);
                    break;
                case Slice.COLS:
                    toDraw = quantityPerRow;
                    break;
                case Slice.ROWS:
                    toDraw = quantityPerCol;
                    break;
            }
            this.histogram = bins_1.Histogram.fromArray(toDraw);
        }
    }
    exports.UnnormalizedMatrixSlice = UnnormalizedMatrixSlice;
});
define("view/textbinder", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LooseTextBinder {
        constructor(textElement, model, updateRule) {
            this.textElement = textElement;
            this.model = model;
            this.updateRule = updateRule;
        }
        refresh() {
            $(this.textElement).text(this.updateRule(this.model));
        }
    }
    exports.LooseTextBinder = LooseTextBinder;
    class TextBinder extends LooseTextBinder {
        constructor(textElement, model, updateRule) {
            super(textElement, model, updateRule);
            model.addListener(this);
        }
    }
    exports.TextBinder = TextBinder;
});
define("data", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.chisqr1 = {
        "leftHistBins": [1, 2, 4, 6, 3, 4, 1, 1],
        "rightHistBins": [1, 2, 3, 5, 4, 6, 2, 1]
    };
    exports.simpleHist = {
        "hist": [7, 0, 0, 0, 0, 0, 4, 0]
    };
    exports.chisqr2 = {
        "leftHistBins": [2, 2, 3, 2, 4, 5, 8, 0],
        "centerHistBins": [2, 2, 3, 2, 4, 5, 8, 8],
        "rightHistBins": [2, 2, 2, 2, 3, 3, 3, 3]
    };
    exports.entropyExs = {
        "highEntropy": [3, 4, 3, 3, 3, 4, 3, 3],
        "medEntropy": [1, 2, 4, 7, 7, 4, 2, 1],
        "lowEntropy": [1, 7, 1, 1, 1, 1, 1, 1]
    };
    exports.xEntropyExs = {
        "q": [2, 7, 4, 2, 5, 1, 3, 2]
    };
    exports.transportEx = {
        "matrix": "0,0,0,1,1,0,0,0\n1,0,0,0,2,0,0,0\n0,0,1,1,0,0,0,0\n0,0,0,0,2,0,0,0\n0,2,1,0,0,0,1,0\n0,3,2,0,0,0,0,1\n1,2,0,0,0,1,2,1\n0,0,1,0,0,0,0,0",
        "opt_matrix": "2,0,0,0,0,0,0,0\n0,3,0,0,0,0,0,0\n0,0,2,0,0,0,0,0\n0,2,0,0,0,0,0,0\n0,2,0,0,2,0,0,0\n0,0,3,0,3,0,0,0\n0,0,0,2,0,1,3,1\n0,0,0,0,0,0,0,1"
    };
});
define("view/histogram", ["require", "exports", "model/bins", "d3", "jquery"], function (require, exports, bins_2, d3, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class SVGHistogram {
        constructor(name, svgElement, model, conf) {
            this.svg = svgElement;
            this.model = model;
            this.conf = conf;
            this.fixed = false;
            this.name = name;
            this.model.addListener(this);
            this.refresh();
        }
        refresh() {
            if (this.fixed) {
                return;
            }
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
            let colors = this.conf.colors[this.name];
            if (colors == undefined) {
                colors = this.conf.colors["default"];
            }
            function absX(relX) {
                return xOffset + scale(relX);
            }
            function invAbsX(absX) {
                return scale.invert(absX - xOffset - document.getElementById(this.svg).getBoundingClientRect().left);
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
                .selectAll("." + this.name)
                .remove();
            d3.select(this.svg)
                .selectAll("rect ." + this.name)
                .data(allItems)
                .enter()
                .append("rect")
                .attr("class", this.name)
                .attr("width", scale(s * 0.85))
                .attr("height", scale(s * 0.85))
                .attr("x", (d) => absX(d.x * s + s * 0.075))
                .attr("y", (d) => absY((d.y + 1) * s - s * 0.075))
                .attr("fill", (d) => colors[d.x % colors.length]);
        }
        fix() {
            this.fixed = true;
        }
        unfix() {
            this.fixed = false;
        }
    }
    exports.SVGHistogram = SVGHistogram;
    class SVGInteractiveHistogram extends SVGHistogram {
        constructor(name, svgElement, model, conf) {
            super(name, svgElement, model, conf);
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
            let id = this.svg;
            function absX(relX) {
                return xOffset + scale(relX);
            }
            function invAbsX(absX) {
                return scale.invert(absX - xOffset - $(id).position().left);
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
    class SVGPhantomHistogram extends SVGHistogram {
        constructor(name, svgElement, model, phantom, conf) {
            super(name, svgElement, model, conf);
            this.model.addListener(this);
            this.phantom = phantom;
            this.phantom.addListener(this);
            this.refresh();
        }
        refresh() {
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
            if (this.phantom != undefined) {
                let pdata = this.phantom.bins().map((bin) => bin[bin.length - 1]);
                let mdata = this.model.bins().map((bin) => bin[bin.length - 1]);
                mdata = mdata.map((v, k) => (v == undefined) ? new bins_2.BinItem(k, -1, "") : v);
                d3.select(this.svg)
                    .selectAll(".phantomIndicator")
                    .remove();
                d3.select(this.svg)
                    .selectAll(".phantomIndicatorCover")
                    .remove();
                d3.select(this.svg)
                    .selectAll(".phantomIndicatorLine")
                    .remove();
                d3.select(this.svg)
                    .selectAll("rect .phantomIndicator")
                    .data(pdata)
                    .enter()
                    .append("rect")
                    .attr("x", (d) => absX(d.x * this.s + this.s * 0.025))
                    .attr("y", (d) => absY((d.y + 1) * this.s - this.s * 0.025))
                    .attr("width", (d) => scale(this.s * 0.95))
                    .attr("height", (d) => scale(this.s * 0.95 * 0.25))
                    .attr("fill", "#AAAAAA")
                    .attr("class", "phantomIndicator");
                d3.select(this.svg)
                    .selectAll("rect .phantomIndicatorCover")
                    .data(pdata)
                    .enter()
                    .append("rect")
                    .attr("x", (d) => absX(d.x * this.s + this.s * 0.075))
                    .attr("y", (d) => absY((d.y + 1) * this.s - this.s * 0.075))
                    .attr("width", (d) => scale(this.s * 0.85))
                    .attr("height", (d) => scale(this.s * 0.85))
                    .attr("fill", "#FFFFFF")
                    .attr("class", "phantomIndicator");
                let overModelIdxs = Array.from({ length: pdata.length }, (v, k) => k).filter((v, k) => pdata[k].y > mdata[k].y);
                d3.select(this.svg)
                    .selectAll("line .phantomIndicatorLine")
                    .data(overModelIdxs)
                    .enter()
                    .append("line")
                    .attr("x1", (d) => absX(this.s * pdata[d].x + this.s / 2))
                    .attr("x2", (d) => absX(this.s * pdata[d].x + this.s / 2))
                    .attr("y1", (d) => absY(this.s * (mdata[d].y + 1) - 0.075 * this.s))
                    .attr("y2", (d) => absY(this.s * (pdata[d].y + 1) - 0.075 * this.s))
                    .attr("stroke", "#DDDDDD")
                    .attr("class", "phantomIndicatorLine");
            }
            super.refresh();
        }
    }
    exports.SVGPhantomHistogram = SVGPhantomHistogram;
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
        static huffTree(binModel, requiredDepth) {
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
            let depth = huffTree.depth();
            if (requiredDepth != undefined) {
                depth = Math.max(depth, requiredDepth);
            }
            let balance = (layerIdx, nodeIdx, node) => {
                if (node.left().itemType && depth - (layerIdx + 1) > 1) {
                    let target = TreeNode.fullTree(depth - (layerIdx + 1));
                    let type = "c" + node.left().itemType;
                    target.treeMap((l, k, n) => { n.itemType = type; }, (l, k, n) => { n.itemType = type; });
                    target.itemType = node.left().itemType;
                    node.leftChild = target;
                }
                if (node.right().itemType && depth - (layerIdx + 1) > 1) {
                    let target = TreeNode.fullTree(depth - (layerIdx + 1));
                    let type = "c" + node.right().itemType;
                    target.treeMap((l, k, n) => { n.itemType = type; }, (l, k, n) => { n.itemType = type; });
                    target.itemType = node.right().itemType;
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
        highlightNode(layerIdx, nodeIdx) {
            this.attnNode = [layerIdx, nodeIdx];
            this.refresh();
        }
        refresh() {
            let numLeafs = this.tree.numLeaves();
            let itemSize = 100 / (2 * numLeafs - 1);
            let svgWidth = $(this.svg).width();
            let svgHeight = $(this.svg).height();
            let pad = this.conf.padding + (svgWidth / (2 * numLeafs - 1)) / 2;
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
            function isChildFn(targetLayer, targetNode) {
                return (layerIdx, nodeIdx) => {
                    let diff = targetLayer - layerIdx;
                    return diff >= 0 && Math.floor(targetNode / (Math.pow(2, diff))) == nodeIdx;
                };
            }
            let childCheck = (this.attnNode != undefined) ? isChildFn(this.attnNode[0], this.attnNode[1]) : () => false;
            function addEdge(svg, parent, child, cLayer, cIndex) {
                let pLayer = cLayer - 1;
                let pIndex = Math.floor(cIndex / 2);
                let highlight = (childCheck(pLayer, pIndex) && childCheck(cLayer, cIndex));
                let color = highlight ? "#0074D9" : "gray";
                let width = highlight ? hScale(itemSize / 3) : hScale(itemSize / 5);
                d3.select(svg)
                    .append("line")
                    .attr("id", "treeEdge")
                    .attr("x1", (d) => absX(parent.x + itemSize / 2))
                    .attr("x2", (d) => absX(child.x + itemSize / 2))
                    .attr("y1", (d) => absY(parent.y + itemSize / 2))
                    .attr("y2", (d) => absY(child.y + itemSize / 2))
                    .attr("stroke-width", width)
                    .attr("stroke", color);
            }
            this.tree.treeMap(this.nodeColor, this.leafColor);
            this.tree.treeMap((layerIdx, nodeIdx, node) => {
                addEdge(this.svg, node, node.left(), layerIdx + 1, 2 * nodeIdx);
                addEdge(this.svg, node, node.right(), layerIdx + 1, 2 * nodeIdx + 1);
            }, (layerIdx, leaf) => { });
            this.tree._treeMap(0, 0, (layerIdx, nodeIdx, node) => {
                d3.select(this.svg)
                    .append("circle")
                    .data([node])
                    .attr("id", "treeItem")
                    .attr("r", wScale(itemSize / 2))
                    .attr("cx", (d) => absX(d.x + itemSize / 2))
                    .attr("cy", (d) => absY(d.y + itemSize / 2))
                    .attr("fill", (d) => d.color)
                    .attr("stroke", (d) => childCheck(layerIdx, nodeIdx) ? "#0074D9" : "#000")
                    .attr("stroke-width", (d) => childCheck(layerIdx, nodeIdx) ? 3 : 1);
            }, (layerIdx, nodeIdx, leaf) => {
                d3.select(this.svg)
                    .append("circle")
                    .data([leaf])
                    .attr("id", "treeItem")
                    .attr("r", wScale(itemSize / 2))
                    .attr("cx", (d) => absX(d.x + itemSize / 2))
                    .attr("cy", (d) => absY(d.y + itemSize / 2))
                    .attr("fill", (d) => d.color)
                    .attr("stroke", (d) => childCheck(layerIdx, nodeIdx) ? "#0074D9" : "#000")
                    .attr("stroke-width", childCheck(layerIdx, nodeIdx) ? 3 : 1);
            });
        }
    }
    exports.SVGBinaryTree = SVGBinaryTree;
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
            this.hist = new histogram_1.SVGInteractiveHistogram("entHist", this.svgHist, this.model, conf);
            this.model.addListener(this);
        }
        refresh() {
            let svgHeight = $(this.div).height();
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
                let colors = this.conf.colors[this.hist.name];
                if (colors == undefined) {
                    colors = this.conf.colors["default"];
                }
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
            d.append("svg").attr("id", defaultIDs[1]);
            this.model = model;
            this.tree = new binarytree_1.SVGBinaryTree(this.svgTree, 0, conf);
            this.hist = new histogram_1.SVGHistogram("entHist", this.svgHist, this.model, conf);
            this.model.addListener(this);
        }
        refresh() {
            let svgHeight = $(this.div).height();
            let svgWidth = $(this.div).width();
            d3.select(this.svgHist).attr("height", svgHeight / 2).attr("width", svgWidth);
            d3.select(this.svgTree).attr("height", svgHeight / 2).attr("width", svgWidth);
            d3.select(this.svgTree).attr("style", "display: initial");
            let colors = this.conf.colors[this.hist.name];
            if (colors == undefined) {
                colors = this.conf.colors["default"];
            }
            let h = trees_2.TreeNode.huffTree(this.model, this.targetDepth);
            this.tree.setTree(h);
            let color = (layerIdx, nodeIdx, node) => {
                if (node.itemType) {
                    if (node.itemType[0] == "c") {
                        let c = d3.color(colors[Number.parseInt(node.itemType[1]) % colors.length]);
                        c.opacity = 0.3;
                        return c.toString();
                    }
                    else {
                        return colors[Number.parseInt(node.itemType) % colors.length];
                    }
                }
                else {
                    return "#000";
                }
            };
            this.tree.colorMap(color, color);
            this.hist.refresh();
        }
        requireDepth(n) {
            this.targetDepth = n;
            this.refresh();
        }
        unsetDepth() {
            delete this.targetDepth;
            this.refresh();
        }
    }
    exports.SVGEntropy = SVGEntropy;
    class SVGInteractiveEntropy extends SVGEntropy {
        constructor(divElement, model, conf) {
            super(divElement, model, conf);
            this.hist = new histogram_1.SVGInteractiveHistogram("entHist", this.svgHist, this.model, conf);
        }
    }
    exports.SVGInteractiveEntropy = SVGInteractiveEntropy;
    class SVGIndicatorEntropy extends SVGInteractiveEntropy {
        constructor(divElement, model, conf) {
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
            if (this.model.selectedBin() != -1) {
                let treeModel = this.tree.tree;
                let binModel = this.model;
                let total = binModel.bins().reduce((p, c) => c.length + p, 0);
                let prob = binModel.bins().map(v => v.length / total);
                let binLayers = [];
                let treeFn = (layerIdx, nodeIdx, node) => {
                    if (node.itemType != undefined && node.itemType[0] != "c") {
                        binLayers.push([Number.parseInt(node.itemType), layerIdx]);
                    }
                };
                treeModel.treeMap(treeFn, treeFn);
                let actual = prob.reduce((p, c) => p + (c * Math.log2(1 / c)), 0);
                let realized = binLayers.reduce((p, c) => p + prob[c[0]] * c[1], 0);
                let pad = this.conf.padding + (this.tree.width / (2 * this.tree.numLeafs - 1)) / 2;
                let wScale = d3.scaleLinear().domain([0, 100]).range([0, this.tree.viewBoxWidth]);
                let hScale = d3.scaleLinear().domain([0, 100]).range([0, this.tree.viewBoxHeight]);
                let r = this.tree.nodeRadius;
                function absX(relX) {
                    return pad + wScale(relX);
                }
                function absY(relY) {
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
    exports.SVGIndicatorEntropy = SVGIndicatorEntropy;
    class SVGInteractiveCrossEntropy {
        constructor(divElement, pModel, qModel, conf) {
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
            this.sourceEnt = new SVGInteractiveEntropy(this.divSourceEnt, this.sourceModel, conf);
            this.targetEnt = new SVGEntropy(this.divTargetEnt, this.targetModel, conf);
            this.sourceModel.addListener(this);
            this.targetModel.addListener(this);
        }
        refresh() {
            let selectedBin = this.sourceModel.selectedBin();
            if (selectedBin != -1) {
                let findInTree = function (selectedBin, tree) {
                    let layerIdx = -1;
                    let nodeIdx = -1;
                    let d = 0;
                    while (d < tree.depth() && layerIdx == -1) {
                        let layer = tree.layer(d);
                        layer.forEach((v, i) => {
                            if (v.itemType == selectedBin + "") {
                                layerIdx = d;
                                nodeIdx = i;
                            }
                        });
                        d += 1;
                    }
                    return [layerIdx, nodeIdx];
                };
                let inSource = findInTree(selectedBin, this.sourceEnt.tree.tree);
                let inTarget = findInTree(selectedBin, this.targetEnt.tree.tree);
                if (inSource[0] == -1 || inTarget[0] == -1) {
                    this.sourceEnt.refresh();
                    this.targetEnt.refresh();
                    return;
                }
                this.sourceEnt.tree.highlightNode(inSource[0], inSource[1]);
                this.targetEnt.tree.highlightNode(inTarget[0], inTarget[1]);
            }
            let sourceTree = trees_2.TreeNode.huffTree(this.sourceEnt.model);
            let targetTree = trees_2.TreeNode.huffTree(this.targetEnt.model);
            let d = Math.max(sourceTree.depth(), targetTree.depth());
            this.sourceEnt.requireDepth(d);
            this.targetEnt.requireDepth(d);
            this.sourceEnt.refresh();
            this.targetEnt.refresh();
        }
    }
    exports.SVGInteractiveCrossEntropy = SVGInteractiveCrossEntropy;
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
            let defaultIds = ["svgRowHist", "svgColHist"];
            this.svgRowHist = this.div + " > #" + defaultIds[0];
            this.svgColHist = this.div + " > #" + defaultIds[1];
            this.svgColOverlay = this.div + " > #" + defaultIds[1];
            let d = d3.select(this.div);
            d.append("svg").attr("id", defaultIds[0]);
            d.append("svg").attr("id", defaultIds[1]);
            this.model = model;
            this.rslice = new heatmap_2.UnnormalizedMatrixSlice(this.model, heatmap_2.Slice.ROWS);
            this.cslice = new heatmap_2.UnnormalizedMatrixSlice(this.model, heatmap_2.Slice.COLS);
            this.colslices = Array.from({ length: this.model.sideLength() }, (v, k) => new heatmap_2.UnnormalizedMatrixSlice(this.model, heatmap_2.Slice.COL, k));
            this.rowHist = new histogram_2.SVGInteractiveHistogram("rowHist", this.svgRowHist, this.rslice, this.conf);
            this.colHist = new histogram_2.SVGHistogram("colHist", this.svgColHist, this.cslice, this.conf);
            this.model.addListener(this);
        }
        refresh() {
            let svgHeight = $(this.div).height();
            let svgWidth = $(this.div).width();
            let sideLength = Math.min((1 / 2) * svgWidth, svgHeight);
            d3.select(this.svgRowHist).attr("width", sideLength).attr("height", sideLength);
            d3.select(this.svgColHist).attr("width", sideLength).attr("height", sideLength);
            this.rowHist.refresh();
            this.colHist.refresh();
            if (this.model.selectedCol() != -1) {
                let slice = this.colslices[this.model.selectedCol()];
                this.colOverlay = new histogram_2.SVGHistogram("colOverlay", this.svgColOverlay, slice, this.conf);
                this.colOverlay.refresh();
            }
        }
    }
    exports.SVGTransport = SVGTransport;
    class SVGTransportMatrix extends SVGTransport {
        constructor(divElement, model, conf) {
            super(divElement, model, conf);
            let defaultId = "svgHeatmap";
            this.svgHeatMap = this.div + " > #" + defaultId;
            d3.select(this.div)
                .insert("br", this.svgColHist);
            d3.select(this.div)
                .insert("svg", this.svgColHist)
                .attr("id", defaultId);
            d3.select(this.svgColHist)
                .attr("transform", "rotate(90.01)");
            this.heatmap = new heatmap_1.SVGHeatmap(this.svgHeatMap, this.model, this.conf);
        }
        refresh() {
            let svgHeight = $(this.div).height();
            let svgWidth = $(this.div).width();
            let boxHeight = Math.min(svgHeight / 2, svgWidth / 2);
            d3.select(this.svgRowHist).attr("width", boxHeight).attr("height", boxHeight);
            d3.select(this.svgHeatMap).attr("width", boxHeight).attr("height", boxHeight);
            d3.select(this.svgColHist).attr("width", boxHeight).attr("height", boxHeight);
            this.rowHist.refresh();
            this.colHist.refresh();
            this.heatmap.refresh();
            if (this.model.selectedCol() != -1) {
                let slice = this.colslices[this.model.selectedCol()];
                this.colOverlay = new histogram_2.SVGHistogram("colOverlay", this.svgColOverlay, slice, this.conf);
                this.colOverlay.refresh();
            }
        }
    }
    exports.SVGTransportMatrix = SVGTransportMatrix;
    class SVGIndicatorTransport extends SVGTransport {
        constructor(divElement, model, conf) {
            super(divElement, model, conf);
            let defaultId = "arrowBar";
            this.svgArrowBar = this.div + " > #" + defaultId;
            d3.select(this.div)
                .append("svg")
                .attr("id", defaultId);
            let defs = d3.select(this.svgArrowBar).append("defs");
            defs.append("marker")
                .attr("id", "arrow")
                .attr("viewBox", "0 -5, 10, 10")
                .attr("refX", 5)
                .attr("refY", 0)
                .attr("markerWidth", 4)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5");
        }
        refresh() {
            super.refresh();
            let svgWidth = $(this.div).width();
            let svgHeight = $(this.div).height();
            let height = svgHeight / 5;
            d3.select(this.svgArrowBar)
                .attr("width", svgWidth)
                .attr("height", height);
            if (this.rslice.selectedBin() != -1) {
                d3.select(this.svgArrowBar)
                    .selectAll(".arrowIndicator")
                    .remove();
                let width = this.colHist.viewBoxSideLength;
                let colxOffset = this.colHist.xOffset;
                let rowxOffset = this.rowHist.xOffset;
                let s = this.colHist.s;
                let pad = this.conf.padding;
                let arrowBar = this.svgArrowBar;
                let arrow = function (sBin, eBin) {
                    let wScale = d3.scaleLinear().domain([0, 100]).range([0, width]);
                    let start = colxOffset + wScale(s * sBin + 0.5 * s);
                    let end = width + 2 * pad + rowxOffset + wScale(s * eBin + 0.5 * s);
                    let p = `M${start},0  L ${start},20 L ${end},20 L ${end},5`;
                    d3.select(arrowBar)
                        .append("path")
                        .attr("d", p)
                        .attr("class", "arrowIndicator")
                        .attr("stroke", "#000")
                        .attr("stroke-width", 2)
                        .attr("fill", "none")
                        .attr("marker-end", "url(#arrow)");
                };
                let sBin = this.rslice.selectedBin();
                let slice = this.colslices[sBin];
                slice.bins().forEach((i) => i.length > 0 ? arrow(sBin, i[0].x) : "");
            }
        }
    }
    exports.SVGIndicatorTransport = SVGIndicatorTransport;
});
define("article", ["require", "exports", "d3", "jquery", "model/bins", "model/heatmap", "view/textbinder", "data", "view/histogram", "view/entropy", "view/transport", "model/model"], function (require, exports, d3, $, bins_3, heatmap_3, textbinder_1, data_1, histogram_3, entropy_1, transport_1, model_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    let colors = {
        "border": ["#505050",],
        "default": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7)),
        "rowHist": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7)),
        "colHist": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7)),
        "colOverlay": ["#000"]
    };
    const conf = new model_1.CONF(8, colors, 5);
    function main() {
        setupIntro();
    }
    exports.main = main;
    function setupIntro() {
        let cNames = [".maroon", ".red", ".orange", ".yellow", ".lime", ".green", ".blue", ".violet"];
        let colors = Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7));
        cNames.forEach((sel, i) => {
            d3.selectAll(".box" + sel)
                .append("rect")
                .attr("fill", colors[i])
                .attr("width", "100%")
                .attr("height", "100%");
        });
        let mLeft1 = bins_3.Histogram.fromArray(data_1.chisqr1["leftHistBins"]);
        let mRight1 = bins_3.Histogram.fromArray(data_1.chisqr1["rightHistBins"]);
        let hLeft1 = new histogram_3.SVGPhantomHistogram("chisqr-hist-1-left", "#chisqr-1-left-svg", mLeft1, mRight1, conf);
        let hRight1 = new histogram_3.SVGPhantomHistogram("chisqr-hist-1-right", "#chisqr-1-right-svg", mRight1, mLeft1, conf);
        hLeft1.refresh();
        hRight1.refresh();
        let chisqrval = new textbinder_1.LooseTextBinder("#chisqr-1-val", [mLeft1, mRight1], function (m) {
            let test = (a, b) => { return Math.pow((a - b), 2) / b; };
            let c = Array.from({ length: m[0].numBins() }, (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                .reduce((prev, cur) => prev + cur, 0);
            return "" + Math.round(c * 100) / 100;
        });
        mLeft1.addListener(chisqrval);
        let mLeft2 = bins_3.Histogram.fromArray(data_1.chisqr2["leftHistBins"]);
        let mCenter2 = bins_3.Histogram.fromArray(data_1.chisqr2["centerHistBins"]);
        let mRight2 = bins_3.Histogram.fromArray(data_1.chisqr2["rightHistBins"]);
        let hLeft2 = new histogram_3.SVGPhantomHistogram("chisqr-hist-2-left", "#chisqr-2-left-svg", mLeft2, mCenter2, conf);
        let hCenter2 = new histogram_3.SVGHistogram("chisqr-hist-2-center", "#chisqr-2-center-svg", mCenter2, conf);
        let hRight2 = new histogram_3.SVGPhantomHistogram("chisqr-hist-2-right", "#chisqr-2-right-svg", mRight2, mCenter2, conf);
        hLeft2.refresh();
        hCenter2.refresh();
        hRight2.refresh();
        let chisqrvalL = new textbinder_1.LooseTextBinder("#chisqr-2-left-val", [mLeft2, mCenter2], function (m) {
            let test = (a, b) => { return Math.pow((a - b), 2) / b; };
            let c = Array.from({ length: m[0].numBins() }, (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                .reduce((prev, cur) => prev + cur, 0);
            return "" + Math.round(c * 100) / 100;
        });
        let chisqrvalR = new textbinder_1.LooseTextBinder("#chisqr-2-right-val", [mRight2, mCenter2], function (m) {
            let test = (a, b) => { return Math.pow((a - b), 2) / b; };
            let c = Array.from({ length: m[0].numBins() }, (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                .reduce((prev, cur) => prev + cur, 0);
            return "" + Math.round(c * 100) / 100;
        });
        mLeft2.addListener(chisqrvalL);
        mRight2.addListener(chisqrvalR);
        let mSimpleHist = bins_3.Histogram.fromArray(data_1.simpleHist["hist"]);
        let hSimpleHist = new histogram_3.SVGHistogram("simple-entropy-ex", "#simple-entropy-ex", mSimpleHist, conf);
        let mLowEnt = bins_3.Histogram.fromArray(data_1.entropyExs["lowEntropy"]);
        let mMedEnt = bins_3.Histogram.fromArray(data_1.entropyExs["medEntropy"]);
        let mHighEnt = bins_3.Histogram.fromArray(data_1.entropyExs["highEntropy"]);
        let hLowEnt = new histogram_3.SVGHistogram("entropy-ex", "#entropy-ex-active", mLowEnt, conf);
        let hMedEnt = new histogram_3.SVGHistogram("entropy-ex", "#entropy-ex-active", mMedEnt, conf);
        let hHighEnt = new histogram_3.SVGHistogram("entropy-ex", "#entropy-ex-active", mHighEnt, conf);
        let tLowEnt = new textbinder_1.TextBinder("#entropy-ex-val", mLowEnt, function (m) {
            let total = m.bins().reduce((p, c) => c.length + p, 0);
            let nats = (a) => Math.log2(total / a);
            let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
            return "" + Math.round(entropy * 100) / 100;
        });
        tLowEnt.refresh();
        let tMedEnt = new textbinder_1.TextBinder("#entropy-ex-val", mMedEnt, function (m) {
            let total = m.bins().reduce((p, c) => c.length + p, 0);
            let nats = (a) => Math.log2(total / a);
            let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
            return "" + Math.round(entropy * 100) / 100;
        });
        tMedEnt.refresh();
        let tHighEnt = new textbinder_1.TextBinder("#entropy-ex-val", mHighEnt, function (m) {
            let total = m.bins().reduce((p, c) => c.length + p, 0);
            let nats = (a) => Math.log2(total / a);
            let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
            return "" + Math.round(entropy * 100) / 100;
        });
        tHighEnt.refresh();
        let mActiveEnt = mMedEnt;
        $("#entropy-ex-low").click(() => { mActiveEnt = mLowEnt; mLowEnt.refresh(); });
        $("#entropy-ex-med").click(() => { mActiveEnt = mMedEnt; mMedEnt.refresh(); });
        $("#entropy-ex-high").click(() => { mActiveEnt = mHighEnt; mHighEnt.refresh(); });
        let mInteractiveEnt = bins_3.Histogram.full(8, 1);
        let interactiveEnt = new entropy_1.SVGInteractiveEntropy("#entropy-ex-interactive", mInteractiveEnt, conf);
        interactiveEnt.refresh();
        document.addEventListener("keydown", event => {
            switch (event.key.toLowerCase()) {
                case ("h"):
                    interactiveEnt.hist.selectCol(mInteractiveEnt.selectedBin() - 1);
                    break;
                case ("l"):
                    interactiveEnt.hist.selectCol(mInteractiveEnt.selectedBin() + 1);
                    break;
                case ("k"):
                    interactiveEnt.hist.incrSelectedBin();
                    break;
                case ("j"):
                    interactiveEnt.hist.decrSelectedBin();
                    break;
            }
        });
        let qModel = bins_3.Histogram.fromArray(data_1.xEntropyExs["q"]);
        let pModel = bins_3.Histogram.full(8, 1);
        let interactiveXEnt = new entropy_1.SVGInteractiveCrossEntropy("#xentropy-ex-interactive", pModel, qModel, conf);
        interactiveXEnt.refresh();
        let relEnt = new textbinder_1.LooseTextBinder("#kl-ex-val", [pModel, qModel], function (m) {
            let p = m[0];
            let q = m[1];
            let totalP = p.bins().reduce((prev, c) => c.length + prev, 0);
            let totalQ = q.bins().reduce((prev, c) => c.length + prev, 0);
            let natsP = (a) => Math.log2(totalP / a);
            let natsQ = (a) => Math.log2(totalQ / a);
            let kl = p.bins().reduce((prev, c, i) => (c.length / totalP) * (natsQ(q.getBin(i).length) - natsP(c.length)) + prev, 0);
            return "" + Math.round(kl * 100) / 100;
        });
        relEnt.refresh();
        document.addEventListener("keydown", event => {
            switch (event.key.toLowerCase()) {
                case ("h"):
                    interactiveXEnt.sourceEnt.hist.selectCol(pModel.selectedBin() - 1);
                    relEnt.refresh();
                    break;
                case ("l"):
                    interactiveXEnt.sourceEnt.hist.selectCol(pModel.selectedBin() + 1);
                    relEnt.refresh();
                    break;
                case ("k"):
                    interactiveXEnt.sourceEnt.hist.incrSelectedBin();
                    relEnt.refresh();
                    break;
                case ("j"):
                    interactiveXEnt.sourceEnt.hist.decrSelectedBin();
                    relEnt.refresh();
                    break;
            }
        });
        let transportMatrix = heatmap_3.HeatMap.fromCSVStr(data_1.transportEx["matrix"]);
        let interactiveTransport = new transport_1.SVGIndicatorTransport("#transport-ex-interactive", transportMatrix, conf);
        interactiveTransport.refresh();
        let interactiveTransportMatrix = new transport_1.SVGTransportMatrix("#transport-matrix-ex-interactive", transportMatrix, conf);
        interactiveTransportMatrix.refresh();
        let optTransportMatrix = heatmap_3.HeatMap.fromCSVStr(data_1.transportEx["opt_matrix"]);
        let optInterativeTransportMatrix = new transport_1.SVGTransportMatrix("#opt-transport-matrix-ex-interactive", optTransportMatrix, conf);
        optInterativeTransportMatrix.refresh();
    }
    main();
});
define("main", ["require", "exports", "view/binarytree", "view/histogram", "view/entropy", "view/transport", "view/heatmap", "model/bins", "model/heatmap", "d3", "model/model"], function (require, exports, tree, hist, ent, transport, hm, histModel, matModel, d3, model) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function main() {
        let colors = {
            "border": ["#505050",],
            "default": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7)),
            "rowHist": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7)),
            "colHist": Array.from({ length: 8 }, (v, k) => d3.interpolateSpectral(k / 7)),
            "colOverlay": ["#000"]
        };
        let conf = new model.CONF(8, colors, 5);
        let m = new histModel.Histogram(8);
        let vt = new tree.SVGBinaryTree("#treesvg", 4, conf);
        vt.setDepth(6);
        let i = 0;
        setInterval(() => { vt.setDepth((i++ % 6) + 1); }, 500);
        m.setAll(1);
        let v = new hist.SVGInteractiveHistogram("v", "#svg", m, conf);
        let both = new ent.SVGEntropy("#plain-entropy0", m, conf);
        window.addEventListener("resize", () => { m.refresh(); });
        let mat = matModel.HeatMap.fromCSVStr('0,0,0,0,0,0,0,0\n0,2,0,0,0,0,0,1\n0,0,3,0,0,6,2,3\n0,1,0,0,0,0,0,0\n2,0,5,0,0,0,0,1\n2,7,6,1,0,1,0,0\n0,8,4,0,1,2,0,0\n1,3,0,1,1,0,2,1');
        let svgHm = new hm.SVGHeatmap("#hmsvg", mat, conf);
        svgHm.refresh();
        let matSlice = new matModel.MatrixSlice(mat, matModel.Slice.ROWS);
        let svgMatSlice = new hist.SVGInteractiveHistogram("matSlice", "#hmslicesvg", matSlice, conf);
        svgMatSlice.refresh();
        let svgTransportMatrix = new transport.SVGTransportMatrix("#plain-transport0", mat, conf);
        svgTransportMatrix.refresh();
        let svgTransport = new transport.SVGIndicatorTransport("#plain-transport1", mat, conf);
        svgTransport.refresh();
        document.addEventListener("keydown", event => {
            switch (event.key.toLowerCase()) {
                case ("h"):
                    v.selectCol(m.selectedBin() - 1);
                    break;
                case ("l"):
                    v.selectCol(m.selectedBin() + 1);
                    break;
                case ("k"):
                    v.incrSelectedBin();
                    break;
                case ("j"):
                    v.decrSelectedBin();
                    break;
            }
        });
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
        let phantom = new histModel.Histogram(8);
        phantom.setAll(2);
        let phanthist = new hist.SVGPhantomHistogram("phist", "#phantomhist", m, phantom, conf);
        phanthist.refresh();
    }
    exports.main = main;
    main();
});
//# sourceMappingURL=bundle.js.map