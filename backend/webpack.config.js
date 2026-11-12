// @ts-check
const path = require('node:path');

/**
 * Extends the Nest CLI's webpack config with the @app/common alias. Nest's built-in path
 * plugin only reads tsconfig `paths` when `baseUrl` is set, and TypeScript is retiring
 * `baseUrl`, so the alias is declared here instead.
 *
 * @param {import('webpack').Configuration} options
 */
module.exports = (options) => ({
  ...options,
  resolve: {
    ...options.resolve,
    alias: {
      ...options.resolve?.alias,
      '@app/common': path.resolve(__dirname, 'libs/common/src'),
    },
  },
});
