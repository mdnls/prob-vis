import {ModelListener, Model} from '../model/model';

/**
 * Update the text in a particular html element using the result of a function applied to the model.
 */
export class TextBinder<T> implements ModelListener {
    private model: T;
    private textElement: string;
    private updateRule: (model: T) => string;
    constructor(textElement: string, model: T, updateRule: (model: T) => string) {
        this.textElement = textElement;
        this.model = model
        this.updateRule = updateRule;

    }

    refresh() {
        $(this.textElement).text(this.updateRule(this.model));
    }
}