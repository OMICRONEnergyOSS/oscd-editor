import { EditV2 } from "./editv2.js";

import { handleEdit } from "./handleEdit.js";

export type LogEntry<E> = {
  undo: E;
  redo: E;
  title?: string;
};

export interface Editor<E> {
  history: LogEntry<E>[];
  docVersion: number;
  editCount: number;
  last: number;
  canUndo: boolean;
  canRedo: boolean;

  edit(edit: E, options?: { title?: string; squash?: boolean }): void;

  undo(n?: number): void;

  redo(n?: number): void;
}

export class EditV2Editor implements Editor<EditV2> {
  #history: LogEntry<EditV2>[] = [];
  get history(): LogEntry<EditV2>[] {
    return this.#history;
  }

  #docVersion = 0;
  get docVersion(): number {
    return this.#docVersion;
  }

  // index of the last applied edit in history (!not its length)
  #editCount = 0;
  get editCount(): number {
    return this.#editCount;
  }

  get last(): number {
    return this.#editCount - 1;
  }

  get canUndo(): boolean {
    return this.last >= 0;
  }

  get canRedo(): boolean {
    return this.#editCount < this.#history.length;
  }

  #updateVersion(): void {
    this.#docVersion += 1;
  }

  #squashUndo(undoEdits: EditV2): EditV2 {
    const lastHistory = this.#history[this.#history.length - 1];
    if (!lastHistory) return undoEdits;

    const lastUndo = lastHistory.undo;
    if (lastUndo instanceof Array && undoEdits instanceof Array)
      return [...undoEdits, ...lastUndo];

    if (lastUndo instanceof Array && !(undoEdits instanceof Array))
      return [undoEdits, ...lastUndo];

    if (!(lastUndo instanceof Array) && undoEdits instanceof Array)
      return [...undoEdits, lastUndo];

    return [undoEdits, lastUndo];
  }

  #squashRedo(edits: EditV2): EditV2 {
    const lastHistory = this.#history[this.#history.length - 1];
    if (!lastHistory) return edits;

    const lastRedo = lastHistory.redo;
    if (lastRedo instanceof Array && edits instanceof Array)
      return [...lastRedo, ...edits];

    if (lastRedo instanceof Array && !(edits instanceof Array))
      return [...lastRedo, edits];

    if (!(lastRedo instanceof Array) && edits instanceof Array)
      return [lastRedo, ...edits];

    return [lastRedo, edits];
  }

  #updateHistory({
    undo,
    redo,
    title = "",
    squash = false,
  }: {
    undo: EditV2;
    redo: EditV2;
    title?: string;
    squash?: boolean;
  }) {
    this.#history.splice(this.#editCount); // cut off history after current edit

    if (squash) {
      undo = this.#squashUndo(undo);
      redo = this.#squashRedo(redo);
      this.#history.pop();
    }

    this.#history.push({ undo, redo, title });
    this.#editCount = this.#history.length;
    this.#updateVersion();
  }

  edit(edit: EditV2, { title = "", squash = false } = {}): void {
    const redo = edit;
    const undo = handleEdit(edit);

    this.#updateHistory({ undo, redo, title, squash });
  }

  /** Undo the last `n` [[Edit]]s committed */
  undo(n = 1) {
    if (!this.canUndo || n < 1) return;
    handleEdit(this.#history[this.last!].undo);
    this.#editCount -= 1;
    this.#updateVersion();
    if (n > 1) this.undo(n - 1);
  }

  /** Redo the last `n` [[Edit]]s that have been undone */
  redo(n = 1) {
    if (!this.canRedo || n < 1) return;
    handleEdit(this.#history[this.#editCount].redo);
    this.#editCount += 1;
    this.#updateVersion();
    if (n > 1) this.redo(n - 1);
  }
}
