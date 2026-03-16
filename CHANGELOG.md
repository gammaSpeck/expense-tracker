# Changelog

## [1.5.0](https://github.com/gammaSpeck/expense-tracker/compare/v1.4.0...v1.5.0) (2026-03-16)


### Features

* **backup-reminder:** implement backup reminder system and user preferences ([#29](https://github.com/gammaSpeck/expense-tracker/issues/29)) ([a9ced6e](https://github.com/gammaSpeck/expense-tracker/commit/a9ced6e667d82704f0dfd61c1c3a45825b2e1480))
* **backup:** separate backup and export functionalities with new components and updated settings ([#35](https://github.com/gammaSpeck/expense-tracker/issues/35)) ([e0f8c8d](https://github.com/gammaSpeck/expense-tracker/commit/e0f8c8d32a93eef40705fb2f81d998c165036f37))
* **backups:** implement end-to-end encryption for backups and exports ([#36](https://github.com/gammaSpeck/expense-tracker/issues/36)) ([b4b0841](https://github.com/gammaSpeck/expense-tracker/commit/b4b0841a9f8e64e65f8a330866ab7fc0e5b74140))
* **google-drive:** integrate Google Drive backup functionality and settings ([#31](https://github.com/gammaSpeck/expense-tracker/issues/31)) ([5c4ee9c](https://github.com/gammaSpeck/expense-tracker/commit/5c4ee9c24c25b1b895f4d54743bfbc4778380641))
* **security:** enhance security headers and switch to Web Oauth client ([#34](https://github.com/gammaSpeck/expense-tracker/issues/34)) ([257fcaa](https://github.com/gammaSpeck/expense-tracker/commit/257fcaa73d1ca8830007589dd5524d82632192d5))

## [1.4.0](https://github.com/gammaSpeck/expense-tracker/compare/v1.3.1...v1.4.0) (2026-03-02)


### Features

* **add-expense-ux:** add description suggestions feature to ExpenseForm ([#25](https://github.com/gammaSpeck/expense-tracker/issues/25)) ([08447af](https://github.com/gammaSpeck/expense-tracker/commit/08447af3d4c5b6e08412331511a79825703feda9))
* **docs:** add complete feature documentation and changelog links to README ([#27](https://github.com/gammaSpeck/expense-tracker/issues/27)) ([fd1f614](https://github.com/gammaSpeck/expense-tracker/commit/fd1f6149374d6ee6c0ef80f1732045f16c61ac5c))
* **settings:** restructure settings and data management pages, add new routes and components ([#28](https://github.com/gammaSpeck/expense-tracker/issues/28)) ([a8922c2](https://github.com/gammaSpeck/expense-tracker/commit/a8922c2eed18c82ad78c88809abb50573fd60ce3))

## [1.3.1](https://github.com/gammaSpeck/expense-tracker/compare/v1.3.0...v1.3.1) (2026-02-19)


### Bug Fixes

* **analysis:** modularized analysis page and changed analysis section order ([#22](https://github.com/gammaSpeck/expense-tracker/issues/22)) ([3d74fd4](https://github.com/gammaSpeck/expense-tracker/commit/3d74fd4a7e295549967bc2ecb493d4d9d171d45a))
* **perf:** react-doctor fixes ([#24](https://github.com/gammaSpeck/expense-tracker/issues/24)) ([e1f07fc](https://github.com/gammaSpeck/expense-tracker/commit/e1f07fc342dd8b5133a57c657c8b8896ac347479))

## [1.3.0](https://github.com/gammaSpeck/expense-tracker/compare/v1.2.2...v1.3.0) (2026-02-09)


### Features

* **ui:** analysis page redesigned ([#20](https://github.com/gammaSpeck/expense-tracker/issues/20)) ([7836cbd](https://github.com/gammaSpeck/expense-tracker/commit/7836cbda931948ef30e9317e6db15ad913e3d4db))

## [1.2.2](https://github.com/gammaSpeck/expense-tracker/compare/v1.2.1...v1.2.2) (2026-01-18)


### Bug Fixes

* **time:** add utility functions for consistent 24-hour time handling ([#18](https://github.com/gammaSpeck/expense-tracker/issues/18)) ([835b482](https://github.com/gammaSpeck/expense-tracker/commit/835b482b240126b24fd64a8ac3cd9d5e701f982b))

## [1.2.1](https://github.com/gammaSpeck/expense-tracker/compare/v1.2.0...v1.2.1) (2026-01-06)


### Bug Fixes

* **ux:** changed expenses list order to be by exp datetime and changed tag suggestion limit to 100 in add expense ([#16](https://github.com/gammaSpeck/expense-tracker/issues/16)) ([ea69f0f](https://github.com/gammaSpeck/expense-tracker/commit/ea69f0fc647059635ae95ad44b4834acb86aae4f))

## [1.2.0](https://github.com/gammaSpeck/expense-tracker/compare/v1.1.0...v1.2.0) (2026-01-02)


### Features

* **ui:** allow user preference of a default currency symbol ([#14](https://github.com/gammaSpeck/expense-tracker/issues/14)) ([124da70](https://github.com/gammaSpeck/expense-tracker/commit/124da706dcc6e3eb7b04373b6be0adbe6715feee))

## [1.1.0](https://github.com/gammaSpeck/expense-tracker/compare/v1.0.3...v1.1.0) (2025-12-26)


### Features

* implement PWA reload prompt for version updates and offline readiness ([#12](https://github.com/gammaSpeck/expense-tracker/issues/12)) ([9fe7c90](https://github.com/gammaSpeck/expense-tracker/commit/9fe7c90df837ba1797a6cb106e977f96430b5267))


### Bug Fixes

* **expense-card:** resolve overflow issue for expense description and improve formatting ([#10](https://github.com/gammaSpeck/expense-tracker/issues/10)) ([26dbdd5](https://github.com/gammaSpeck/expense-tracker/commit/26dbdd57ac28a6c81d01b86737caa0541240ac6d))

## [1.0.3](https://github.com/gammaSpeck/expense-tracker/compare/v1.0.2...v1.0.3) (2025-12-23)


### Bug Fixes

* UX expense updates and improve toast notifications ([#8](https://github.com/gammaSpeck/expense-tracker/issues/8)) ([81496a2](https://github.com/gammaSpeck/expense-tracker/commit/81496a297554af40d94281cf2abf2a2d490a8989))

## [1.0.2](https://github.com/gammaSpeck/expense-tracker/compare/v1.0.1...v1.0.2) (2025-12-20)


### Bug Fixes

* **expense-form:** fixed duplicate transaction UX ([6519c7e](https://github.com/gammaSpeck/expense-tracker/commit/6519c7e32d849ff2738414640f4e1e98c3cc344f))
* **expense-form:** improve styling for description, tags, and time input fields ([141e8db](https://github.com/gammaSpeck/expense-tracker/commit/141e8dbea70fe4b1c346d185097c2f212a38915f))
* **expense-form:** update value type to allow null and improve validation error messages ([6fe7b3b](https://github.com/gammaSpeck/expense-tracker/commit/6fe7b3bae20df673014df559b060f5baf4dc7fd4))

## [1.0.1](https://github.com/gammaSpeck/expense-tracker/compare/v1.0.0...v1.0.1) (2025-12-19)


### Bug Fixes

* **pwa:** add missing mobile-web-app-capable meta tag for PWA support for ios ([051b8dc](https://github.com/gammaSpeck/expense-tracker/commit/051b8dcae9a3df4fe2a2d9ca796d87a1fd68476c))

## 1.0.0 (2025-12-19)


### Features

* **ci:** add GitHub Actions workflow to update latest release on tag push ([00a9dca](https://github.com/gammaSpeck/expense-tracker/commit/00a9dca6b767cf6cfc3922693fe93f1cb7bd0a6e))
* enhance mobile responsiveness and update UI components ([12bf17e](https://github.com/gammaSpeck/expense-tracker/commit/12bf17e87c4d5e92eef032f6110b0dd53894b2bf))
* implement PWA support with manifest and icons ([#5](https://github.com/gammaSpeck/expense-tracker/issues/5)) ([a34fd2e](https://github.com/gammaSpeck/expense-tracker/commit/a34fd2e6d3de77bfa5a602419fa28af789ace2e7))
* update project metadata and release please ([#3](https://github.com/gammaSpeck/expense-tracker/issues/3)) ([e6518f6](https://github.com/gammaSpeck/expense-tracker/commit/e6518f685c9fe09886932fdeac97e2b054cd3105))
* updated many packages to latest versions ([#1](https://github.com/gammaSpeck/expense-tracker/issues/1)) ([be55523](https://github.com/gammaSpeck/expense-tracker/commit/be55523d36c2a4f90375f12940454b9a46eaef89))


### Bug Fixes

* **netlify:** add _redirects configuration for netlify deploy issue ([2c890a1](https://github.com/gammaSpeck/expense-tracker/commit/2c890a1d6ad1f7d37aec8d34c820d0f59ec504cf))
* **ui:** refactor FloatingActionButton component and integrate it into HomePage ([ee98e63](https://github.com/gammaSpeck/expense-tracker/commit/ee98e63b6b6bf9c29f6b65c5ad5fa4740ebcd3a3))
* **ui:** ui fixes across the app and responsive fixes ([#2](https://github.com/gammaSpeck/expense-tracker/issues/2)) ([b52be47](https://github.com/gammaSpeck/expense-tracker/commit/b52be475ed5e68bc3a58cde6e2d0f5a390fc1607))
