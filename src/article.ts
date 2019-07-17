import * as d3 from "d3";
import * as $ from "jquery";
import { Histogram } from "./model/bins";
import { TextBinder } from "./view/textbinder";
import { chisqr1, chisqr2 } from "./data";
import { SVGPhantomHistogram, SVGStaticHistogram } from "./view/histogram";
import { CONF } from "./model/model";
// This script controls all of the animations in the article


let colors = {
    "border": ["#505050",],
    "default": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "rowHist": Array.from({length: 1}, (v, k) => d3.interpolateBlues(0.5)),
    "colHist": Array.from({length: 1}, (v, k) => d3.interpolateBlues(0.5)),
    "colOverlay": Array.from({length: 1}, (v, k) => d3.interpolateReds(0.7))
}
const conf: CONF = new CONF(8, colors, 5);

export function main() {
    setupIntro();
}

function setupIntro() {

    // Chi Squared Histogram 1
    let mLeft1 = Histogram.fromArray(chisqr1["leftHistBins"]);
    let mRight1 = Histogram.fromArray(chisqr1["rightHistBins"]);
    let hLeft1 = new SVGPhantomHistogram("chisqr-hist-1-left", "#chisqr-1-left-svg", mLeft1, mRight1, conf);
    let hRight1 = new SVGPhantomHistogram("chisqr-hist-1-right", "#chisqr-1-right-svg", mRight1, mLeft1, conf);
    hLeft1.refresh();
    hRight1.refresh();

    let chisqrval = new TextBinder<Histogram[]>("#chisqr-1-val", [mLeft1, mRight1], function (m: Histogram[]) { 
        let test = (a: number, b: number) => { return Math.pow((a-b), 2) / b };
        let c = Array.from({length: m[0].numBins()},
                        (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                    .reduce((prev, cur) => prev + cur, 0)
        return "" + Math.round(c * 100) / 100;
    });
    mLeft1.addListener(chisqrval);

    // Chi Squared Histogram 2
    let mLeft2 = Histogram.fromArray(chisqr2["leftHistBins"]);
    let mCenter2 = Histogram.fromArray(chisqr2["centerHistBins"]);
    let mRight2 = Histogram.fromArray(chisqr2["rightHistBins"]);
    let hLeft2 = new SVGPhantomHistogram("chisqr-hist-2-left", "#chisqr-2-left-svg", mLeft2, mCenter2, conf);
    let hCenter2 = new SVGStaticHistogram("chisqr-hist-2-center", "#chisqr-2-center-svg", mCenter2, conf);
    let hRight2 = new SVGPhantomHistogram("chisqr-hist-2-right", "#chisqr-2-right-svg", mRight2, mCenter2, conf);
    hLeft2.refresh();
    hCenter2.refresh();
    hRight2.refresh();

    let chisqrvalL = new TextBinder<Histogram[]>("#chisqr-2-left-val", [mLeft2, mCenter2], function (m: Histogram[]) { 
        let test = (a: number, b: number) => { return Math.pow((a-b), 2) / b };
        let c = Array.from({length: m[0].numBins()},
                        (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                    .reduce((prev, cur) => prev + cur, 0)
        return "" + Math.round(c * 100) / 100;
    });

    let chisqrvalR = new TextBinder<Histogram[]>("#chisqr-2-right-val", [mRight2, mCenter2], function (m: Histogram[]) { 
        let test = (a: number, b: number) => { return Math.pow((a-b), 2) / b };
        let c = Array.from({length: m[0].numBins()},
                        (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                    .reduce((prev, cur) => prev + cur, 0);
        return "" + Math.round(c * 100) / 100;
    });
    mLeft2.addListener(chisqrvalL);
    mRight2.addListener(chisqrvalR);

}  

main();