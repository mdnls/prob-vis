import {ModelListener} from 'model/model';
import {Bins, Item, BinItem} from 'model/bins';
import {CONF} from '../model/model';
import * as d3 from "d3";
import * as $ from "jquery";


/**
 * Draw a histogram.
 */
export class SVGHistogram implements ModelListener {
   model: Bins;
   conf: CONF;
   fixed: boolean;
   name: string;

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
    * @param name a unique name for this view.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    * @param conf configuration for this view
    */
   constructor(name: string, svgElement: string, model: Bins, conf: CONF) {
      this.svg = svgElement;
      this.model = model;
      this.conf = conf;
      this.fixed = false;
      this.name = name;
      this.model.addListener(this);

      this.refresh();
   }

   /**
    * Redraw the histogram.
    */
   refresh(): void {

      if(this.fixed) {
         return;
      }
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
      
      let colors = this.conf.colors[this.name];
      if(colors == undefined) {
         colors = this.conf.colors["default"];
      }
      function absX(relX: number) {
         return xOffset + scale(relX);
      }
      function invAbsX(absX: number) {
         return scale.invert(absX - xOffset - document.getElementById(this.svg).getBoundingClientRect().left);
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
         .selectAll("." + this.name)
         .remove();

      // redraw
      d3.select(this.svg)
         .selectAll("rect ." + this.name)
         .data(allItems)
         .enter()
         .append("rect")
         .attr("class", this.name)
         .attr("width", scale(s * 0.85))
         .attr("height", scale(s * 0.85))
         .attr("x", (d) => absX(d.x * s + s*0.075))
         .attr("y", (d) => absY((d.y+1)* s - s*0.075)) // rectangle extends downward, so the y index is for top left
         .attr("fill", (d) => colors[d.x % colors.length]);
   }

   /**
    * Fixes the view by explicitly disabling refresh.
    */
   fix(): void {
      this.fixed = true;
   }

   /**
    * Unfix the view by allowing refresh, if the view was previously fixed.
    */
   unfix(): void {
      this.fixed = false;
   }
}


export class SVGInteractiveHistogram extends SVGHistogram {
   /**
    * Draw a histogram in the given div representing the given model.
    * @param name a unique name for this view.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    * @param conf configuration for this view
    */
   constructor(name: string, svgElement: string, model: Bins, conf: CONF) {
      super(name, svgElement, model, conf);
      this.model.addListener(this);
      this.refresh();

   }

   refresh() {
      super.refresh();

      let scale = d3.scaleLinear().domain([0, 100]).range([0, this.viewBoxSideLength]);

      let xOffset = this.xOffset;
      let yOffset = this.yOffset;
      let svgHeight = this.height;
      let id = this.svg;
      function absX(relX: number) {
         return xOffset + scale(relX);
      }
      function invAbsX(absX: number) {
         return scale.invert(absX - xOffset - $(id).position().left);
      }
      function absY(relY: number) {
         return svgHeight - yOffset - scale(relY);
      }

      d3.select(this.svg)
      .on("click", () => this.selectCol(Math.floor(invAbsX(d3.event.x) / this.s)));

      if(this.model.selectedBin() != -1) {
       let binHeight = this.model.getBin(this.model.selectedBin()).length;
       let bin = this.model.getBin(this.model.selectedBin());
       
       d3.select(this.svg)
         .selectAll(".binHighlight")
         .remove();

       d3.select(this.svg)
       .selectAll(".binHighlight")
       .data(bin)
       .enter()
       .append("rect")
       .attr("width", scale(this.s * 0.85))
       .attr("height", scale(this.s * 0.85))
       .attr("x", (d) => absX(d.x * this.s + this.s*0.075))
       .attr("y", (d) => absY((d.y+1)* this.s - this.s*0.075)) // rectangle extends downward, so the y index is for top left
       .attr("class", "binHighlight")
       .attr("fill", "none")
       .attr("stroke", "#000")
       .attr("stroke-width", "2px");
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


export class SVGPhantomHistogram extends SVGHistogram {
   private phantom: Bins;

   /**
    * Draw a histogram in the given div representing the given model.
    * @param name a unique name for this view.
    * @param svgElement the id selector of the svg element that this view should draw in.
    * @param model the model that this selector should use to draw.
    * @param conf configuration for this view
    */
   constructor(name: string, svgElement: string, model: Bins, phantom: Bins, conf: CONF) {
      super(name, svgElement, model, conf);
      this.model.addListener(this);
      this.phantom = phantom;
      this.phantom.addListener(this);
      this.refresh();
   }

   refresh() {
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
      // goal: draw a marker at y+1 where y is the num of items in the bin

      if(this.phantom != undefined) {
         let pdata = this.phantom.bins().map((bin: Item[]) => bin[bin.length-1]);
         let mdata = this.model.bins().map((bin: Item[]) => bin[bin.length-1]);
         
         // if a bin has 0 length, mdata will be undefined. replace that with 0:
         mdata = mdata.map((v, k) => (v == undefined) ? new BinItem(k, -1, "") : v);

         d3.select(this.svg)
         .selectAll(".phantomIndicator")
         .remove();

         d3.select(this.svg)
         .selectAll(".phantomIndicatorCover")
         .remove();

         d3.select(this.svg)
         .selectAll(".phantomIndicatorLine")
         .remove();

         // add the outline bars
         d3.select(this.svg)
         .selectAll("rect .phantomIndicator")
         .data(pdata)
         .enter()
         .append("rect")
         .attr("x", (d) => absX(d.x * this.s + this.s*0.025))
         .attr("y", (d) => absY((d.y+1)* this.s - this.s*0.025))
         .attr("width", (d) => scale(this.s * 0.95))
         .attr("height", (d) => scale(this.s * 0.95 * 0.25))
         .attr("fill", "#AAAAAA")
         .attr("class", "phantomIndicator");

         // use white rectangles to cover bodies
         d3.select(this.svg)
         .selectAll("rect .phantomIndicatorCover")
         .data(pdata)
         .enter()
         .append("rect")
         .attr("x", (d) => absX(d.x * this.s + this.s*0.075))
         .attr("y", (d) => absY((d.y+1)* this.s - this.s*0.075))
         .attr("width", (d) => scale(this.s * 0.85))
         .attr("height", (d) => scale(this.s * 0.85))
         .attr("fill", "#FFFFFF")
         .attr("class", "phantomIndicator");

         // then draw the lines for markers which are above the actual model

         let overModelIdxs = Array.from({length: pdata.length}, (v, k) => k).filter((v, k) => pdata[k].y > mdata[k].y);
         
         d3.select(this.svg)
         .selectAll("line .phantomIndicatorLine")
         .data(overModelIdxs)
         .enter()
         .append("line")
         .attr("x1", (d) => absX(this.s * pdata[d].x + this.s/2))
         .attr("x2", (d) => absX(this.s * pdata[d].x + this.s/2))
         .attr("y1", (d) => absY(this.s * (mdata[d].y + 1) - 0.075 * this.s))
         .attr("y2", (d) => absY(this.s * (pdata[d].y + 1) - 0.075 * this.s))
         .attr("stroke", "#DDDDDD")
         .attr("class", "phantomIndicatorLine");
      }
      super.refresh();
   }
}