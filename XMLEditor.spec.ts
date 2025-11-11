/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from '@open-wc/testing';

import { assert, property } from 'fast-check';

import {
  testDocs,
  UndoRedoTestCase,
  undoRedoTestCases,
} from '@omicronenergy/oscd-test-utils';

import { Commit, EditV2, Transactor } from '@openscd/oscd-api';

import { isSetTextContent, isSetAttributes } from '@openscd/oscd-api/utils.js';

import { XMLEditor } from './XMLEditor.js';
import sinon from 'sinon';

export const sclDocString = `<?xml version="1.0" encoding="UTF-8"?>
    <SCL version="2007" revision="B" xmlns="http://www.iec.ch/61850/2003/SCL" xmlns:ens1="http://example.org/somePreexistingExtensionNamespace">
    <Substation name="A1" desc="test substation"></Substation>
  </SCL>`;

describe('XMLEditor', () => {
  let editor: Transactor<EditV2>;
  let sclDoc: XMLDocument;

  beforeEach(() => {
    editor = new XMLEditor();
    sclDoc = new DOMParser().parseFromString(sclDocString, 'application/xml');
  });

  it('inserts an element on Insert', () => {
    const parent = sclDoc.documentElement;
    const node = sclDoc.createElement('test');
    const reference = sclDoc.querySelector('Substation');
    editor.commit({ parent, node, reference });
    expect(sclDoc.documentElement.querySelector('test')).to.have.property(
      'nextSibling',
      reference,
    );
  });

  it('removes an element on Remove', () => {
    const node = sclDoc.querySelector('Substation')!;
    editor.commit({ node });

    expect(sclDoc.querySelector('Substation')).to.not.exist;
  });

  it("updates an element's attributes on SetAttributes", () => {
    const element = sclDoc.querySelector('Substation')!;
    editor.commit(
      {
        element,
        attributes: {
          name: 'A2',
          desc: null,
          ['__proto__']: 'a string', // covers a rare edge case branch
        },
        attributesNS: {
          'http://example.org/myns': {
            'myns:attr': 'value1',
            'myns:attr2': 'value1',
          },
        },
      },
      {},
    );

    expect(element.getAttribute('name')).to.equal('A2');
    expect(element.getAttribute('desc')).to.be.null;
    expect(element.getAttribute('__proto__')).to.equal('a string');
    expect(element.getAttribute('myns:attr')).to.equal('value1');
    expect(element.getAttribute('myns:attr2')).to.equal('value1');
  });

  it("sets an element's textContent on SetTextContent", () => {
    const element = sclDoc.querySelector('SCL')!;

    const newTextContent = 'someNewTextContent';
    editor.commit({
      element,
      textContent: newTextContent,
    });

    expect(element.textContent).to.equal(newTextContent);
  });

  it('records a commit history', () => {
    const node = sclDoc.querySelector('Substation')!;
    const edit = { node };
    editor.commit(edit);
    expect(editor.past).to.have.lengthOf(1);
    expect(editor.past[0])
      .to.exist.and.property('redo')
      .to.have.lengthOf(1)
      .and.to.include(edit);
  });

  it('records a given title in the commit history', () => {
    const node = sclDoc.querySelector('SCL')!;

    editor.commit(
      {
        node,
      },
      { title: 'delete everything' },
    );

    expect(editor.past[editor.past.length - 1]).to.have.property(
      'title',
      'delete everything',
    );
  });

  it('squashes multiple edits into a single undoable edit', () => {
    const element = sclDoc.querySelector('Substation')!;

    const edit1: EditV2 = {
      element,
      attributes: {
        name: 'A2',
        desc: null,
        ['__proto__']: 'a string', // covers a rare edge case branch
      },
      attributesNS: {
        'http://example.org/myns': {
          'myns:attr': 'value1',
          'myns:attr2': 'value1',
        },
        'http://example.org/myns2': {
          attr: 'value2',
          attr2: 'value2',
        },
        'http://example.org/myns3': {
          attr: 'value3',
          attr2: 'value3',
        },
      },
    };

    const edit2: EditV2 = {
      element,
      textContent: 'someNewTextContent',
    };

    editor.commit(edit1, {});
    editor.commit(edit2, { squash: true });

    const history = editor.past;
    expect(history).to.have.length(1);

    expect((history[0].undo as EditV2[])[0]).to.satisfy(isSetTextContent);
    expect((history[0].undo as EditV2[])[1]).to.satisfy(isSetAttributes);
  });

  it('processes complex edits in the given order', () => {
    const parent = sclDoc.documentElement;
    const reference = sclDoc.querySelector('Substation');
    const node1 = sclDoc.createElement('test1');
    const node2 = sclDoc.createElement('test2');
    editor.commit(
      [
        { parent, node: node1, reference },
        { parent, node: node2, reference },
      ],
      {},
    );
    expect(sclDoc.documentElement.querySelector('test1')).to.have.property(
      'nextSibling',
      node2,
    );
    expect(sclDoc.documentElement.querySelector('test2')).to.have.property(
      'nextSibling',
      reference,
    );
  });

  it('undoes a committed edit on undo() call', () => {
    const node = sclDoc.querySelector('Substation')!;

    const commit = editor.commit({ node });
    const undone = editor.undo();

    expect(undone).to.exist.and.to.equal(commit);
    expect(sclDoc.querySelector('Substation')).to.exist;
  });

  it('redoes an undone edit on redo() call', () => {
    const node = sclDoc.querySelector('Substation')!;

    const commit = editor.commit({ node });
    editor.undo();
    const redone = editor.redo();

    expect(redone).to.exist.and.to.equal(commit);
    expect(sclDoc.querySelector('Substation')).to.be.null;
  });

  it('undoes nothing at the beginning of the history', () => {
    const node = sclDoc.querySelector('Substation')!;

    editor.commit({ node });
    editor.undo();
    const secondUndo = editor.undo();

    expect(secondUndo).to.not.exist;
  });

  it('redoes nothing at the end of the history', () => {
    const node = sclDoc.querySelector('Substation')!;

    editor.commit({ node });
    const redo = editor.redo();

    expect(redo).to.not.exist;
  });

  it('allows the user to subscribe to commits and to unsubscribe', () => {
    const node = sclDoc.querySelector('Substation')!;
    const edit = { node };
    let committed: Commit<EditV2> | undefined;
    let called = 0;
    const callback = (commit: Commit<EditV2>) => {
      committed = commit;
      called++;
    };
    const unsubscribe = editor.subscribe(callback);
    editor.commit(edit, { title: 'test' });
    expect(committed).to.exist.and.to.have.property('redo').to.include(edit);
    expect(committed).to.have.property('title', 'test');
    expect(called).to.equal(1);
    expect(editor.past).to.have.lengthOf(1);

    const unsubscribed = unsubscribe();
    expect(unsubscribed).to.equal(callback);

    editor.commit(edit, { title: 'some other title, not test' });
    expect(committed).to.have.property('title', 'test');
    expect(called).to.equal(1);
    expect(editor.past).to.have.lengthOf(2);
  });

  it('notifies subscribers on undo with the previous commit', () => {
    const node = sclDoc.querySelector('Substation')!;
    const edit = { node };

    const subscriber = sinon.spy();

    editor.subscribe(subscriber);

    const firstCommit = editor.commit(edit, { title: 'first' });
    sinon.assert.calledOnce(subscriber);
    sinon.assert.calledWithExactly(subscriber, firstCommit);

    const secondCommit = editor.commit(edit, { title: 'second' });
    sinon.assert.calledTwice(subscriber);
    sinon.assert.calledWithExactly(subscriber, secondCommit);

    editor.undo();
    sinon.assert.calledThrice(subscriber);
    sinon.assert.calledWithExactly(subscriber, firstCommit);
  });

  it('notifies subscribers on redo with the redone commit', () => {
    const node = sclDoc.querySelector('Substation')!;
    const edit = { node };

    const subscriber = sinon.spy();

    editor.subscribe(subscriber);

    const firstCommit = editor.commit(edit, { title: 'first' });
    sinon.assert.calledOnce(subscriber);
    sinon.assert.calledWithExactly(subscriber, firstCommit);

    const secondCommit = editor.commit(edit, { title: 'second' });
    sinon.assert.calledTwice(subscriber);
    sinon.assert.calledWithExactly(subscriber, secondCommit);

    editor.undo();
    sinon.assert.calledThrice(subscriber);
    sinon.assert.calledWithExactly(subscriber, firstCommit);

    editor.redo();
    sinon.assert.callCount(subscriber, 4);
    sinon.assert.calledWithExactly(subscriber, secondCommit);
  });

  it('unsubscribes the correct subscriber among many', () => {
    const node = sclDoc.querySelector('Substation')!;
    const edit = { node };

    const subscriber1 = sinon.spy();
    const subscriber2 = sinon.spy();
    const subscriber3 = sinon.spy();

    const unsubscribe1 = editor.subscribe(subscriber1);
    const unsubscribe2 = editor.subscribe(subscriber2);
    const unsubscribe3 = editor.subscribe(subscriber3);

    editor.commit(edit, { title: 'test' });

    sinon.assert.calledOnce(subscriber1);
    sinon.assert.calledOnce(subscriber2);
    sinon.assert.calledOnce(subscriber3);

    unsubscribe1();
    unsubscribe3();

    subscriber1.resetHistory();
    subscriber2.resetHistory();
    subscriber3.resetHistory();

    editor.commit(edit, { title: 'test2' });

    sinon.assert.notCalled(subscriber1);
    sinon.assert.calledOnce(subscriber2);
    sinon.assert.notCalled(subscriber3);

    unsubscribe2();

    subscriber2.resetHistory();

    editor.commit(edit, { title: 'test3' });

    sinon.assert.notCalled(subscriber2);
  });

  describe('generally', () => {
    it('undoes up to n edits on undo(n) call', () =>
      assert(
        property(
          testDocs.chain(docs => undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits, squash }: UndoRedoTestCase) => {
            const [oldDoc1, oldDoc2] = [doc1, doc2].map(doc =>
              doc.cloneNode(true),
            );
            edits.forEach((a: EditV2) => {
              try {
                editor.commit(a, { squash });
              } catch (e) {
                console.log('error', e);
              }
            });
            while (editor.past.length) editor.undo();
            expect(doc1).to.satisfy((doc: XMLDocument) =>
              doc.isEqualNode(oldDoc1),
            );
            expect(doc2).to.satisfy((doc: XMLDocument) =>
              doc.isEqualNode(oldDoc2),
            );
            return true;
          },
        ),
      )).timeout(20000);

    it('redoes up to n edits on redo(n) call', () =>
      assert(
        property(
          testDocs.chain(docs => undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits }: UndoRedoTestCase) => {
            edits.forEach((a: EditV2) => {
              editor.commit(a);
            });
            const [oldDoc1, oldDoc2] = [doc1, doc2].map(doc =>
              new XMLSerializer().serializeToString(doc),
            );

            while (editor.past.length) editor.undo();
            while (editor.future.length) editor.redo();
            const [newDoc1, newDoc2] = [doc1, doc2].map(doc =>
              new XMLSerializer().serializeToString(doc),
            );
            return oldDoc1 === newDoc1 && oldDoc2 === newDoc2;
          },
        ),
      )).timeout(20000);
  });
});
