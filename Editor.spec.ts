/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "@open-wc/testing";

import { assert, property } from "fast-check";

import {
  insert,
  isValidInsert,
  remove,
  sclDocString,
  setAttributes,
  setTextContent,
  testDocs,
  UndoRedoTestCase,
  undoRedoTestCases,
  xmlAttributeName,
} from "./testHelpers.js";

import { EditV2, isSetAttributes, isSetTextContent } from "./editv2.js";

import { Editor, EditV2Editor } from "./Editor.js";

describe("Utility function to handle EditV2 edits", () => {
  let editor: Editor<EditV2>;
  let sclDoc: XMLDocument;

  beforeEach(async () => {
    editor = new EditV2Editor();
    sclDoc = new DOMParser().parseFromString(sclDocString, "application/xml");
  });

  it("inserts an element on Insert", () => {
    const parent = sclDoc.documentElement;
    const node = sclDoc.createElement("test");
    const reference = sclDoc.querySelector("Substation");
    editor.edit({ parent, node, reference }, {});
    expect(sclDoc.documentElement.querySelector("test")).to.have.property(
      "nextSibling",
      reference,
    );
  });

  it("removes an element on Remove", () => {
    const node = sclDoc.querySelector("Substation")!;
    editor.edit({ node }, {});

    expect(sclDoc.querySelector("Substation")).to.not.exist;
  });

  it("updates an element's attributes on SetAttributes", () => {
    const element = sclDoc.querySelector("Substation")!;
    editor.edit(
      {
        element,
        attributes: {
          name: "A2",
          desc: null,
          ["__proto__"]: "a string", // covers a rare edge case branch
        },
        attributesNS: {
          "http://example.org/myns": {
            "myns:attr": "value1",
            "myns:attr2": "value1",
          },
          "http://example.org/myns2": {
            attr: "value2",
            attr2: "value2",
          },
          "http://example.org/myns3": {
            attr: "value3",
            attr2: "value3",
          },
        },
      },
      {},
    );

    expect(element.getAttribute("name")).to.equal("A2");
    expect(element.getAttribute("desc")).to.be.null;
    expect(element.getAttribute("__proto__")).to.equal("a string");
    expect(element.getAttribute("myns:attr")).to.equal("value1");
    expect(element.getAttribute("myns:attr2")).to.equal("value1");
    expect(element.getAttribute("ens2:attr")).to.equal("value2");
    expect(element.getAttribute("ens2:attr2")).to.equal("value2");
    expect(element.getAttribute("ens3:attr")).to.equal("value3");
    expect(element.getAttribute("ens3:attr2")).to.equal("value3");
  });

  it("sets an element's textContent on SetTextContent", () => {
    const element = sclDoc.querySelector("SCL")!;

    const newTextContent = "someNewTextContent";
    editor.edit({
      element,
      textContent: newTextContent,
    });

    expect(element.textContent).to.equal(newTextContent);
  });

  it("squashes multiple edits into a single undoable edit", () => {
    const element = sclDoc.querySelector("Substation")!;

    const edit1: EditV2 = {
      element,
      attributes: {
        name: "A2",
        desc: null,
        ["__proto__"]: "a string", // covers a rare edge case branch
      },
      attributesNS: {
        "http://example.org/myns": {
          "myns:attr": "value1",
          "myns:attr2": "value1",
        },
        "http://example.org/myns2": {
          attr: "value2",
          attr2: "value2",
        },
        "http://example.org/myns3": {
          attr: "value3",
          attr2: "value3",
        },
      },
    };

    const edit2: EditV2 = {
      element,
      textContent: "someNewTextContent",
    };

    editor.edit(edit1, {});
    editor.edit(edit2, { squash: true });

    const history = editor.history;
    expect(history).to.have.length(1);

    expect((history[0].undo as EditV2[])[0]).to.satisfy(isSetTextContent);
    expect((history[0].undo as EditV2[])[1]).to.satisfy(isSetAttributes);

    expect(editor.docVersion).to.equal(2);
    expect(editor.editCount).to.equal(1);
  });

  it("processes complex edits in the given order", () => {
    const parent = sclDoc.documentElement;
    const reference = sclDoc.querySelector("Substation");
    const node1 = sclDoc.createElement("test1");
    const node2 = sclDoc.createElement("test2");
    editor.edit(
      [
        { parent, node: node1, reference },
        { parent, node: node2, reference },
      ],
      {},
    );
    expect(sclDoc.documentElement.querySelector("test1")).to.have.property(
      "nextSibling",
      node2,
    );
    expect(sclDoc.documentElement.querySelector("test2")).to.have.property(
      "nextSibling",
      reference,
    );

    expect(editor.docVersion).to.equal(1);
  });

  it("undoes a committed edit on undo() call", () => {
    const node = sclDoc.querySelector("Substation")!;

    editor.edit({ node });
    editor.undo();

    expect(sclDoc.querySelector("Substation")).to.exist;
    expect(editor.docVersion).to.equal(2);
  });

  it("redoes an undone edit on redo() call", () => {
    const node = sclDoc.querySelector("Substation")!;

    editor.edit({ node });
    editor.undo();
    editor.redo();

    expect(sclDoc.querySelector("Substation")).to.be.null;
    expect(editor.docVersion).to.equal(3);
  });

  describe("generally", () => {
    it("inserts elements on Insert edit events", () =>
      assert(
        property(
          testDocs.chain(([doc1, doc2]) => {
            const nodes = doc1.nodes.concat(doc2.nodes);
            return insert(nodes);
          }),
          (edit) => {
            editor.edit(edit);
            if (isValidInsert(edit))
              return (
                edit.node.parentElement === edit.parent &&
                edit.node.nextSibling === edit.reference
              );
            return true;
          },
        ),
      ));

    it("set's an element's textContent on SetTextContent edit events", () =>
      assert(
        property(
          testDocs.chain(([doc1, doc2]) => {
            const nodes = doc1.nodes.concat(doc2.nodes);
            return setTextContent(nodes);
          }),
          (edit) => {
            editor.edit(edit);

            return edit.element.textContent === edit.textContent;
          },
        ),
      ));

    it("updates default- and foreign-namespace attributes on UpdateNS events", () =>
      assert(
        property(
          testDocs.chain(([{ nodes }]) => setAttributes(nodes)),
          (edit) => {
            editor.edit(edit);
            return (
              Object.entries(edit.attributes)
                .filter(([name]) => xmlAttributeName.test(name))
                .map((entry) => entry as [string, string | null])
                .every(
                  ([name, value]) => edit.element.getAttribute(name) === value,
                ) &&
              Object.entries(edit.attributesNS)
                .map(
                  (entry) => entry as [string, Record<string, string | null>],
                )
                .every(([ns, attributes]) =>
                  Object.entries(attributes)
                    .filter(([name]) => xmlAttributeName.test(name))
                    .map((entry) => entry as [string, string | null])
                    .every(
                      ([name, value]) =>
                        edit.element.getAttributeNS(
                          ns,
                          name.includes(":")
                            ? <string>name.split(":", 2)[1]
                            : name,
                        ) === value,
                    ),
                )
            );
          },
        ),
      )).timeout(20000);

    it("removes elements on Remove edit events", () =>
      assert(
        property(
          testDocs.chain(([{ nodes }]) => remove(nodes)),
          ({ node }) => {
            editor.edit({ node });
            return !node.parentNode;
          },
        ),
      ));

    it("undoes up to n edits on undo(n) call", () =>
      assert(
        property(
          testDocs.chain((docs) => undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits, squash }: UndoRedoTestCase) => {
            const [oldDoc1, oldDoc2] = [doc1, doc2].map((doc) =>
              doc.cloneNode(true),
            );
            edits.forEach((a: EditV2) => {
              editor.edit(a, { squash });
            });
            if (editor.editCount) editor.undo(editor.editCount);
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

    it("redoes up to n edits on redo(n) call", () =>
      assert(
        property(
          testDocs.chain((docs) => undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits }: UndoRedoTestCase) => {
            edits.forEach((a: EditV2) => {
              editor.edit(a);
            });
            const [oldDoc1, oldDoc2] = [doc1, doc2].map((doc) =>
              new XMLSerializer().serializeToString(doc),
            );

            if (edits.length) {
              editor.undo(edits.length + 1);
              editor.redo(edits.length + 1);
            }
            const [newDoc1, newDoc2] = [doc1, doc2].map((doc) =>
              new XMLSerializer().serializeToString(doc),
            );
            return oldDoc1 === newDoc1 && oldDoc2 === newDoc2;
          },
        ),
      )).timeout(20000);
  });
});
