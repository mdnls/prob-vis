import {Bins, Item} from "model";
import * as d3 from "d3";
import * as $ from "jquery";
import {CONF} from "main";

export interface ModelListener {
   /**
    * Redraw any svg component this view is responsible for.
    */
   refresh(): void; 
}


export class SVGHistogram implements ModelListener {
   private svg: string;
   private model: Bins;
   private conf: CONF;

   /**
    * Draw a histogram in the given div representing the given model.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    */
   constructor(svgElement: string, model: Bins, conf: CONF) {
      this.svg = svgElement;
      this.model = model;
      this.conf = conf;
      
      this.model.addListener(this);

      d3.select(this.svg)
        .append("rect")
        .attr("class", "bottomBorder");
      this.refresh();
   }

   refresh(): void {
      let s: number = this.conf.gridBoxSize;
      let pad: number = 0.2 * s;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
      let xOffset = (svgWidth - viewBoxSideLength)/2;
      let yOffset = (svgHeight - viewBoxSideLength)/2;
      let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);

      function absX(relX: number) {
         return xOffset + pad + scale(relX);
      }
      function absY(relY: number) {
         return svgHeight - yOffset - pad - scale(relY);
      }

      d3.select(this.svg)
         .selectAll(".bottomBorder")
         .attr("x", absX(0) - pad)
         .attr("y", absY(0) + pad)
         .attr("height", pad)
         .attr("width", viewBoxSideLength + 2 * pad)
         .attr("fill", this.conf.colors["border"][0]);

      // get the new data for components
      var allItems: Item[] = [].concat(...Array.from({length: this.model.numBins()}, (value, key) => this.model.bins(key))); 

      // bind the new data, adding rectangle elements if needed
      d3.select(this.svg)
         .selectAll("rect")
         .data(allItems)
         .enter()
         .append("rect")

      // bind AGAIN, now without risk of accidentally ignoring added items
      d3.select(this.svg)
         .selectAll("rect")
         .data(allItems)
         .attr("width", scale(s * 0.85))
         .attr("height", scale(s * 0.85))
         .attr("x", (d) => absX(d.x * s))
         .attr("y", (d) => absY((d.y+1) * s))
         .attr("fill", (d) => d3.schemePaired[2 * (d.x % 6)])
         .attr("stroke", (d) => d3.schemePaired[2 * (d.x % 6) + 1]);
   }
}

