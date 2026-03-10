# Oxlint Migration Notes

This file documents ESLint rules and plugins that the automated migration skipped and recommended actions.

Skipped / unsupported rules (from `@oxlint/migrate --details`):

- Nursery: `getter-return`, `no-undef`, `no-unreachable`
- Unsupported / require manual attention:
  - `no-dupe-args` (superseded by strict mode)
  - `no-octal` (superseded by strict mode)
  - Several React compiler rules (not implemented in oxlint and require JS plugins or compiler integration):
    - `react-hooks/static-components`
    - `react-hooks/use-memo`
    - `react-hooks/component-hook-factories`
    - `react-hooks/preserve-manual-memoization`
    - `react-hooks/incompatible-library`
    - `react-hooks/immutability`
    - `react-hooks/globals`
    - `react-hooks/refs`
    - `react-hooks/set-state-in-effect`
    - `react-hooks/error-boundaries`
    - `react-hooks/purity`
    - `react-hooks/set-state-in-render`
    - `react-hooks/unsupported-syntax`
    - `react-hooks/config`
    - `react-hooks/gating`

Recommended actions

1. Review this list and decide which rules you need to keep.
2. For rules that oxlint does not support natively:
   - Use `jsPlugins` to load ESLint plugins that implement needed rules (e.g. `eslint-plugin-...`). Example in `.oxlintrc.json`:

```jsonc
"jsPlugins": ["eslint-plugin-unused-imports", "eslint-plugin-foo"]
```

3. Re-run migration with additional options if desired:

```bash
pnpm dlx @oxlint/migrate --details --with-nursery
```

4. Replace `eslint-plugin-prettier` with `oxfmt` for formatting.

5. If some rules truly require the React compiler integration, consider keeping ESLint for those specific rules until an oxlint alternative exists.

Notes

- The generated `.oxlintrc.json` already includes `jsPlugins: ["eslint-plugin-unused-imports"]` to preserve unused-imports behavior.
- If you want, I can add specific `jsPlugins` entries and re-install those plugins as devDependencies so oxlint can load them.
