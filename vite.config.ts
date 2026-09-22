import { defineConfig } from "vite-plus"

export default defineConfig({
  fmt: {
    semi: false,
    trailingComma: "none",
    printWidth: 100,
    sortPackageJson: false,
    ignorePatterns: [
      "zold/**",
      "bun.lock",
      "**/*.html",
      "apps/buff/docs/history/**",
      "**/routeTree.gen.ts",
      "**/worker-configuration.d.ts",
      "apps/supply/drizzle/meta/**",
      "packages/cli/dotfiles/nvim/lazy-lock.json"
    ]
  },
  lint: {
    ignorePatterns: [
      "zold/**",
      "**/dist/**",
      "**/.output/**",
      "**/.wrangler/**",
      "**/routeTree.gen.ts",
      "**/worker-configuration.d.ts"
    ],
    plugins: ["typescript", "unicorn", "oxc", "import", "react", "vitest"],
    categories: {
      correctness: "error"
    },
    options: {
      typeAware: true,
      typeCheck: true
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin"
      }
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error"
    }
  }
})
