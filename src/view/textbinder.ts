import {ModelListener, Model} from '../model/model';

/**
 * Update the text in a particular html element using the result of a function applied to the model.
 * Does not require a model, but must be refreshed manually.
 */
export class LooseTextBinder<T> implements ModelListener {
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

/**
 * Update the text in a particular html element using the result of a function applied to the model.
 */
export class TextBinder<T extends Model> extends LooseTextBinder<T> {
    constructor(textElement: string, model: T, updateRule: (model: T) => string) {
        super(textElement, model, updateRule);
        model.addListener(this);
    }
}