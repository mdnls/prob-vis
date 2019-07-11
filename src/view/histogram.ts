import {ModelListener} from 'model/model';
import {Bins, Item} from 'model/bins';
import {CONF} from 'main';
import * as d3 from "d3";
import * as $ from "jquery";


/**
 * Draw a histogram.
 */
export class SVGStaticHistogram implements ModelListener {
   model: Bins;
   conf: CONF;

   // public information about this view's visual configuration which can be helpful to have on the fly
   svg: string;
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

   /**
    * Redraw the histogram.
    */
   refresh(): void {
      let pad: number = this.conf.padding;

      let svgWidth = $(this.svg).width();
      let svgHeight = $(this.svg).height();

      let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
      let xOffset = (svgWidth - viewBoxSideLength)/2;
      let yOffset = (svgHeight - viewBoxSideLength)/2;
      let scale = d3.scaleLinear().domain([0, 100]).range([0, viewBoxSideLength]);

      let s: number = scale.invert(viewBoxSideLength / this.model.numBins());

      this.s = s;
      this.pad = pad;
      this.width= svgWidth;
      this.height = svgHeight;
      this.viewBoxSideLength = viewBoxSideLength;
      this.xOffset = xOffset;
      this.yOffset = yOffset;
      
      let colors = this.conf.colors["histogram"]

      function absX(relX: number) {
         return xOffset + scale(relX);
      }
      function invAbsX(absX: number) {
         return scale.invert(absX - xOffset);
      }
      function absY(relY: number) {
         return svgHeight - yOffset - scale(relY);
      }

      d3.select(this.svg)
         .selectAll(".bottomBorder")
         .attr("x", absX(0))
         .attr("y", absY(0))
         .attr("height", scale(0.5))
         .attr("width", viewBoxSideLength)
         .attr("fill", this.conf.colors["border"][0])
         .attr("rx", 0.2 * s);

      // get the new data for components
      var allItems: Item[] = [].concat(...this.model.bins()); 

      // get rid of old data rectangles before redraw
      d3.select(this.svg)
         .selectAll("#histItem")
         .remove();

      // redraw
      d3.select(this.svg)
         .selectAll("rect #histItem")
         .data(allItems)
         .enter()
         .append("rect")
         .attr("id", "histItem")
         .attr("width", scale(s * 0.85))
         .attr("height", scale(s * 0.85))
         .attr("x", (d) => absX(d.x * s + s*0.075))
         .attr("y", (d) => absY((d.y+1)* s + s*0.075)) // rectangle extends downward, so the y index is for top left
         .attr("fill", (d) => colors[d.x % colors.length]);
   }
}


export class SVGInteractiveHistogram extends SVGStaticHistogram {
     /**
    * Draw a histogram in the given div representing the given model.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    */
   constructor(svgElement: string, model: Bins, conf: CONF) {
      super(svgElement, model, conf);
      this.model.addListener(this);
      this.refresh();

      d3.select(this.svg)
        .append("text")
        .text("*")
        .attr("class", "colHighlight")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle");
   }

   refresh() {
      super.refresh();

      let scale = d3.scaleLinear().domain([0, 100]).range([0, this.viewBoxSideLength]);

      let xOffset = this.xOffset;
      let yOffset = this.yOffset;
      let svgHeight = this.height;
      function absX(relX: number) {
         return xOffset + scale(relX);
      }
      function invAbsX(absX: number) {
         return scale.invert(absX - xOffset);
      }
      function absY(relY: number) {
         return svgHeight - yOffset - scale(relY);
      }

      d3.select(this.svg)
      .on("click", () => this.selectCol(Math.floor(invAbsX(d3.event.x) / this.s)));

      if(this.model.selectedBin() != -1) {
       let binHeight = this.model.getBin(this.model.selectedBin()).length;
       d3.select(this.svg)
       .selectAll(".colHighlight")
       .attr("x", (d) => absX(this.s * this.model.selectedBin() + 0.5 * this.s ))
       .attr("y", (d) => absY(this.s * binHeight))
       .attr("style", "font-size: " + scale(this.s) + "px;");
    }
   }
      /**
    * Select one of the histogram bins. Other interactions can use the selected bin as an action target.
    * ie. add one item to the selected bin.
    * @param bin bin to select.
    */
   selectCol(bin: number) {
      this.model.selectBin(bin);
   }

   /**
    * Add an item to the selected bin, unless the item would extend past the view box.
    */
   incrSelectedBin() {
      if(this.model.selectedBin() != -1) {
         let curItems = this.model.getBin(this.model.selectedBin()).length;
         // curItems+2 * s marks the ending y position of the extra block above the column.
         // this leaves a place for the selected column indicator.
         if((curItems+1) * this.s < 100) {
            this.model.addItem(this.model.selectedBin());
         }
      }
   }

   /**
    * Remove an item from the selected bin, if there is more than one item.
    */
   decrSelectedBin() {
      if(this.model.selectedBin() != -1) {
         let curItems = this.model.getBin(this.model.selectedBin()).length;
         if(curItems > 1) {
            this.model.removeItem(this.model.selectedBin());
         }
      }
   }
}