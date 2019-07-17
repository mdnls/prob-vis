import tree = require("view/binarytree");
import hist = require("view/histogram");
import ent = require("view/entropy");
import transport = require("view/transport");
import hm = require("view/heatmap");
import histModel = require("model/bins");
import matModel = require("./model/heatmap");
import d3 = require("d3");
import model = require("./model/model");

export function main() {
    let colors = {
        "border": ["#505050",],
        "default": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
        "rowHist": Array.from({length: 1}, (v, k) => d3.interpolateBlues(0.5)),
        "colHist": Array.from({length: 1}, (v, k) => d3.interpolateBlues(0.5)),
        "colOverlay": Array.from({length: 1}, (v, k) => d3.interpolateReds(0.7))
    }
    let conf: model.CONF = new model.CONF(8, colors, 5);
    let m = new histModel.Histogram(8);

    let vt = new tree.SVGBinaryTree("#treesvg", 4, conf);
    vt.setDepth(6);

    let i = 0;
    setInterval(() => {vt.setDepth((i++ % 6) + 1)}, 500);

    m.setAll(1);

    let v = new hist.SVGInteractiveHistogram("v", "#svg", m, conf);

    let both = new ent.SVGEntropy("#plain-entropy0", m, conf);

    window.addEventListener("resize", () =>  { m.refresh(); } );

    let mat = matModel.HeatMap.fromCSVStr('0,0,0,1,2,2,0,2,2,4,0,2,1,0,0\n1,0,0,1,0,1,2,1,2,0,0,1,0,0,0\n1,1,0,0,1,3,2,8,2,6,5,3,1,0,1\n3,1,4,4,7,3,11,8,7,4,4,5,2,0,0\n0,2,2,3,3,8,6,11,14,5,6,6,3,0,1\n0,3,1,6,8,8,20,12,14,18,8,6,7,5,4\n4,2,4,6,5,12,14,21,24,21,3,3,1,1,2\n2,0,6,11,11,11,16,14,17,13,13,6,3,0,2\n2,5,4,6,14,19,19,16,9,15,4,7,6,3,2\n0,1,7,3,8,7,21,12,13,14,8,7,7,0,1\n0,1,1,5,6,9,10,9,13,11,4,4,1,2,3\n0,1,0,3,5,7,8,7,3,3,4,6,3,1,1\n0,1,5,0,1,3,8,4,4,5,5,1,0,0,0\n0,0,0,2,2,2,4,4,2,1,1,0,0,1,0\n0,0,0,0,1,2,1,1,1,2,2,2,0,0,1');
    let svgHm = new hm.SVGHeatmap("#hmsvg", mat, conf);
    svgHm.refresh();

    let matSlice = new matModel.MatrixSlice(mat, matModel.Slice.ROWS);
    let svgMatSlice = new hist.SVGInteractiveHistogram("matSlice", "#hmslicesvg", matSlice, conf);
    svgMatSlice.refresh();

    let svgTransport = new transport.SVGTransport("#plain-transport0", mat, conf);
    svgTransport.refresh();

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
    document.addEventListener("keydown", event => {
        switch(event.key.toLowerCase()) {
            case("h"):
                svgMatSlice.selectCol(matSlice.selectedBin() - 1);
                break;
            case("l"):
                svgMatSlice.selectCol(matSlice.selectedBin() + 1);
                break;
            case("k"):
                //v.incrSelectedBin();
                break;
            case("j"):
                //v.decrSelectedBin();
                break;
        }
    });

    
    let phantom = new histModel.Histogram(8);
    phantom.setAll(2);

    let phanthist = new hist.SVGPhantomHistogram("phist", "#phantomhist", m, phantom, conf);
    phanthist.refresh();
}
main();