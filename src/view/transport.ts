import {SVGInteractiveHistogram, SVGHistogram} from './histogram';
import {SVGHeatmap} from './heatmap';
import { Matrix, MatrixSlice, Slice } from '../model/heatmap';
import { CONF } from '../model/model';
import {ModelListener} from '../model/model';
import * as d3 from "d3";

export class SVGTransport implements ModelListener {
    private model: Matrix;
    private colslices: MatrixSlice[];

    private heatmap: SVGHeatmap;
    private rowHist: SVGInteractiveHistogram;
    private colHist: SVGHistogram;
    private colOverlay: SVGHistogram;

    private div: string;
    private svgHeatMap: string;
    private svgRowHist: string;
    private svgColHist: string;
    private svgColOverlay: string;

    private conf: CONF;

    constructor(divElement: string, model: Matrix, conf: CONF) {
        this.conf = conf;
        this.div = divElement;
        
        let defaultIds = ["svgHeatMap", "svgRowHist", "svgColHist"];

        this.svgHeatMap = this.div + " > #" + defaultIds[0];
        this.svgRowHist = this.div + " > #" + defaultIds[1];
        this.svgColHist = this.div + " > #" + defaultIds[2];
        this.svgColOverlay = this.div + " > #" + defaultIds[2];

        let d = d3.select(this.div);

        d.append("svg").attr("id", defaultIds[1]);
        d.append("br");
        d.append("svg").attr("id", defaultIds[0]);
        d.append("svg").attr("id", defaultIds[2]).attr("transform", "rotate(90)");

        this.model = model;
        let rslice = new MatrixSlice(this.model, Slice.ROWS);
        let cslice = new MatrixSlice(this.model, Slice.COLS);
        this.colslices = Array.from({length: this.model.sideLength()},
                    (v, k) => new MatrixSlice(this.model, Slice.COL, k));

        this.heatmap = new SVGHeatmap(this.svgHeatMap, this.model, this.conf);
        this.rowHist = new SVGInteractiveHistogram("rowHist", this.svgRowHist, rslice, this.conf);
        this.colHist = new SVGHistogram("colHist", this.svgColHist, cslice, this.conf);
        
        this.model.addListener(this);
    }

    refresh() {
        let svgHeight = $(this.div).height();
        let svgWidth = $(this.div).width();

        d3.select(this.svgRowHist).attr("width", (1/2) * svgWidth).attr("height", (1/2) * svgHeight);
        d3.select(this.svgHeatMap).attr("width", (1/2) * svgWidth).attr("height", (1/2) * svgHeight);
        d3.select(this.svgColHist).attr("width", (1/2) * svgWidth).attr("height", (1/2) * svgHeight);

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

