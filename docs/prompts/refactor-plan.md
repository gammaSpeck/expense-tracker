# Refactor Plan — expense-tracker

TL;DR

- Perform small, backward-compatible refactors to improve readability and maintainability. Start with low-risk, high-value changes (shared delete dialog, small helpers, UI barrel, ESLint setup). Defer large work (ExpenseForm split, Drive service reorg) for later.

Goals

- Make code easier to read and maintain using KISS and DRY principles.
- Keep backward compatibility: public component and page APIs remain unchanged.
- Make changes incremental and testable.

Planned small surgical changes (priority order)

1. Shared delete-confirmation
   - Add `src/components/ConfirmDeleteDialog.tsx` and `src/hooks/useConfirmDelete.ts`.
   - Replace one page (`src/pages/TransactionsPage.tsx`) to validate behavior.
2. Duplicate-expense helper
   - Add `src/lib/expenseHelpers.ts` with `makeDuplicateExpensePayload(expense)` (named export).
   - Replace inline duplicate creation in `HomePage` and `TransactionsPage`.
3. UI barrel and export policy
   - Add `src/components/ui/index.ts` exporting UI primitives as named exports.
   - Apply export style only for files we touch (TS functions: named exports; pages: default exports; small TSX components can be named exports).
4. Minimal ESLint setup
   - Add `/.eslintrc.js` with a minimal base using `eslint:recommended` and `plugin:@typescript-eslint/recommended`.
   - Add npm script `lint:fix` -> `eslint --ext .ts,.tsx src --fix`.
5. Small verification & docs
   - Add brief `src/components/ui/README.md` describing export conventions.
   - Manual verification steps.

Deferred (higher-risk) items

- `ExpenseForm` component split into subcomponents (ImageUploader, TagInput, CategorySelect) — schedule later. Keep `ExpenseForm` as single owner of react-hook-form controllers when refactoring.
- Drive logic reorganization into `src/services/drive/*` — defer until smaller refactors complete and manual QA performed.

Verification checklist

- Run lint and autofix:

```bash
npm run lint
npm run lint:fix
```

- Start dev server and exercise flows: add/edit/delete expense, duplicate expense, upload attachments, create/delete category, Analysis page exports.

Decisions & Conventions

- Exports: TS functions use named exports. React TSX pages use default exports. Small subcomponents may use named exports.
- ESLint: minimal base (`eslint:recommended` + `plugin:@typescript-eslint/recommended`) to start; Prettier integration later if desired.
- No pre-commit hooks or CI changes in this phase.

Next immediate task

- Implement `ConfirmDeleteDialog` and `useConfirmDelete`, and replace the dialog in `src/pages/TransactionsPage.tsx` only. Run manual verification for delete flow.

Document history

- Created on 2026-03-09 by refactor task runner.
