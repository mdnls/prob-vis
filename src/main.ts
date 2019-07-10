import tree = require("view/binarytree");
import histModel = require("model/bins");
import hist = require("view/histogram");
import ent = require("view/entropy");
import d3 = require("d3");

export class CONF {
    public gridBoxSize: number;
    // given at item type string, this dictionary gives the main and accent color for that item.
    colors: { [index: string]: string[] };
    padding: number;

    constructor(gridBoxSize: number, colors: { [index: string]: string[]}, padding: number) {
        this.gridBoxSize = gridBoxSize;
        this.colors = colors;
        this.padding = padding;
    }
}

export function main() {
    let colors = {
        "default": ["#000", "#202020"],
        "border": ["#505050",],
        "histogram": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7))
    }
    let conf: CONF = new CONF(8, colors, 30);
    let m = new histModel.Histogram(8);

    let vt = new tree.SVGBinaryTree("#treesvg", 4, conf);
    vt.setDepth(6);

    let i = 0;
    setInterval(() => {vt.setDepth((i++ % 6) + 1)}, 500);

    m.setAll(1);

    let v = new hist.SVGHistogram("#svg", m, conf);

    let both = new ent.SVGEntropy("#plain-entropy0", m, conf);

    window.addEventListener("resize", () =>  { m.refresh(); } );

    document.addEventListener("keydown", event => {
        switch(event.key.toLowerCase()) {
            case("h"):
                v.selectCol(m.selectedBin() - 1);
                break;
            case("l"):
                v.selectCol(m.selectedBin() + 1);
                break;
            case("k"):
                v.incrSelectedBin();
                break;
            case("j"):
                v.decrSelectedBin();
                break;
        }
    });
}
main();