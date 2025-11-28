This repository hold the XML editing engine, following the newest agreed [OpenSCD Plugin API](https://github.com/openscd/oscd-api/blob/main/docs/plugin-api.md)

## Usage

You can either load and use the `handleEdit` function through npm or other content delivery networks. This function does manipulate a XMLDocument as per user intent through the edit as its input:

```ts
const removeNode: Remove = { node: toBeRemovedNode };
handleEdit(removeNode);
```

You can also use the exported `EditV2Editor` class which keeps track of an undo/redo
history. This class is a wrapper around the `handleEdit` function and provides
a more user-friendly API. The `EditV2Editor` class can be used as follows:

```ts
import { EditV2Editor } from '@openscd/oscd-editor';

const editor = new EditV2Editor();

const removeNode: Remove = { node: toBeRemovedNode };
editor.handleEdit(removeNode);

expect(toBeRemovedNode.parentNode).to.not.exist;

editor.undo(); // undo the latest edit

expect(toBeRemovedNode.parentNode).to.exist;

editor.redo(); // redo the most recently undone edit

expect(toBeRemovedNode.parentNode).to.not.exist;
```

## Linting and formatting

To scan the project for linting and formatting errors, run

> npm run lint

To automatically fix linting and formatting errors, run

> npm run format

We use ESLint and Prettier for linting and formatting. Plugins for automatic formatting and linting during editing are available for vim, emacs, VSCode, and all popular IDEs.

## Testing with Web Test Runner

To execute a single test run:

> npm test

To run the tests in interactive watch mode run:

> npm run test:watch

# License

This project is licensed under the Apache License 2.0.

© 2025 Jakob Vogelsang, OMICRON electronics GmbH
