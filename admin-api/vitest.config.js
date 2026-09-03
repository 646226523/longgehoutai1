/** @type {import('vitest/config').UserConfig} */
module.exports = {
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/db.ts", "src/**/*.test.ts", "src/**/*.spec.ts"],
    },
  },
};