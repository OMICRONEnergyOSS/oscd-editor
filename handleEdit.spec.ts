/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from "@open-wc/testing";

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

import { EditV2, Insert } from "./editv2.js";
import { handleEdit } from "./handleEdit.js";

import { assert, property } from "fast-check";

describe("handleEdit", () => {
  let sclDoc: XMLDocument;

  beforeEach(async () => {
    sclDoc = new DOMParser().parseFromString(sclDocString, "application/xml");
  });

  it("does nothing given invalid input", () => {
    const sclDocStringBefore = new XMLSerializer().serializeToString(sclDoc);

    const parent = sclDoc.documentElement;
    const node = sclDoc.createElement("test");
    const reference = sclDoc.querySelector("Substation");
    const invalidedit = {
      parent,
      someinvalidkey: node,
      reference,
    } as unknown as Insert;

    const undoEdit = handleEdit(invalidedit);

    const sclDocStringAfter = new XMLSerializer().serializeToString(sclDoc);

    expect(undoEdit).to.be.an("array").that.is.empty;
    expect(sclDocStringBefore).to.equal(sclDocStringAfter);
  });

  it("inserts an element given an Insert", () => {
    const parent = sclDoc.documentElement;
    const node = sclDoc.createElement("test");
    const reference = sclDoc.querySelector("Substation");
    handleEdit({ parent, node, reference });
    expect(sclDoc.documentElement.querySelector("test")).to.have.property(
      "nextSibling",
      reference,
    );
  });

  it("removes an element given a Remove", () => {
    const node = sclDoc.querySelector("Substation")!;
    handleEdit({ node });
    expect(sclDoc.querySelector("Substation")).to.not.exist;
  });

  it("updates an element's attributes given a SetAttributes", () => {
    const element = sclDoc.querySelector("Substation")!;
    handleEdit({
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
    });

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

  it("sets an element's textContent given a SetTextContent", () => {
    const element = sclDoc.querySelector("SCL")!;

    const newTextContent = "someNewTextContent";
    handleEdit({
      element,
      textContent: newTextContent,
    });

    expect(element.textContent).to.equal(newTextContent);
  });

  it("processes complex edits in the given order", () => {
    const parent = sclDoc.documentElement;
    const reference = sclDoc.querySelector("Substation");
    const node1 = sclDoc.createElement("test1");
    const node2 = sclDoc.createElement("test2");
    handleEdit([
      { parent, node: node1, reference },
      { parent, node: node2, reference },
    ]);
    expect(sclDoc.documentElement.querySelector("test1")).to.have.property(
      "nextSibling",
      node2,
    );
    expect(sclDoc.documentElement.querySelector("test2")).to.have.property(
      "nextSibling",
      reference,
    );
  });

  it("returns an undo edit that undoes the original edit", () => {
    const node = sclDoc.querySelector("Substation")!;
    const undoEdit = handleEdit({ node }); // do edit
    handleEdit(undoEdit); // undo edit
    expect(sclDoc.querySelector("Substation")).to.exist;
  });

  it("returns the original edit when called on an undo edit", () => {
    const node = sclDoc.querySelector("Substation")!;
    const undoEdit = handleEdit({ node });
    const redoEdit = handleEdit(undoEdit);
    handleEdit(redoEdit);
    expect(sclDoc.querySelector("Substation")).to.not.exist;
  });

  describe("generally", () => {
    it("inserts elements given Inserts", () =>
      assert(
        property(
          testDocs.chain(([doc1, doc2]) => {
            const nodes = doc1.nodes.concat(doc2.nodes);
            return insert(nodes);
          }),
          (edit) => {
            handleEdit(edit);
            if (isValidInsert(edit))
              return (
                edit.node.parentElement === edit.parent &&
                edit.node.nextSibling === edit.reference
              );
            return true;
          },
        ),
      ));

    it("set's an element's textContent given SetTextContents", () =>
      assert(
        property(
          testDocs.chain(([doc1, doc2]) => {
            const nodes = doc1.nodes.concat(doc2.nodes);
            return setTextContent(nodes);
          }),
          (edit) => {
            handleEdit(edit);

            return edit.element.textContent === edit.textContent;
          },
        ),
      ));

    it("applies the last attribute of the same unprefixed name, per namespace", () => {
      const element = sclDoc.createElement("test");
      const xmlTextBefore = new XMLSerializer().serializeToString(element);
      const testEdit = {
        element,
        attributes: {},
        attributesNS: { "http://a.aa": { "A:Y": null, "B:Y": "abc", Y: "" } },
      };
      const undo = handleEdit(testEdit);
      expect(element.getAttributeNS("http://a.aa", "Y")).to.equal("");

      handleEdit(undo);
      expect(new XMLSerializer().serializeToString(element)).to.equal(
        xmlTextBefore,
      );
    });

    it("updates attributes given SetAttributes", () =>
      assert(
        property(
          testDocs.chain(([{ nodes }]) => setAttributes(nodes)),
          (edit) => {
            handleEdit(edit);
            const attributesHandledCorrectly = Object.entries(edit.attributes)
              .filter(([name]) => xmlAttributeName.test(name))
              .map((entry) => entry as [string, string | null])
              .every(
                ([name, value]) => edit.element.getAttribute(name) === value,
              );
            const attributesNSHandledCorrectly = Object.entries(
              edit.attributesNS,
            )
              .map((entry) => entry as [string, Record<string, string | null>])
              .every(([ns, attributes]) => {
                const unprefixedAttributes = Object.fromEntries(
                  Object.entries(attributes)
                    .filter(([name]) => xmlAttributeName.test(name))
                    .map((entry) => entry as [string, string | null])
                    .map(([name, value]) => [name.split(":", 2).pop(), value])
                    .filter(([name]) => name),
                );
                return Object.entries(unprefixedAttributes).every(
                  ([name, value]) =>
                    edit.element.getAttributeNS(ns, name!) === value,
                );
              });
            return attributesHandledCorrectly && attributesNSHandledCorrectly;
          },
        ),
      )).timeout(20000);

    it("removes elements given Removes", () =>
      assert(
        property(
          testDocs.chain(([{ nodes }]) => remove(nodes)),
          ({ node }) => {
            handleEdit({ node });
            return !node.parentNode;
          },
        ),
      ));

    it("leaves the document unchanged after undoing all edits", () =>
      assert(
        property(
          testDocs.chain((docs) => undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits }: UndoRedoTestCase) => {
            const [oldDoc1, oldDoc2] = [doc1, doc2].map((doc) =>
              doc.cloneNode(true),
            );
            const undoEdits: EditV2[] = [];
            edits.forEach((a: EditV2) => {
              const ed = handleEdit(a);
              undoEdits.unshift(ed);
            });
            if (edits.length) handleEdit(undoEdits);
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

    it("changes the document the same way when redoing undone edits", () =>
      assert(
        property(
          testDocs.chain((docs) => undoRedoTestCases(...docs)),
          ({ doc1, doc2, edits }: UndoRedoTestCase) => {
            const undoEdits: EditV2[] = [];
            edits.forEach((a: EditV2) => {
              undoEdits.unshift(handleEdit(a));
            });
            const [oldDoc1, oldDoc2] = [doc1, doc2].map((doc) =>
              new XMLSerializer().serializeToString(doc),
            );
            const redoEdits: EditV2[] = [];

            if (edits.length) {
              redoEdits.unshift(handleEdit(undoEdits));
              handleEdit(redoEdits);
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
