import { Model, ModelListener } from "./model";

export class Gaussian2D implements Model {
    private listeners: ModelListener[];

    protected mean: number[];
    protected cov: number[][];
    protected eigvecs: number[][];
    protected eigvals: number[]; // principal components

    constructor(mean: number[], cov: number[][]) {
        this.listeners = [];
        this.assign(mean, cov);
    }
    refresh() {
        this.listeners.forEach((l) => l.refresh());
    }

    addListener(listener: ModelListener) {
        this.listeners.push(listener);
    }

    assign(mean: number[], cov: number[][]) {
        if(mean.length != 2) {
            throw RangeError("Mean must be a length 2 array");
        }
        if(cov.length != 2 || cov[0].length != 2 || cov[1].length != 2) {
            throw RangeError("Covariance must be a 2x2 array");
        }
        this.mean = mean;
        this.cov = cov;
        let tr = cov[0][0] + cov[1][1];
        let det = (cov[0][0] * cov[1][1]) - (cov[0][1] * cov[1][0]);
        let e1 = (tr + Math.sqrt( (tr * tr) - 4 * det) )/2;
        let e2 = (tr - Math.sqrt( (tr * tr) - 4 * det) )/2;

        let v1 = [0, 0];
        let v2 = [0, 0];

        if(cov[0][1] == 0 && cov[1][0] == 0) {
            v1 = [1, 0];
            v2 = [0, 1];
        }
        else if(cov[0][1] == 0) {
            v1 = [e1 - cov[1][1], cov[1][0]];
            v2 = [e2 - cov[1][1], cov[1][0]];
        }
        else {
            v1 = [cov[0][1], e1 - cov[0][0]];
            v2 = [cov[0][1], e2 - cov[0][0]];
        }

        let v1_mag = Math.sqrt( (v1[0]*v1[0] + v1[1]*v1[1]));
        let v2_mag = Math.sqrt( (v2[0]*v2[0] + v2[1]*v2[1]));
        v1 = [v1[0]/v1_mag, v1[1]/v1_mag];
        v2 = [v2[0]/v2_mag, v2[1]/v2_mag];

        if(e2 > e1) {
            this.eigvals = [e2, e1];
            this.eigvecs = [v2, v1];
        }
        else {
            this.eigvals = [e1, e2];
            this.eigvecs = [v1, v2];
        }

        this.refresh();
    }

    eigenVectors(): number[][] {
        return Array.from(this.eigvecs);
    }

    eigenValues(): number[] {
        return Array.from(this.eigvals);
    }
    
    meanVal(): number[] {
        return Array.from(this.mean);
    }

    covMatrix(): number[][] { 
        return Array.from(this.cov);
    }

}