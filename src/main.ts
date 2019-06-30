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
    let conf: CONF = new CONF(15, colors, 30);
    let m = new model.Histogram(6);

    m.addItem(0);
    m.addItem(0);
    m.addItem(0);
    m.addItem(1);
    m.addItem(2);
    m.addItem(2);
    m.addItem(4);

    let v = new view.SVGHistogram("#svg", m, conf);
    window.addEventListener("resize", () =>  { m.refresh(); } );
}
main();