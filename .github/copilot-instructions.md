# Copilot instructions (brandeduk.comv14)

## Project shape
- This repo contains two things:
  - **Prototype pages** in repo root (e.g. `home.html`, `product-detail.html`, `quote-basket.html`) used with Live Server.
  - A **WordPress child theme** in `brandedukv15-child/` (upload to `wp-content/themes/`).
- The child theme is structured for modular assets:
  - CSS: `brandedukv15-child/assets/css/{base.css,layout.css,components/*.css,pages/*.css}`
  - JS: `brandedukv15-child/assets/js/{core.js,menu.js,animations.js,upload/*.js,pages/*.js}`
  - Media: `brandedukv15-child/assets/{images/ui/icons,images/products,images/brands,video,fonts}`
  - WooCommerce overrides: `brandedukv15-child/woocommerce/*.php` (wrappers) and `brandedukv15-child/templates/woocommerce/*.php` (actual templates)

## Local dev workflows
- **Prototype (recommended for quick UI checks):**
  - Use VS Code Live Server (port is set to `5501` in `.vscode/settings.json`).
  - Root HTML files have been updated to load assets from `brandedukv15-child/assets/...`.
- **WordPress/WooCommerce:**
  - Zip/upload `brandedukv15-child/` (or use the prepared `dist/brandeduk.comv15.zip`).
  - Ensure `Template:` in `brandedukv15-child/style.css` matches the parent theme folder name.

## Conventions / patterns
- **No inline CSS/JS** in templates/pages. Put styles in CSS files and behaviors in JS files.
- **State passing in prototype JS** relies heavily on `localStorage` / `sessionStorage`:
  - Basket: `localStorage['quoteBasket']`
  - Customization flows: `sessionStorage['customizingProduct']`, `sessionStorage['selectedPositions']`, `sessionStorage['positionCustomizations']`
- Pricing is tiered per product code in multiple scripts; when changing pricing logic, search for `PRICING_RULES`.

## Where to edit what
- Header/mega menu markup: `brandedukv15-child/templates/header/header-mega.php` (WordPress entry: `brandedukv15-child/header-mega.php`)
- Product/basket/customization page behaviors (prototype-ported): `brandedukv15-child/assets/js/pages/`
- Global utilities: `brandedukv15-child/assets/js/core.js`
- Enqueue and hooks only (keep clean): `brandedukv15-child/functions.php`

## Guardrails for agents
- Prefer **small, surgical changes**: update the modular file that owns the concern (page CSS vs component CSS).
- If modifying prototype HTML, keep it **linking to the child theme assets** (don’t reintroduce root `*.css` / `*.js`).
- Don’t introduce build tools (npm/webpack) unless the repo adds them explicitly.
