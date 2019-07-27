import { ModelListener, CONF } from "../model/model";
import {Gaussian2D} from "../model/gaussian";
import * as d3 from "d3";
import * as $ from "jquery";

export class SVGGaussian2D implements ModelListener {
    protected gaussian: Gaussian2D;
    protected conf: CONF;
    protected name: string;
    protected svg: string;
    protected bounds: number[][];

    width: number;
    height: number;
    viewBoxSideLength: number;
    xOffset: number;
    yOffset: number;
    pad: number;

    constructor(name: string, svgElement: string, gaussian: Gaussian2D, bounds: number[][], conf: CONF) {
        this.name = name;
        this.svg = svgElement;
        this.gaussian = gaussian;
        this.conf = conf;
        this.bounds = bounds;
        gaussian.addListener(this);
    }

    refresh() {
        /*
        - Take v1, v2, scale 8 ways
        - Their rx is s*|v1| and ry is s*|v2|
        - Rotate by arctan ( (v1[1] - v2[1]) / (v1[0] - v2[0]))
        - Draw at the location mean
        */
        let pad: number = this.conf.padding;

        let svgWidth = $(this.svg).width();
        let svgHeight = $(this.svg).height();

        let viewBoxSideLength = Math.min(svgWidth, svgHeight) - 2 * pad;
        let xOffset = (svgWidth - viewBoxSideLength)/2;
        let yOffset = (svgHeight - viewBoxSideLength)/2;

        let wScale = d3.scaleLinear().domain([this.bounds[0][0], this.bounds[0][1]]).range([0, viewBoxSideLength]);
        let hScale = d3.scaleLinear().domain([this.bounds[1][0], this.bounds[1][1]]).range([0, viewBoxSideLength]);

        this.pad = pad;
        this.width= svgWidth;
        this.height = svgHeight;
        this.viewBoxSideLength = viewBoxSideLength;
        this.xOffset = xOffset;
        this.yOffset = yOffset;

        let gaussScale = 32;

        let colors = this.conf.colors[this.name];
        if(colors == undefined) {
            colors = this.conf.colors["default"];
        }

        function absX(relX: number) {
            return xOffset + wScale(relX);
        }
        function absY(relY: number) {
            return svgHeight - yOffset - hScale(relY);
        }

        let pcomponents = this.gaussian.eigenVectors();
        let mean = this.gaussian.meanVal();
        let v1 = pcomponents[0];
        let v2 = pcomponents[1];
        let pscales = this.gaussian.eigenValues();

        let rx = pscales[0];
        let ry = pscales[1];
        let angle = (v1[0] == v2[0]) ? 0 : Math.atan( (v1[1] - v2[1]) / (v1[0] - v2[0]) );

        let data = Array.from({length: colors.length}, (v, k) => {
            k = colors.length - k - 1;
            return {
                "cx": absX(mean[0]),
                "cy": absY(mean[1]),
                "rx": (rx * gaussScale * k),
                "ry": (ry * gaussScale * k),
                "theta": angle,
                "color": colors[k],
            };
        
        });

        d3.select(this.svg)
          .selectAll(".levelCurve ." + this.name)
          .remove();
        
        d3.select(this.svg)
          .selectAll(".levelCurve ." + this.name)
          .data(data)
          .enter()
          .append("ellipse")
          .attr("rx", (d) => d.rx)
          .attr("ry", (d) => d.ry)
          .attr("cx", (d) => d.cx)
          .attr("cy", (d) => d.cy)
          //.attr("style", (d) => "transform: rotate(" + d.theta + "rad); transform-origin: center center;")
          .attr("transform", (d) => "rotate(" + d.theta + "rad)")
          .attr("fill", (d) => d.color)

    }

    assign(mean: number[], cov: number[][]) {
        this.gaussian.assign(mean, cov);
    }
}