export interface CommitOptions {
  title?: string;
  squash?: boolean;
}
export interface Commit<Change> {
  undo: Change[];
  redo: Change[];
  title?: string;
}
export type TransactedCallback<Change> = (txRecord: Commit<Change>) => void;
export interface Transactor<Change> {
  commit(change: Change, options?: CommitOptions): Commit<Change>;
  undo(): Commit<Change> | undefined;
  redo(): Commit<Change> | undefined;
  canUndo: boolean;
  canRedo: boolean;
  past: Commit<Change>[];
  future: Commit<Change>[];
  subscribe(
    txCallback: TransactedCallback<Change>,
  ): () => TransactedCallback<Change>;
}
