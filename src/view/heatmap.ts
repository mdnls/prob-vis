import {Matrix, Cell, MatrixSlice} from '../model/heatmap';
import {CONF} from '../model/model';
import { ModelListener } from '../model/model';
import * as d3 from 'd3';

export class SVGHeatmap implements ModelListener {
    private conf: CONF;
    private svg: string;
    private model: Matrix;


    width: number;
    height: number;
    viewBoxSideLength: number;
    xOffset: number;
    yOffset: number;
    pad: number;
    s: number;

   /**
    * Draw a histogram in the given div representing the given model.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    */
   constructor(svgElement: string, model: Matrix, conf: CONF) {
      this.svg = svgElement;
      this.model = model;
      this.conf = conf;
      this.model.addListener(this);
   }

   refresh(): void {
      let pad: number = this.conf.padding;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
      let xOffset = (svgWidth - viewBoxSideLength)/2;
      let yOffset = (svgHeight - viewBoxSideLength)/2;
      let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);

      let s: number = scale.invert(viewBoxSideLength / this.model.sideLength());

      this.pad = pad;
      this.width= svgWidth;
      this.height = svgHeight;
      this.viewBoxSideLength = viewBoxSideLength;
      this.xOffset = xOffset;
      this.yOffset = yOffset;


      function absR(relR: number) {
        return yOffset + scale(relR);
      }
      function absC(relC: number) {
        return xOffset + scale(relC);
      }

      let allCells: Cell[] = [].concat(...this.model.rows());

      let max: number = allCells.reduce((prev, cur) => Math.max(prev, cur.quantity), -Infinity);

      let selectedCol: number = this.model.selectedCol();
      
      d3.select(this.svg)
        .selectAll("rect")
        .remove();
        
      d3.select(this.svg)
        .selectAll("rect")
        .data(allCells)
        .enter()
        .append("rect")
        .attr("x", (d) => absC(d.c * s + 0.075*s))
        .attr("y", (d) => absR(d.r * s + 0.075*s))
        .attr("width", (d) => scale(s*0.85))
        .attr("height", (d) => scale(s*0.85))
        .attr("fill", (d) => d3.interpolateBlues( 0.1 + 0.9 * (d.quantity / max)))
        .attr("stroke", (d) => selectedCol != -1 && d.c == selectedCol ? "#222" : "none");
   }


}