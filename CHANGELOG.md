# Changelog

## [1.7.0](https://github.com/OMICRONEnergyOSS/oscd-editor/compare/oscd-editor-v1.6.0...oscd-editor-v1.7.0) (2025-11-12)


### Features

* switched to @openscd/oscd-api + updated oscd-test-utils ([284888d](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/284888d9ae35392018a9b553d73e35552219dc0b))

## [1.6.0](https://github.com/OMICRONEnergyOSS/oscd-editor/compare/oscd-editor-v1.5.0...oscd-editor-v1.6.0) (2025-11-11)


### Features

* extend subscriber handling to publish on all changes (including undo & redo) ([9173b94](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/9173b94ad35133d938548f201b8764c96daeb5a0))


### Bug Fixes

* correct package.json repo url so provenance checks pass ([f4fd61d](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/f4fd61d339905ab255b74974157645b8f688af47))
* unsubscribe should remove the correct subscriber every time ([9899f8e](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/9899f8e982b9fef236862b2bfcf75e635b775f89)), closes [#11](https://github.com/OMICRONEnergyOSS/oscd-editor/issues/11)

## [1.5.0](https://github.com/OMICRONEnergyOSS/oscd-editor/compare/oscd-editor-v1.4.0...oscd-editor-v1.5.0) (2025-06-24)


### Features

* add Edit and EditV2 type guards ([7d5f002](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/7d5f00254d47b1270b41a2bdb857550a74ca94f1))
* add XMLEditor implements Transactor&lt;EditV2&gt; ([643eb36](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/643eb360c1b9ffefa62c386ba940d87d1273b2e6))
* console.error on invalid edit ([9663d03](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/9663d03b673823ac7d7b511af81622095b16e959))
* convertEdit ([898c4e3](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/898c4e317339dd7d9ee0d9591596dfa45f6bef76))
* Editor class ([028dcbc](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/028dcbc7613991c2f169a3d255a7bcfb17eb6028))
* **Editor:** make Editor generic ([2722c7a](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/2722c7a0bc9a39eb148d8d2a6230f4f48e7da807))
* handleEdit ([#2](https://github.com/OMICRONEnergyOSS/oscd-editor/issues/2)) ([5fbbdff](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/5fbbdffa21f5e02ff7dce7689b1b417dc810a6d7))


### Bug Fixes

* export iedEdit and isEditV2 ([bf3d1be](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/bf3d1be20d26f1baadff375000dc984535ce274e))
* fast-check to dependencies ([7113299](https://github.com/OMICRONEnergyOSS/oscd-editor/commit/711329975994a4f4ac206537125d9f34751b1f26))
