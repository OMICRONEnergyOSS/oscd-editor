import { handleEdit } from './handleEdit.js';
import {
  Commit,
  CommitOptions,
  EditV2,
  TransactedCallback,
  Transactor,
} from '@openscd/oscd-api';

const EMPTY_COMMIT: Commit<EditV2> = { undo: [], redo: [], time: Date.now() };

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
        : { undo: [], redo: [], time: Date.now() };
    const undo = handleEdit(change);
    // typed as per https://github.com/microsoft/TypeScript/issues/49280#issuecomment-1144181818 recommendation:
    commit.undo.unshift(...[undo].flat(Infinity as 1));
    commit.redo.push(...[change].flat(Infinity as 1));
    if (title) commit.title = title;
    if (squash && this.past.length) this.past.pop();
    this.past.push(commit);
    this.future = [];
    this.#subscribers.forEach(subscriber => subscriber(commit));
    return commit;
  }

  undo(): Commit<EditV2> | undefined {
    const commit = this.past.pop();
    if (!commit) return;
    handleEdit(commit.undo);
    this.future.unshift(commit);
    const previousCommit = this.past[this.past.length - 1] || EMPTY_COMMIT;
    this.#subscribers.forEach(subscriber => subscriber(previousCommit));
    return commit;
  }

  redo(): Commit<EditV2> | undefined {
    const commit = this.future.shift();
    if (!commit) return;
    handleEdit(commit.redo);
    this.past.push(commit);
    this.#subscribers.forEach(subscriber => subscriber(commit));
    return commit;
  }

  #subscribers: TransactedCallback<EditV2>[] = [];

  subscribe(
    txCallback: TransactedCallback<EditV2>,
  ): () => TransactedCallback<EditV2> {
    this.#subscribers.push(txCallback);
    return () => {
      this.#subscribers = this.#subscribers.filter(
        subscriber => subscriber !== txCallback,
      );
      return txCallback;
    };
  }
}
