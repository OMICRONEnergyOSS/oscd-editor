import { EditV2 } from "./editv2.js";

import { handleEdit } from "./handleEdit.js";
import {
  Commit,
  TransactedCallback,
  CommitOptions,
  Transactor,
} from "./Transactor.js";

export class XMLEditor implements Transactor<EditV2> {
  past: Commit<EditV2>[] = [];
  future: Commit<EditV2>[] = [];

  commit(
    change: EditV2,
    { title, squash }: CommitOptions = {},
  ): Commit<EditV2> {
    const commit: Commit<EditV2> =
      squash && this.past.length
        ? this.past[this.past.length - 1]
        : { undo: [], redo: [] };
    const undo = handleEdit(change);
    // typed as per https://github.com/microsoft/TypeScript/issues/49280#issuecomment-1144181818 recommendation:
    commit.undo.unshift(...[undo].flat(Infinity as 1));
    commit.redo.push(...[change].flat(Infinity as 1));
    if (title) commit.title = title;
    if (squash && this.past.length) this.past.pop();
    this.past.push(commit);
    this.future = [];
    this.#subscribers.forEach((subscriber) => subscriber(commit));
    return commit;
  }

  undo(): Commit<EditV2> | undefined {
    const commit = this.past.pop();
    if (!commit) return;
    handleEdit(commit.undo);
    this.future.unshift(commit);
    return commit;
  }

  redo(): Commit<EditV2> | undefined {
    const commit = this.future.shift();
    if (!commit) return;
    handleEdit(commit.redo);
    this.past.push(commit);
    return commit;
  }

  #subscribers: TransactedCallback<EditV2>[] = [];

  subscribe(
    txCallback: TransactedCallback<EditV2>,
  ): () => TransactedCallback<EditV2> {
    const subscriberCount = this.#subscribers.length;
    this.#subscribers.push(txCallback);
    return () => {
      this.#subscribers.splice(subscriberCount, 1);
      return txCallback;
    };
  }
}
