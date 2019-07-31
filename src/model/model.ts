
/**
 * Represents a model, which views can use to draw information.
 */
export abstract class Model {
  protected listeners: ModelListener[];

  private static globalModels: Model[] = new Array<Model>();

  constructor() {
    this.listeners = [];
    Model.globalModels.push(this);
  }

  addListener(listener: ModelListener): void {
    this.listeners.push(listener);
  }

  refresh(): void {
    this.listeners.forEach( l => l.refresh() );
  }

  static globalRefresh(): void {
    Model.globalModels.forEach(m => m.refresh());
  }

}

/**
 * Interface for view elements that can pull from a model.
 */
export interface ModelListener {
   /**
    * Redraw any svg component this view is responsible for.
    */
   refresh(): void; 
}


/**
 * Configuration class.
 */
export class CONF {
  public gridBoxSize: number;
  // given at item type string, this dictionary gives the main and accent color for that item.
  colors: { [index: string]: string[] };
  padding: number;

  constructor(gridBoxSize: number, colors: { [index: string]: string[]}, padding: number) {
      this.gridBoxSize = gridBoxSize;
      this.colors = colors;
      this.padding = padding;
  }
}