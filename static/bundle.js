define("view", ["require", "exports", "d3", "jquery"], function (require, exports, d3, $) {
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
            this.refresh();
        }
        refresh() {
            let s = this.conf.gridBoxSize;
            let pad = 0.2 * s;
            let svgWidth = $(this.svg).width();
            let svgHeight = $(this.svg).height();
            let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
            let xOffset = (svgWidth - viewBoxSideLength) / 2;
            let yOffset = (svgHeight - viewBoxSideLength) / 2;
            let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);
            function absX(relX) {
                return xOffset + pad + scale(relX);
            }
            function absY(relY) {
                return svgHeight - yOffset - pad - scale(relY);
            }
            d3.select(this.svg)
                .selectAll(".bottomBorder")
                .attr("x", absX(0) - pad)
                .attr("y", absY(0) + pad)
                .attr("height", pad)
                .attr("width", viewBoxSideLength + 2 * pad)
                .attr("fill", this.conf.colors["border"][0]);
            var allItems = [].concat(...Array.from({ length: this.model.numBins() }, (value, key) => this.model.bins(key)));
            d3.select(this.svg)
                .selectAll("rect")
                .data(allItems)
                .enter()
                .append("rect");
            d3.select(this.svg)
                .selectAll("rect")
                .data(allItems)
                .attr("width", scale(s * 0.85))
                .attr("height", scale(s * 0.85))
                .attr("x", (d) => absX(d.x * s))
                .attr("y", (d) => absY((d.y + 1) * s))
                .attr("fill", (d) => d3.schemePaired[2 * (d.x % 6)])
                .attr("stroke", (d) => d3.schemePaired[2 * (d.x % 6) + 1]);
        }
    }
    exports.SVGHistogram = SVGHistogram;
});
define("model", ["require", "exports"], function (require, exports) {
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
        let conf = new CONF(15, colors, 30);
        let m = new model.Histogram(6);
        m.addItem(0);
        m.addItem(0);
        m.addItem(0);
        m.addItem(1);
        m.addItem(2);
        m.addItem(2);
        m.addItem(4);
        let v = new view.SVGHistogram("#svg", m, conf);
        window.addEventListener("resize", () => { m.refresh(); });
    }
    exports.main = main;
    main();
});
//# sourceMappingURL=bundle.js.map