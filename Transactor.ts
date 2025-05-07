export type CommitOptions = {
  /** An optional human-readable description of the committed change */
  title?: string;
  /**
   * If true, the commit will be squashed into the previous commit,
   * overriding the previous title if a title is also provided.
   */
  squash?: boolean;
};
/** Record of changes committed */
export interface Commit<Change> {
  /** The inverse of the changes that were committed */
  undo: Change[];
  /** The changes that were committed */
  redo: Change[];
  /** An optional human-readable description of the committed changes */
  title?: string;
}
export type TransactedCallback<Change> = (txRecord: Commit<Change>) => void;
/**
 * Transactor is an interface that defines a transaction manager for managing
 * changes in a system. It provides methods to commit changes, undo and redo
 * changes, and subscribe to transaction events.
 * @template Change - The type of changes that can be committed.
 */
export interface Transactor<Change> {
  /** Commits a change, returning the resultant record. */
  commit(change: Change, options?: CommitOptions): Commit<Change>;
  /** Undoes the most reset `past` `Commit`, if any, returning it. */
  undo(): Commit<Change> | undefined;
  /** Redoes the most recent `future` `Commit`, if any, returning it. */
  redo(): Commit<Change> | undefined;
  /** All changes that have been committed and not yet undone. */
  past: Commit<Change>[];
  /** All changes that have been undone and can be redone. */
  future: Commit<Change>[];
  /**
   * Registers `txCallback`, which will be called on every new `commit`.
   * @returns a function that will **unsubscribe** the callback, returning it.
   */
  subscribe(
    txCallback: TransactedCallback<Change>,
  ): () => TransactedCallback<Change>;
}
