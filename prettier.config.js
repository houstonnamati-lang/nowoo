module.exports = {
  printWidth: 100,
  importOrder: ["<THIRD_PARTY_MODULES>", "^@nowoo/(.*)$", "^[./]"],
  plugins: ["@trivago/prettier-plugin-sort-imports"],
};
