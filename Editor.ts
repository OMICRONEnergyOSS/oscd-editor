import { LitElement } from "lit";
import { state } from "lit/decorators.js";

import { EditEventV2 } from "./edit-event.js";

import { EditV2, handleEdit } from "./handleEdit.js";

export type LogEntry = {
  undo: EditV2;
  redo: EditV2;
  title?: string;
};

export class Editor extends LitElement {
  @state()
  history: LogEntry[] = [];

  @state()
  docVersion = 0;

  // index of the last applied edit in history (!not its length)
  @state()
  editCount = 0;

  @state()
  get last(): number {
    return this.editCount - 1;
  }

  @state()
  get canUndo(): boolean {
    return this.last >= 0;
  }

  @state()
  get canRedo(): boolean {
    return this.editCount < this.history.length;
  }

  /** The set of `XMLDocument`s currently loaded */
  @state()
  docs: Record<string, XMLDocument> = {};

  updateVersion(): void {
    this.docVersion += 1;
  }

  squashUndo(undoEdits: EditV2): EditV2 {
    const lastHistory = this.history[this.history.length - 1];
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

  squashRedo(edits: EditV2): EditV2 {
    const lastHistory = this.history[this.history.length - 1];
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

  handleEditEvent(event: EditEventV2) {
    const { edit, title } = event.detail;
    const squash = !!event.detail.squash;

    this.history.splice(this.editCount); // cut history at editCount

    const undo = squash ? this.squashUndo(handleEdit(edit)) : handleEdit(edit);
    const redo = squash ? this.squashRedo(edit) : edit;

    if (squash) this.history.pop(); // combine with last edit in history

    this.history.push({ undo, redo, title });
    this.editCount = this.history.length;
    this.updateVersion();
  }

  /** Undo the last `n` [[Edit]]s committed */
  undo(n = 1) {
    if (!this.canUndo || n < 1) return;
    handleEdit(this.history[this.last!].undo);
    this.editCount -= 1;
    this.updateVersion();
    if (n > 1) this.undo(n - 1);
  }

  /** Redo the last `n` [[Edit]]s that have been undone */
  redo(n = 1) {
    if (!this.canRedo || n < 1) return;
    handleEdit(this.history[this.editCount].redo);
    this.editCount += 1;
    this.updateVersion();
    if (n > 1) this.redo(n - 1);
  }

  constructor() {
    super();

    this.addEventListener("oscd-edit-v2", (event) =>
      this.handleEditEvent(event)
    );
  }
}
