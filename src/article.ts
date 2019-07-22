import * as d3 from "d3";
import * as $ from "jquery";
import { Histogram } from "./model/bins";
import { HeatMap } from "./model/heatmap";
import { TextBinder, LooseTextBinder } from "./view/textbinder";
import { chisqr1, chisqr2, entropyExs, xEntropyExs, transportEx } from "./data";
import { SVGPhantomHistogram, SVGHistogram } from "./view/histogram";
import { SVGIndicatorEntropy, SVGInteractiveCrossEntropy } from "./view/entropy";
import { SVGIndicatorTransport, SVGTransportMatrix } from "./view/transport";
import { CONF } from "./model/model";
// This script controls all of the animations in the article


let colors = {
    "border": ["#505050",],
    "default": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "rowHist": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "colHist": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "colOverlay": ["#000"]
}
const conf: CONF = new CONF(8, colors, 5);

export function main() {
    setupIntro();
}

function setupIntro() {
    // Setup boxes
    let cNames = [".maroon", ".red", ".orange", ".yellow", ".lime", ".green", ".blue", ".violet"]
    let colors = Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7));
    cNames.forEach( (sel: string, i: number) => {
        d3.selectAll(".box" + sel)
          .append("rect")
          .attr("fill", colors[i])
          .attr("width", "100%")
          .attr("height", "100%");
    });


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
    tLowEnt.refresh();

    let tMedEnt = new TextBinder<Histogram>("#entropy-ex-val", mMedEnt, function (m: Histogram) { 
        let total = m.bins().reduce((p, c) => c.length + p, 0);
        let nats = (a: number) => Math.log2(total / a);
        let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
        return "" + Math.round(entropy * 100) / 100;
    });
    tMedEnt.refresh();

    let tHighEnt = new TextBinder<Histogram>("#entropy-ex-val", mHighEnt, function (m: Histogram) { 
        let total = m.bins().reduce((p, c) => c.length + p, 0);
        let nats = (a: number) => Math.log2(total / a);
        let entropy = m.bins().reduce((p, c) => (c.length / total) * nats(c.length) + p, 0);
        return "" + Math.round(entropy * 100) / 100;
    });
    tHighEnt.refresh();

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

    let relEnt = new LooseTextBinder<Histogram[]>("#kl-ex-val", [pModel, qModel], function (m: Histogram[]) {
        let p = m[0];
        let q = m[1];
        let totalP = p.bins().reduce((prev, c) => c.length + prev, 0);
        let totalQ = q.bins().reduce((prev, c) => c.length + prev, 0);
        let natsP = (a: number) => Math.log2(totalP / a);
        let natsQ = (a: number) => Math.log2(totalQ / a);
        let kl = p.bins().reduce((prev, c, i) => (c.length / totalP) * (natsQ(q.getBin(i).length) - natsP(c.length)) + prev, 0);
        return "" + Math.round(kl * 100) / 100;
    });
    relEnt.refresh();

    // Transport diagram with arrows
    let transportMatrix = HeatMap.fromCSVStr(transportEx["matrix"]);
    let interactiveTransport = new SVGIndicatorTransport("#transport-ex-interactive", transportMatrix, conf);
    interactiveTransport.refresh();

    let interactiveTransportMatrix = new SVGTransportMatrix("#transport-matrix-ex-interactive", transportMatrix, conf);
    interactiveTransportMatrix.refresh();


}   

main();