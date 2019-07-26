import {SVGInteractiveHistogram, SVGHistogram} from './histogram';
import {SVGHeatmap} from './heatmap';
import {BinItem} from "../model/bins";
import { Matrix, MatrixSlice, UnnormalizedMatrixSlice, Slice } from '../model/heatmap';
import { CONF } from '../model/model';
import {ModelListener} from '../model/model';
import * as d3 from "d3";

export class SVGTransport implements ModelListener {
    model: Matrix;
    colslices: MatrixSlice[];
    rslice: MatrixSlice;
    cslice: MatrixSlice;

    rowHist: SVGInteractiveHistogram;
    colHist: SVGHistogram;
    colOverlay: SVGHistogram;

    div: string;
    svgRowHist: string;
    svgColHist: string;
    svgColOverlay: string;

    conf: CONF;

    constructor(divElement: string, model: Matrix, conf: CONF) {
        this.conf = conf;
        this.div = divElement;
        
        let defaultIds = ["svgRowHist", "svgColHist"];

        this.svgRowHist = this.div + " > #" + defaultIds[0];
        this.svgColHist = this.div + " > #" + defaultIds[1];
        this.svgColOverlay = this.div + " > #" + defaultIds[1];

        let d = d3.select(this.div);

        d.append("svg").attr("id", defaultIds[0]);
        d.append("svg").attr("id", defaultIds[1]);

        this.model = model;
        this.rslice = new UnnormalizedMatrixSlice(this.model, Slice.ROWS);
        this.cslice = new UnnormalizedMatrixSlice(this.model, Slice.COLS);
        this.colslices = Array.from({length: this.model.sideLength()},
                    (v, k) => new UnnormalizedMatrixSlice(this.model, Slice.COL, k));

        this.rowHist = new SVGInteractiveHistogram("rowHist", this.svgRowHist, this.rslice, this.conf);
        this.colHist = new SVGHistogram("colHist", this.svgColHist, this.cslice, this.conf);
        
        this.model.addListener(this);
    }

    refresh() {
        let svgHeight = $(this.div).height();
        let svgWidth = $(this.div).width();
        
        let sideLength = Math.min((1/2) * svgWidth, svgHeight);
        d3.select(this.svgRowHist).attr("width", sideLength).attr("height", sideLength);
        d3.select(this.svgColHist).attr("width", sideLength).attr("height", sideLength);

        this.rowHist.refresh();
        this.colHist.refresh();

        if(this.model.selectedCol() != -1) {
            let slice = this.colslices[this.model.selectedCol()];
            this.colOverlay = new SVGHistogram("colOverlay", this.svgColOverlay, slice, this.conf);
            this.colOverlay.refresh();
        }
    }
}

export class SVGTransportMatrix extends SVGTransport {
    heatmap: SVGHeatmap;
    svgHeatMap: string;
    constructor(divElement: string, model: Matrix, conf: CONF) { 
        super(divElement, model, conf);
        let defaultId = "svgHeatmap";
        
        this.svgHeatMap = this.div + " > #" + defaultId;        
        
        d3.select(this.div)
          .insert("br", this.svgColHist);
        d3.select(this.div)
          .insert("svg", this.svgColHist)
          .attr("id", defaultId);
        d3.select(this.svgColHist)
          .attr("transform", "rotate(90.01)");

        this.heatmap = new SVGHeatmap(this.svgHeatMap, this.model, this.conf);
    }

    refresh() {
        let svgHeight = $(this.div).height();
        let svgWidth = $(this.div).width();

        let boxHeight = Math.min(svgHeight/2, svgWidth/2);
        d3.select(this.svgRowHist).attr("width", boxHeight).attr("height", boxHeight);
        d3.select(this.svgHeatMap).attr("width", boxHeight).attr("height", boxHeight);
        d3.select(this.svgColHist).attr("width", boxHeight).attr("height", boxHeight);

        this.rowHist.refresh();
        this.colHist.refresh();
        this.heatmap.refresh();

        if(this.model.selectedCol() != -1) {
            let slice = this.colslices[this.model.selectedCol()];
            this.colOverlay = new SVGHistogram("colOverlay", this.svgColOverlay, slice, this.conf);
            this.colOverlay.refresh();
        }
    }
}

export class SVGIndicatorTransport extends SVGTransport {
    svgArrowBar: string;

    // add an svg underneath the two histograms
    // if selected bin in left isn't 0
    // then take the tree highest recievers of left and make arrows 
    constructor(divElement: string, model: Matrix, conf: CONF) {
        super(divElement, model, conf);
        let defaultId = "arrowBar";

        this.svgArrowBar = this.div + " > #" + defaultId;
        d3.select(this.div)
          .append("svg")
          .attr("id", defaultId);
        
        let defs = d3.select(this.svgArrowBar).append("defs");

        defs.append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5, 10, 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5");
    }

    refresh() {
        super.refresh();

        let svgWidth = $(this.div).width();
        let svgHeight = $(this.div).height();

        let height = svgHeight/5;

        d3.select(this.svgArrowBar)
          .attr("width", svgWidth)
          .attr("height", height);


        if(this.rslice.selectedBin() != -1) {
            d3.select(this.svgArrowBar)
              .selectAll(".arrowIndicator")
              .remove();

            let width = this.colHist.viewBoxSideLength;

            let colxOffset = this.colHist.xOffset;
            let rowxOffset = this.rowHist.xOffset;
            let s = this.colHist.s;
            let pad = this.conf.padding;
            let arrowBar = this.svgArrowBar;

            let arrow = function(sBin: number, eBin: number) {
                let wScale = d3.scaleLinear().domain([0, 100]).range([0, width]);
                let start = colxOffset + wScale(s * sBin + 0.5 * s);
                let end = width + 2 * pad + rowxOffset + wScale(s * eBin + 0.5 * s);

                let p = `M${start},0  L ${start},20 L ${end},20 L ${end},5`;
                d3.select(arrowBar)
                  .append("path")
                  .attr("d", p)
                  .attr("class", "arrowIndicator")
                  .attr("stroke", "#000")
                  .attr("stroke-width", 2)
                  .attr("fill", "none")
                  .attr("marker-end", "url(#arrow)");
            }
            let sBin = this.rslice.selectedBin();
            let slice = this.colslices[sBin];
            slice.bins().forEach((i) => i.length > 0 ? arrow(sBin, i[0].x) : "");

        }
    }
}