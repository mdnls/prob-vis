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
        "rowHist": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
        "colHist": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
        "colOverlay": ["#000"]
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