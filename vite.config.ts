import path from "node:path";

import { defineConfig, type Plugin } from "vite-plus";

import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import mkcert from "vite-plugin-mkcert";
import tailwindcss from "@tailwindcss/vite";

import packageJson from "./package.json" with { type: "json" };

const visualizerPlugin = visualizer({
  filename: "./dist/stats.html",
  gzipSize: true,
  brotliSize: true,
  open: false,
});

const pwaPlugin = VitePWA({
  registerType: "prompt",
  manifest: false, // Check public/site.webmanifest
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
    // Allow larger artifacts (like the analyzer `stats.html`) without failing the build
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
});

// https://viteplus.dev/config/
export default defineConfig(({ mode }) => {
  return {
    server: {
      host: "::",
      port: 3000,
    },
    plugins: [
      react(),
      tailwindcss(),
      mode === "development" && componentTagger(),
      pwaPlugin,
      process.env.HTTPS === "true" && mkcert(),
      process.env.ANALYZE === "true" && (visualizerPlugin as Plugin),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("recharts")) return "vendor_recharts";
              if (id.includes("framer-motion")) return "vendor_framer";
              if (id.includes("dexie")) return "vendor_dexie";
              if (id.includes("date-fns")) return "vendor_datefns";
              return "vendor";
            }
          },
        },
      },
    },
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    test: {
      // Unit tests only; Playwright specs under tests/e2e run via `bun run test:e2e`.
      include: ["src/**/*.test.ts"],
    },
    lint: {
      plugins: [],
      jsPlugins: ["@shadcn/lint", { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
      categories: {
        correctness: "warn",
      },
      env: {
        builtin: true,
      },
      ignorePatterns: ["dist", ".omp/**"],
      options: { typeAware: true, typeCheck: true },
      rules: {
        "shadcn/no-restyle": [
          "error",
          {
            allow: ["layout"],
            contracts: [
              {
                pattern: "(Content|Header|Footer|Group|List|Item|Trigger|Panel)$",
                allow: ["layout", "spacing"],
              },
              { pattern: "(Header|Footer)$", allow: ["layout", "spacing", "border-t"] },
              { pattern: "(Title|Description)$", allow: ["layout", "spacing", "typography"] },
              {
                pattern: "^(Input|Textarea|SelectTrigger)$",
                allow: ["layout", "typography", "pl-*", "pr-*", "resize-none"],
              },
              {
                pattern: "^Label$",
                allow: ["layout", "typography", "text-muted-foreground", "text-destructive"],
              },
            ],
          },
        ],
        "shadcn/no-raw-colors": "error",
        "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
        "shadcn/no-inline-styles": "error",
        "shadcn/no-unknown-classes": ["error", { allow: ["toaster"] }],
        "shadcn/require-static-classes": "error",
        "vite-plus/prefer-vite-plus-imports": "error",
      },
      overrides: [
        {
          files: ["**/*.{ts,tsx}"],
          rules: {
            "constructor-super": "off",
            "for-direction": "error",
            "no-async-promise-executor": "error",
            "no-case-declarations": "error",
            "no-class-assign": "off",
            "no-compare-neg-zero": "error",
            "no-cond-assign": "error",
            "no-const-assign": "off",
            "no-constant-binary-expression": "error",
            "no-constant-condition": "error",
            "no-control-regex": "error",
            "no-debugger": "error",
            "no-delete-var": "error",
            "no-dupe-class-members": "off",
            "no-dupe-else-if": "error",
            "no-dupe-keys": "off",
            "no-duplicate-case": "error",
            "no-empty": "error",
            "no-empty-character-class": "error",
            "no-empty-pattern": "error",
            "no-empty-static-block": "error",
            "no-ex-assign": "error",
            "no-extra-boolean-cast": "error",
            "no-fallthrough": "error",
            "no-func-assign": "off",
            "no-global-assign": "error",
            "no-import-assign": "off",
            "no-invalid-regexp": "error",
            "no-irregular-whitespace": "error",
            "no-loss-of-precision": "error",
            "no-misleading-character-class": "error",
            "no-new-native-nonconstructor": "off",
            "no-nonoctal-decimal-escape": "error",
            "no-obj-calls": "off",
            "no-prototype-builtins": "error",
            "no-redeclare": "off",
            "no-regex-spaces": "error",
            "no-self-assign": "error",
            "no-setter-return": "off",
            "no-shadow-restricted-names": "error",
            "no-sparse-arrays": "error",
            "no-this-before-super": "off",
            "no-unexpected-multiline": "error",
            "no-unsafe-finally": "error",
            "no-unsafe-negation": "off",
            "no-unsafe-optional-chaining": "error",
            "no-unused-labels": "error",
            "no-unused-private-class-members": "error",
            "no-unused-vars": [
              "error",
              {
                vars: "all",
                varsIgnorePattern: "^_",
                args: "after-used",
                argsIgnorePattern: "^_",
              },
            ],
            "no-useless-backreference": "error",
            "no-useless-catch": "error",
            "no-useless-escape": "error",
            "no-with": "off",
            "require-yield": "error",
            "use-isnan": "error",
            "valid-typeof": "error",
            "no-var": "error",
            "prefer-const": "error",
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            "@typescript-eslint/ban-ts-comment": "error",
            "no-array-constructor": "error",
            "@typescript-eslint/no-duplicate-enum-values": "error",
            "@typescript-eslint/no-empty-object-type": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-extra-non-null-assertion": "error",
            "@typescript-eslint/no-misused-new": "error",
            "@typescript-eslint/no-namespace": "error",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
            "@typescript-eslint/no-require-imports": "error",
            "@typescript-eslint/no-this-alias": "error",
            "@typescript-eslint/no-unnecessary-type-constraint": "error",
            "@typescript-eslint/no-unsafe-declaration-merging": "error",
            "@typescript-eslint/no-unsafe-function-type": "error",
            "no-unused-expressions": "error",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/prefer-namespace-keyword": "error",
            "@typescript-eslint/triple-slash-reference": "error",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react/only-export-components": [
              "warn",
              {
                allowConstantExport: true,
              },
            ],
          },
          plugins: ["typescript", "react"],
          env: {
            es2020: true,
            browser: true,
          },
        },
        {
          files: ["src/components/ui/**"],
          rules: {
            "shadcn/no-restyle": "off",
            "shadcn/no-arbitrary-values": "off",
            "shadcn/require-static-classes": "off",
            "react/only-export-components": "off",
          },
          plugins: ["typescript", "react"],
        },
      ],
    },
    fmt: {
      // CHANGELOG.md is generated by release-please; .agents/** holds vendored skills pinned by skills-lock.json.
      ignorePatterns: ["CHANGELOG.md", "netlify.toml", ".agents/**"],
    },
    staged: {
      "*": "vp check --fix",
    },
  };
});
