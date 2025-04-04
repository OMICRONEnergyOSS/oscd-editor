export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  /** Test files to run */
  files: ["dist/**/*.spec.js", "!node_modules/**/*"],

  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ["browser", "development"],
  },

  coverageConfig: {
    exclude: ["testHelpers.ts", "node_modules/**/*"],
  },
});
