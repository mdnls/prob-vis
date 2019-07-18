import * as d3 from "d3";
import * as $ from "jquery";
import { Histogram } from "./model/bins";
import { TextBinder, LooseTextBinder } from "./view/textbinder";
import { chisqr1, chisqr2, entropyExs, xEntropyExs } from "./data";
import { SVGPhantomHistogram, SVGHistogram } from "./view/histogram";
import { SVGIndicatorEntropy, SVGInteractiveCrossEntropy } from "./view/entropy";
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

    let chisqrval = new LooseTextBinder<Histogram[]>("#chisqr-1-val", [mLeft1, mRight1], function (m: Histogram[]) { 
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
    let hCenter2 = new SVGHistogram("chisqr-hist-2-center", "#chisqr-2-center-svg", mCenter2, conf);
    let hRight2 = new SVGPhantomHistogram("chisqr-hist-2-right", "#chisqr-2-right-svg", mRight2, mCenter2, conf);
    hLeft2.refresh();
    hCenter2.refresh();
    hRight2.refresh();

    let chisqrvalL = new LooseTextBinder<Histogram[]>("#chisqr-2-left-val", [mLeft2, mCenter2], function (m: Histogram[]) { 
        let test = (a: number, b: number) => { return Math.pow((a-b), 2) / b };
        let c = Array.from({length: m[0].numBins()},
                        (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                    .reduce((prev, cur) => prev + cur, 0)
        return "" + Math.round(c * 100) / 100;
    });

    let chisqrvalR = new LooseTextBinder<Histogram[]>("#chisqr-2-right-val", [mRight2, mCenter2], function (m: Histogram[]) { 
        let test = (a: number, b: number) => { return Math.pow((a-b), 2) / b };
        let c = Array.from({length: m[0].numBins()},
                        (v, k) => test(m[0].getBin(k).length, m[1].getBin(k).length))
                    .reduce((prev, cur) => prev + cur, 0);
        return "" + Math.round(c * 100) / 100;
    });
    mLeft2.addListener(chisqrvalL);
    mRight2.addListener(chisqrvalR);

    // Entropy example distributions
    let mLowEnt = Histogram.fromArray(entropyExs["lowEntropy"]);
    let mMedEnt = Histogram.fromArray(entropyExs["medEntropy"]);
    let mHighEnt = Histogram.fromArray(entropyExs["highEntropy"]);

    let hLowEnt = new SVGHistogram("entropy-ex", "#entropy-ex-active", mLowEnt, conf);
    let hMedEnt = new SVGHistogram("entropy-ex", "#entropy-ex-active", mMedEnt, conf);
    let hHighEnt = new SVGHistogram("entropy-ex", "#entropy-ex-active", mHighEnt, conf);

    let tLowEnt = new TextBinder<Histogram>("#entropy-ex-val", mLowEnt, function (m: Histogram) { 
        let total = m.bins().reduce((p, c) => c.length + p, 0);
        let nats = (a: number) => Math.log2(total / a);
        let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
        return "" + Math.round(entropy * 100) / 100;
    });

    let tMedEnt = new TextBinder<Histogram>("#entropy-ex-val", mMedEnt, function (m: Histogram) { 
        let total = m.bins().reduce((p, c) => c.length + p, 0);
        let nats = (a: number) => Math.log2(total / a);
        let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
        return "" + Math.round(entropy * 100) / 100;
    });

    let tHighEnt = new TextBinder<Histogram>("#entropy-ex-val", mHighEnt, function (m: Histogram) { 
        let total = m.bins().reduce((p, c) => c.length + p, 0);
        let nats = (a: number) => Math.log2(total / a);
        let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
        return "" + Math.round(entropy * 100) / 100;
    });

    let mActiveEnt = mMedEnt; // used to track the active histogram on window resize
    $("#entropy-ex-low").click(() => {mActiveEnt = mLowEnt; mLowEnt.refresh()});
    $("#entropy-ex-med").click(() => {mActiveEnt = mMedEnt; mMedEnt.refresh()});
    $("#entropy-ex-high").click(() => {mActiveEnt = mHighEnt; mHighEnt.refresh()});

    // Interactive entropy diagram
    let mInteractiveEnt = Histogram.full(8, 1);
    let interactiveEnt = new SVGIndicatorEntropy("#entropy-ex-interactive", mInteractiveEnt, conf);
    interactiveEnt.refresh();

    document.addEventListener("keydown", event => {
        switch(event.key.toLowerCase()) {
            case("h"):
                interactiveEnt.hist.selectCol(mInteractiveEnt.selectedBin() - 1);
                break;
            case("l"):
                interactiveEnt.hist.selectCol(mInteractiveEnt.selectedBin() + 1);
                break;
            case("k"):
                interactiveEnt.hist.incrSelectedBin();
                break;
            case("j"):
                interactiveEnt.hist.decrSelectedBin();
                break;
        }
    });

    // Interactive cross entropy diagram
    let qModel = Histogram.fromArray(xEntropyExs["q"]);
    let pModel = Histogram.full(8, 1);
    let interactiveXEnt = new SVGInteractiveCrossEntropy("#xentropy-ex-interactive", pModel, qModel, conf);
    interactiveXEnt.refresh();
}  

main();