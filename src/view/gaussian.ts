import { ModelListener, CONF } from "../model/model";
import {Gaussian2D, Line2D} from "../model/gaussian";
import {Animated} from "./animated";
import * as d3 from "d3";
import * as $ from "jquery";

export class SVGGaussian2D implements ModelListener {
    protected gaussian: Gaussian2D;
    protected conf: CONF;
    protected name: string;
    protected svg: string;
    protected bounds: number[][];
    protected strokeOnly: boolean;

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
        this.strokeOnly = false;
        gaussian.addListener(this);

    }

    stroke(onOff: boolean): void {
        this.strokeOnly = onOff;
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
        
        let strokeOnly = this.strokeOnly;
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
          .attr("fill", (d) => strokeOnly ? "none" : d.color)
          .attr("stroke", (d) => "#000")
          .attr("stroke-width", (d) => strokeOnly ? 2 : 1)
          .attr("class", "levelCurve " + this.name);

    }

    assign(mean: number[], cov: number[][]) {
        this.gaussian.assign(mean, cov);
    }
}



export class SVGAnimatedGaussian extends SVGGaussian2D implements Animated {
    protected means: number[][];
    protected covs: number[][][];
    protected svgTarget: SVGGaussian2D;
    protected curMean: number[];
    protected curCov: number[][];
    protected frame: number;
    protected fps: number;
    protected timerId: NodeJS.Timer;
    constructor(name: string, svgElement: string, fps: number, 
            means: number[][],
            covs: number[][][], 
            target: Gaussian2D,
            bounds: number[][],
            conf: CONF) {
        super(name, svgElement, new Gaussian2D(means[0], covs[0]), bounds, conf);
        this.means = means;
        this.covs = covs;
        this.svgTarget = new SVGGaussian2D(this.name + "-target", svgElement, target, bounds, conf);
        this.fps = fps;
        this.frame = 0;
        this.curMean = this.means[0];
        this.curCov = this.covs[0];

        this.svgTarget.stroke(true);
        this.stroke(false);

        this.svgTarget.refresh();
    }

    play() {
        let alpha = 0.3;
        let i = 0;
        let ewma_helper = function(arr: number[], prev: number[]) {
            if(arr.length != 2 || arr.length != 2) {
                throw RangeError("Must be length 2 input.");
            }
            return [
                alpha * arr[0] + (1-alpha)*prev[0],
                alpha * arr[1] + (1-alpha)*prev[1]
            ];

        }
        this.timerId = setInterval(() => { 
            if(this.frame < this.means.length) {
                this.curMean = ewma_helper(this.means[this.frame], this.curMean);
                this.curCov = [
                    ewma_helper(this.covs[this.frame][0], this.curCov[0]),
                    ewma_helper(this.covs[this.frame][1], this.curCov[1]),
                ];
                this.assign(this.curMean, this.curCov); 
                this.frame++;
    
                this.svgTarget.refresh();
            }
            else {
                // do nothing ie freeze the animation at the last frame
                this.pause();
            }
        }, 1000/this.fps);
        
    }

    pause() {
        clearInterval(this.timerId);
        delete this.timerId;
    }

    reset() {
        this.frame = 0;
        this.curMean = this.means[0];
        this.curCov = this.covs[0];
        this.assign(this.curMean, this.curCov);
    }
}


export class SVGAnimatedPoints implements Animated {
    protected points: number[][][];
    protected curpoints: [number, number][];
    protected target: Line2D;
    protected name: string;
    protected svg: string;
    protected fps: number; 
    protected bounds: number[][];
    protected conf: CONF;
    protected timerId: NodeJS.Timer;
    protected frame: number;

    constructor(name: string, svgElement: string, fps: number, points: number[][][], target: Line2D, bounds: number[][], conf: CONF) {
        this.target = target;
        this.name = name;
        this.svg = svgElement;
        this.fps = fps;
        this.points = points;
        this.bounds = bounds;
        this.conf = conf;
        this.curpoints = points[0].map((p) => [p[0], p[1]]);

        this.frame = 0;

        d3.select(this.svg)
            .append("line")
            .attr("id", "targetLine");
    }

    play() {
        let svgWidth = $(this.svg).width();
        let svgHeight = $(this.svg).height();

        let viewBoxSideLength = Math.min(svgWidth, svgHeight);
        let xOffset = (svgWidth - viewBoxSideLength)/2;
        let yOffset = (svgHeight - viewBoxSideLength)/2;

        let wScale = d3.scaleLinear().domain([this.bounds[0][0], this.bounds[0][1]]).range([0, viewBoxSideLength]);
        let hScale = d3.scaleLinear().domain([this.bounds[1][0], this.bounds[1][1]]).range([0, viewBoxSideLength]);

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

        // get target line coordinates by finding where it intersects the boundaries, like that trick in SMO

        let start: number[] = [];
        let end: number[] = [];

        let x_low = this.bounds[0][0];
        let x_high = this.bounds[0][1];
        let y_low = this.bounds[1][0];
        let y_high = this.bounds[1][1];
        let x_slope = this.target.slope()[0];
        let y_slope = this.target.slope()[1];
        let x_int = this.target.intercept()[0];
        let y_int = this.target.intercept()[1];

        let u1 = (x_low - x_int)/x_slope;
        let u2 = (y_low - y_int)/y_slope;
        
        if(u1*x_slope + x_int > u2*x_slope + x_int) {
            start = [u1*x_slope + x_int, u1*y_slope + y_int]
        }
        else {
            start = [u2*x_slope + x_int, u2*y_slope + y_int]
        }

        let v1 = (x_high - x_int) / x_slope;
        let v2 = (y_high - y_int) / y_slope;
        
        if(v1*x_slope + x_int < v2*x_slope + x_int) {
            end = [v1*x_slope + x_int, v1*y_slope + y_int];
        } 
        else {
            end = [v2*x_slope + x_int, v2*y_slope + y_int];
        }

        let alpha = 0.3;
        let i = 0;
        let ewma_helper = function(arr: number[], prev: number[]): [number, number] {
            if(arr.length != 2 || arr.length != 2) {
                throw RangeError("Must be length 2 input.");
            }
            return [
                alpha * arr[0] + (1-alpha)*prev[0],
                alpha * arr[1] + (1-alpha)*prev[1]
            ];

        }

        this.timerId = setInterval(() => { 
            if(this.frame < this.points.length) {
                let target = this.target;
    
                d3.select(this.svg)
                    .selectAll(".point")
                    .remove();
    
                d3.select(this.svg)
                    .select("#targetLine")
                    .remove();
                
                d3.select(this.svg)
                    .append("line")
                    .attr("id", "targetLine")
                    .attr("x1", absX(start[0]))
                    .attr("x2", absX(end[0]))
                    .attr("y1", absY(start[1]))
                    .attr("y2", absY(end[1]))
                    .attr("stroke", "rgba(0, 0, 0, 0.5)")
                    .attr("stroke-width", 1);

                let lineFn = d3.line()
                                .x((d) => absX(d[0]))
                                .y((d) => absY(d[1]))
                                .curve(d3.curveBasis);
                    
                
                let c = this.curpoints.map((p, k) => ewma_helper(this.points[this.frame][k], p))
                d3.select(this.svg)
                    .select("#dataLine")
                    .remove();
                d3.select(this.svg)
                    .append("path")
                    .attr("d", lineFn(c))
                    .attr("id", "dataLine")
                    .attr("stroke", colors[0])
                    .attr("stroke-width", 4)
                    .attr("fill", "none");
                    
                this.curpoints = c;
                this.frame++;
            }
            else {
                // do nothing ie freeze the animation at the last frame
                this.pause();
            }

        }, 1000/this.fps);
    }

    pause() {
        clearInterval(this.timerId);
        delete this.timerId;
    }

    reset() {
        this.frame = 0;
    }
}