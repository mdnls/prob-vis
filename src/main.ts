import model = require("model");
import view = require("view");

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
        "border": ["#505050",]
    }
    let conf: CONF = new CONF(7, colors, 5);
    let m = new model.Histogram(15);

    let vt = new view.SVGBinaryTree("#treesvg", 4, conf);
    vt.setDepth(6);

    let i = 0;
    setInterval(() => {vt.setDepth((i++ % 6) + 1)}, 500);

    m.addItem(0);
    m.addItem(0);
    m.addItem(0);
    m.addItem(1);
    m.addItem(2);
    m.addItem(2);
    m.addItem(4);

    let v = new view.SVGHistogram("#svg", m, conf);

    let both = new view.SVGEntropy("#plain-entropy0", m, conf);

    window.addEventListener("resize", () =>  { m.refresh(); vt.refresh(); } );
    $("#plain-histogram0 > .addItem").click(() => v.incrSelectedBin());
    $("#plain-histogram0 > .rmItem").click(() => v.decrSelectedBin())
}
main();