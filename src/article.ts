import * as d3 from "d3";
import * as $ from "jquery";
import { Histogram } from "./model/bins";
import { HeatMap } from "./model/heatmap";
import { TextBinder, LooseTextBinder } from "./view/textbinder";
import { chisqr1, chisqr2, entropyExs, xEntropyExs, transportEx, simpleHist, optimizers } from "./data";
import { SVGPhantomHistogram, SVGHistogram } from "./view/histogram";
import { SVGInteractiveEntropy, SVGInteractiveCrossEntropy } from "./view/entropy";
import { SVGIndicatorTransport, SVGTransportMatrix } from "./view/transport";
import { SVGAnimatedGaussian, SVGAnimatedPoints } from "./view/gaussian"
import { CONF, Model } from "./model/model";
import { Gaussian2D, Line2D } from "./model/gaussian";
import { SVGLabeledBinaryTree, SVGBinaryTree } from "./view/binarytree";
// This script controls all of the animations in the article


let colors = {
    "border": ["#505050",],
    "default": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "rowHist": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "colHist": Array.from({length: 8}, (v, k) => d3.interpolateSpectral(k/7)),
    "colOverlay": ["#000"],
    "wgan-manifold": ["rgb(158, 1, 66)"],
    "gan-manifold": ["rgb(75, 160, 177)"]
}

let attnHash: {[id: string] : (key: string) => any} = {};

let attn: (key: string) => any = undefined;

const conf: CONF = new CONF(8, colors, 5);

export function main() {
    setupIntro();
}

/**
 * Give attention to a particular dom element.
 * @param id a dom element which has attention
 */
function setAttn(id: string) {
    attn = attnHash[id];
}
/**
 * Register a dom element as a potential selectable item. Associate with it a function that handles direction input from the user.
 * @param id id of a dom element
 * @param m direction handler
 */
function registerAttn(id: string, m: (key: string) => any) {
    attnHash[id] = m;
    $(id).click(() => setAttn(id));
}

/**
 * Handle a direction input from the user by calling the current attention handler.
 * @param dir either "up", "down", "left", or "right"
 */
function userInput(dir: string) {
    if(attn) {
        attn(dir);
    }
}

function setupIntro() {
    // key handler
    document.addEventListener("keydown", event => {
        switch(event.key.toLowerCase()) {
            case("h"):
            case("a"):
            case("arrowleft"):
                userInput("left");
                break;
            case("l"):
            case("d"):
            case("arrowright"):
                userInput("right");
                break;
            case("k"):
            case("w"):
            case("arrowup"):
                userInput("up");
                break;
            case("j"):
            case("s"):
            case("arrowdown"):
                userInput("down");
                break;
        }
    });
    $("h1").on("swiperight", () => {alert("foo"); userInput("right")});
    $(".container").on("swipeleft", () => {alert("foo2"); userInput("left")});
    $(".container").on("swipeup", () => userInput("up"));
    $(".container").on("swipedown", () => userInput("down"));


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

    // Simple entropy example
    let mSimpleHist = Histogram.fromArray(simpleHist["hist"]);
    let hSimpleHist = new SVGHistogram("simple-entropy-ex", "#simple-entropy-ex", mSimpleHist, conf);

    // Labeled Binary Tree
    let labeledBinTree = new SVGLabeledBinaryTree("#labeled-tree-ex", 4, conf); //SVGLabeledBinaryTree("#labeled-tree-ex", 4, conf);
    labeledBinTree.refresh();

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
    let interactiveEnt = new SVGInteractiveEntropy("#entropy-ex-interactive", mInteractiveEnt, conf);
    interactiveEnt.refresh();

    let interactiveEntHandler = function(dir: string) {
        switch(dir) {
            case("left"):
                interactiveEnt.hist.selectCol(mInteractiveEnt.selectedBin() - 1);
                break;
            case("right"):
                interactiveEnt.hist.selectCol(mInteractiveEnt.selectedBin() + 1);
                break;
            case("up"):
                interactiveEnt.hist.incrSelectedBin();
                break;
            case("down"):
                interactiveEnt.hist.decrSelectedBin();
                break;

        }
    };
    registerAttn("#entropy-interactive", interactiveEntHandler);

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

    let interactiveXEntHandler = function(dir: string) {
        switch(dir) {
            case("left"):
                interactiveXEnt.sourceEnt.hist.selectCol(pModel.selectedBin() - 1);
                relEnt.refresh();
                break;
            case("right"):
                interactiveXEnt.sourceEnt.hist.selectCol(pModel.selectedBin() + 1);
                relEnt.refresh();
                break;
            case("up"):
                interactiveXEnt.sourceEnt.hist.incrSelectedBin();
                relEnt.refresh();
                break;
            case("down"):
                interactiveXEnt.sourceEnt.hist.decrSelectedBin();
                relEnt.refresh();
                break;

        }
    };
    registerAttn("#xentropy-interactive", interactiveXEntHandler);

    // Transport diagram with arrows
    let transportMatrix = HeatMap.fromCSVStr(transportEx["matrix"]);
    let interactiveTransport = new SVGIndicatorTransport("#transport-ex-interactive", transportMatrix, conf);
    interactiveTransport.refresh();
    let interactiveTransportHandler = function(dir: string) {
        switch(dir) {
            case("left"):
                interactiveTransport.rowHist.selectCol(transportMatrix.selectedCol() - 1);
                break;
            case("right"):
                interactiveTransport.rowHist.selectCol(transportMatrix.selectedCol() + 1);
        }
    };
    registerAttn("#transport-interactive", interactiveTransportHandler);

    let intTransportMatrix  = HeatMap.fromCSVStr(transportEx["matrix"]); // this is a copy. having a second instance is useful to disable synced refresh between these views.
    let interactiveTransportMatrix = new SVGTransportMatrix("#transport-matrix-ex-interactive", intTransportMatrix, conf);
    interactiveTransportMatrix.refresh();
    let interactiveTransportMatrixHandler = function(dir: string) {
        switch(dir) {
            case("left"):
                interactiveTransportMatrix.rowHist.selectCol(intTransportMatrix.selectedCol() - 1);
                break;
            case("right"):
                interactiveTransportMatrix.rowHist.selectCol(intTransportMatrix.selectedCol() + 1);
        }
    };
    registerAttn("#transport-matrix-interactive", interactiveTransportMatrixHandler);

    let optTransportMatrix = HeatMap.fromCSVStr(transportEx["opt_matrix"]);
    let optInterativeTransportMatrix = new SVGTransportMatrix("#opt-transport-matrix-ex-interactive", optTransportMatrix, conf);
    optInterativeTransportMatrix.refresh();
    let optInteractiveTransportMatrixHandler = function(dir: string) {
        switch(dir) {
            case("left"):
                optInterativeTransportMatrix.rowHist.selectCol(optTransportMatrix.selectedCol() - 1);
                break;
            case("right"):
                optInterativeTransportMatrix.rowHist.selectCol(optTransportMatrix.selectedCol() + 1);
        }
    };
    registerAttn("#opt-transport-matrix-interactive", optInteractiveTransportMatrixHandler);

    // Optimizers
    let wEMean = optimizers["wganEasy"]["mean"];
    let wECov = optimizers["wganEasy"]["cov"];
    let wETargetMean = optimizers["wganEasy"]["targetMean"];
    let wETargetCov = optimizers["wganEasy"]["targetCov"];
    let wETarget = new Gaussian2D(wETargetMean, wETargetCov);

    let svgWEAnim = new SVGAnimatedGaussian("wgan-easy", "#wgan-easy-optim-ex", 15, wEMean, wECov, wETarget, [[-2, 4], [-2, 4]], conf);

    let gEMean = optimizers["ganEasy"]["mean"];
    let gECov = optimizers["ganEasy"]["cov"];
    let gETargetMean = optimizers["ganEasy"]["targetMean"];
    let gETargetCov = optimizers["ganEasy"]["targetCov"];
    let gETarget = new Gaussian2D(gETargetMean, gETargetCov);

    let svgGEAnim = new SVGAnimatedGaussian("gan-easy", "#gan-easy-optim-ex", 15, gEMean, gECov, gETarget, [[-2, 4], [-2, 4]], conf);
    $("#gan-comp-easy-play").click(() => { svgWEAnim.play(); svgGEAnim.play(); });
    $("#gan-comp-easy-pause").click(() => { svgWEAnim.pause(); svgGEAnim.pause(); });
    $("#gan-comp-easy-reset").click(() => { svgWEAnim.reset(); svgGEAnim.reset(); });

    let wMPoints = optimizers["wganManifold"]["points"];
    let wMTargetMean = optimizers["wganManifold"]["targetMean"];
    let wMTargetSlope = optimizers["wganManifold"]["targetSlope"];
    let wMTarget = new Line2D(wMTargetSlope, wMTargetMean);

    let svgWMAnim = new SVGAnimatedPoints("wgan-manifold", "#wgan-manifold-optim-ex", 15, wMPoints, wMTarget, [[-2, 4], [-2, 4]], conf);

    let gMPoints = optimizers["ganManifold"]["points"];
    let gMTargetMean = optimizers["ganManifold"]["targetMean"];
    let gMTargetSlope = optimizers["ganManifold"]["targetSlope"];
    let gMTarget = new Line2D(gMTargetSlope, gMTargetMean);

    let svgGMAnim = new SVGAnimatedPoints("gan-manifold", "#gan-manifold-optim-ex", 15, gMPoints, gMTarget, [[-2, 4], [-2, 4]], conf);

    $("#gan-comp-manifold-play").click(() => { svgWMAnim.play(); svgGMAnim.play(); });
    $("#gan-comp-manifold-pause").click(() => { svgWMAnim.pause(); svgGMAnim.pause(); });
    $("#gan-comp-manifold-reset").click(() => { svgWMAnim.reset(); svgGMAnim.reset(); });
}   

main();