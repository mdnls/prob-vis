import tree = require("view/binarytree");
import hist = require("view/histogram");
import ent = require("view/entropy");
import hm = require("view/heatmap");
import histModel = require("model/bins");
import matModel = require("./model/heatmap");
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

    let v = new hist.SVGInteractiveHistogram("#svg", m, conf);

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

    let mat = matModel.HeatMap.fromCSVStr('0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n0,0,0,1,0,1,0,1,0,0,1,0,1,0,0\n5,0,4,2,4,5,9,6,6,7,4,4,5,1,4\n24,10,15,20,16,15,20,20,23,11,25,14,18,9,18\n52,10,18,17,29,28,32,28,24,26,24,22,9,18,41\n22,7,11,19,11,22,20,16,16,17,18,9,8,11,17\n7,3,2,3,3,3,6,3,7,6,6,4,0,4,6\n0,0,0,0,2,1,0,0,0,1,1,0,0,0,0\n0,0,0,0,0,0,0,0,0,1,0,0,0,0,0\n0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n0,0,0,0,0,0,0,0,0,0,0,0,0,0,0');
    let svgHm = new hm.SVGHeatmap("#hmsvg", mat, conf);
    svgHm.refresh();

    let matSlice = new matModel.MatrixSlice(mat, matModel.Slice.COL, 7);
    let svgMatSlice = new hist.SVGInteractiveHistogram("#hmslicesvg", matSlice, conf);
    svgMatSlice.refresh();

}
main();