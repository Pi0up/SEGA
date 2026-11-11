# Changelog

Toutes les modifications notables apportées au projet SEGA sont consignées dans ce fichier.

## [1.3.0](https://github.com/Pi0up/SEGA/compare/v1.2.0...v1.3.0) (2026-11-10)

### ✨ Features

* **ai:** implement multimodal AI qualitative human analysis module ([cb3b77f](https://github.com/Pi0up/SEGA/commit/cb3b77f2f8147421145a5cebbebdecddf113b83e))
* **crawler:** implement link extractor and exploratory crawl engine ([2b2ee16](https://github.com/Pi0up/SEGA/commit/2b2ee16eb52acdcc58902e6645725cb2a79a5744))
* **crawler:** integrate wcag accessibility analyzer and reporting ([8172408](https://github.com/Pi0up/SEGA/commit/81724082d8c1925b26bd251dbff7422e6b137139))
* **reporter:** add multi-page exploration mapping and reporting ([d25664a](https://github.com/Pi0up/SEGA/commit/d25664a65b043316384900282df9d251cf6fbc14))
* **visual:** add in-situ visual markers and screenshot annotations for audit findings ([bb9be90](https://github.com/Pi0up/SEGA/commit/bb9be903d1f96dbabcb8bb5370d858cde4362b83))

### 🐛 Bug Fixes

* **ci:** synchronize root package-lock with workspace dependencies ([1ecee71](https://github.com/Pi0up/SEGA/commit/1ecee71819ecd29faae2075a51d2666d2e54b124))

## [1.2.0](https://github.com/Pi0up/SEGA/compare/v1.1.0...v1.2.0) (2026-11-10)

### ✨ Features

* **test:** integrate Vitest test suite and build verification scripts ([50745fd](https://github.com/Pi0up/SEGA/commit/50745fd3af8c2ef054bd1ac2f0b283f96d146a78))

## [1.1.0](https://github.com/Pi0up/SEGA/compare/v1.0.0...v1.1.0) (2026-11-10)

### ✨ Features

* **crawler:** integrate wcag accessibility analyzer and reporting ([dc2d8de](https://github.com/Pi0up/SEGA/commit/dc2d8de2a2a7c4553924253bf13915fabef6aa06))
* **types:** allow optional pageUrl, pageTitle and affectedPages on Finding ([fe74230](https://github.com/Pi0up/SEGA/commit/fe742306fd11b4afb5fdc4a212f987f471d3072d))

## 1.0.0 (2026-11-10)

### ✨ Features

* **ci:** setup semantic-release and github actions workflow ([0d344ba](https://github.com/Pi0up/SEGA/commit/0d344ba896074f15d58ef1469e9be8e19a9907d5))
* **crawler:** integrate wcag accessibility analyzer and reporting ([bd24917](https://github.com/Pi0up/SEGA/commit/bd24917f52e40e13c011aa6776c795161d3b17b1))
* initial commit for ergonomic review skill and audit tools (Bastien & Scapin x Nielsen) ([af73c38](https://github.com/Pi0up/SEGA/commit/af73c389a0982a8964e7c565f9590161e6941d2a))

### 🐛 Bug Fixes

* **crawler:** improve page load wait and timing in playwright probe ([8a82877](https://github.com/Pi0up/SEGA/commit/8a82877be064014f7f4a7e2ce33ffdb6abdf3e9b))
