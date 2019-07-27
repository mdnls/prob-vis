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

        d3.select(this.svg)
            .append("text")
            .attr("id", "thetaLog");
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
        let angle = ((v1[0] == 0) ? Math.PI : - Math.atan( v1[1] / v1[0] ));

        d3.select("#thetaLog")
        .text(180 * angle / Math.PI);

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
          .selectAll("." + this.name)
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
          .attr("transform", (d) => "rotate(" + Math.floor(180 * d.theta / Math.PI) + " " + d.cx + " " + d.cy + ")")
          .attr("fill", (d) => d.color)
          .attr("class", "levelCurve " + this.name);

    }

    assign(mean: number[], cov: number[][]) {
        this.gaussian.assign(mean, cov);
    }
}



export class SVGAnimatedGaussian extends SVGGaussian2D {
    protected means: number[][];
    protected covs: number[][][];
    protected frame: number;
    protected fps: number;
    protected timerId: NodeJS.Timer;
    constructor(name: string, svgElement: string, fps: number, means: number[][], covs: number[][][], bounds: number[][], conf: CONF) {
        super(name, svgElement, new Gaussian2D(means[0], covs[0]), bounds, conf);
        this.means = means;
        this.covs = covs;
        this.fps = fps;
        this.frame = 0;
    }

    play() {
        let i = 0;
        this.timerId = setInterval(() => { 
            if(this.frame >= this.means.length) {
                this.pause();
                this.reset();
                return;
            }
            this.assign(this.means[this.frame], this.covs[this.frame]); 
            this.frame++;
        }, 1000/this.fps);
    }

    pause() {
        clearInterval(this.timerId);
        delete this.timerId;
    }

    reset() {
        this.frame = 0;
        this.assign(this.means[this.frame], this.covs[this.frame]);
    }
}