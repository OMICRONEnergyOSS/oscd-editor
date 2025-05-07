import {
  EditV2,
  Insert,
  isComplex,
  isInsert,
  isRemove,
  isSetAttributes,
  isSetTextContent,
  Remove,
  SetAttributes,
  SetTextContent,
} from "./editv2.js";

function handleSetTextContent({
  element,
  textContent,
}: SetTextContent): (SetTextContent | Insert)[] {
  const { childNodes } = element;

  const restoreChildNodes: Insert[] = Array.from(childNodes).map((node) => ({
    parent: element,
    node,
    reference: null,
  }));

  element.textContent = textContent;

  const undoTextContent: SetTextContent = { element, textContent: "" };

  return [undoTextContent, ...restoreChildNodes];
}

function handleSetAttributes({
  element,
  attributes,
  attributesNS,
}: SetAttributes): SetAttributes {
  const oldAttributes = { ...attributes };
  const oldAttributesNS = { ...attributesNS };

  // save element's non-prefixed attributes for undo
  Object.keys(attributes)
    .reverse()
    .forEach((name) => {
      oldAttributes[name] = element.getAttribute(name);
    });

  // change element's non-prefixed attributes
  for (const entry of Object.entries(attributes)) {
    try {
      const [name, value] = entry as [string, string | null];
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    } catch (_e) {
      // undo nothing if update didn't work on this attribute
      delete oldAttributes[entry[0]];
    }
  }

  // save element's namespaced attributes for undo
  Object.entries(attributesNS).forEach(([ns, attrs]) => {
    Object.keys(attrs!)
      .reverse()
      .forEach((name) => {
        oldAttributesNS[ns] = {
          ...oldAttributesNS[ns],
          [name]: element.getAttributeNS(ns, name.split(":").pop()!),
        };
      });
    Object.keys(attrs!).forEach((name) => {
      delete oldAttributesNS[ns]![name];
    });
  });

  // change element's namespaced attributes
  for (const nsEntry of Object.entries(attributesNS)) {
    const [ns, attrs] = nsEntry as [
      string,
      Partial<Record<string, string | null>>,
    ];
    for (const entry of Object.entries(attrs)) {
      try {
        const [name, value] = entry as [string, string | null];
        if (value === null) {
          element.removeAttributeNS(ns, name.split(":").pop()!);
        } else {
          element.setAttributeNS(ns, name, value);
        }
      } catch (_e) {
        delete oldAttributesNS[ns]![entry[0]];
      }
    }
  }

  return {
    element,
    attributes: oldAttributes,
    attributesNS: oldAttributesNS,
  };
}

function handleRemove({ node }: Remove): Insert | [] {
  const { parentNode: parent, nextSibling: reference } = node;

  if (!parent) return [];

  parent.removeChild(node);
  return {
    node,
    parent,
    reference,
  };
}

function handleInsert({
  parent,
  node,
  reference,
}: Insert): Insert | Remove | [] {
  try {
    const { parentNode, nextSibling } = node;
    parent.insertBefore(node, reference);
    if (parentNode)
      // undo: move child node back to original place
      return {
        node,
        parent: parentNode,
        reference: nextSibling,
      };
    // undo: remove orphaned node
    return { node };
  } catch (_e) {
    // undo nothing if insert doesn't work on these nodes
    return [];
  }
}

/** Applies an EditV2, returning the corresponding "undo" EditV2. */
export function handleEdit(edit: EditV2): EditV2 {
  if (isInsert(edit)) return handleInsert(edit);
  if (isRemove(edit)) return handleRemove(edit);
  if (isSetAttributes(edit)) return handleSetAttributes(edit);
  if (isSetTextContent(edit)) return handleSetTextContent(edit);
  if (isComplex(edit))
    return edit
      .map((edit) => handleEdit(edit))
      .reverse()
      .flat(Infinity as 1);

  console.error(`Invalid edit provided: ${edit}`);

  return [];
}
