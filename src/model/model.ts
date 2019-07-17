
/**
 * Represents a model, which views can use to draw information.
 */
export interface Model {
  addListener(listener: ModelListener): void;
  refresh(): void;
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