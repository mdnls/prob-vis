import model = require("model");
import view = require("view");
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
        "histogram": Array.from(d3.schemeSpectral[11])
    }
    let conf: CONF = new CONF(8, colors, 5);
    let m = new model.Histogram(11);

    let vt = new view.SVGBinaryTree("#treesvg", 4, conf);
    vt.setDepth(6);

    let i = 0;
    setInterval(() => {vt.setDepth((i++ % 6) + 1)}, 500);

    m.setAll(1);

    let v = new view.SVGHistogram("#svg", m, conf);

    let both = new view.SVGEntropy("#plain-entropy0", m, conf);

    window.addEventListener("resize", () =>  { m.refresh(); } );
    $("#plain-entropy0 > .addItem").click(() => v.incrSelectedBin());
    $("#plain-entropy0 > .rmItem").click(() => v.decrSelectedBin());

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
    // TODO: currently, low entropy distributions with many items allocate extra nodes (1 per item) when fewer should be allocated
    // potentially the fix is to divide the number of items by the # in bin with the fewest items as normalization
    // but this would require changing the array which contains colors to match.
    // TODO: the color generation has to use a huffman tree
}
main();