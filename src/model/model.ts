
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
