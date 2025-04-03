const filteredLogs = ["in dev mode", "scheduled an update", "Multiple versions of Lit"];

export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  filterBrowserLogs(log) {
    for (const arg of log.args) {
      if (
        typeof arg === "string" &&
        filteredLogs.some((l) => arg.includes(l))
      ) {
        return false;
      }
    }
    return true;
  },

  /** Test files to run */
  files: ["dist/**/*.spec.js", "!node_modules/**/*"],

  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ["browser", "development"],
  },

  coverageConfig: {
    exclude: ["testHelpers.ts", "node_modules/**/*"],
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto',

  /** Amount of browsers to run concurrently */
  // concurrentBrowsers: 2,

  /** Amount of test files per browser to test concurrently */
  // concurrency: 1,

  /** Browsers to run tests on */
  // browsers: [
  //   playwrightLauncher({ product: 'chromium' }),
  //   playwrightLauncher({ product: 'firefox' }),
  //   playwrightLauncher({ product: 'webkit' }),
  // ],

  // See documentation for all available options
});
