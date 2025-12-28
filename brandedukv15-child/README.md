# BrandedUK v15 Child Theme

This folder is the **uploadable WordPress child theme**.

## Folder layout (developer-friendly)

```
brandedukv15-child/
├─ style.css                      # theme header + CSS imports
├─ functions.php                  # enqueue + hooks only (keep logic out)
├─ header-mega.php                # header variant entry (get_header('mega'))
│
├─ assets/
│  ├─ css/
│  │  ├─ base.css                 # reset + typography + CSS variables
│  │  ├─ layout.css               # shared layout primitives
│  │  ├─ components/              # one file per component
│  │  └─ pages/                   # one file per page/route
│  │
│  ├─ js/
│  │  ├─ core.js                  # shared helpers + storage keys
│  │  ├─ menu.js                  # mega-menu behaviors
│  │  ├─ animations.js            # transitions/UX helpers (optional)
│  │  ├─ upload/                  # upload + preview modules
│  │  └─ pages/                   # page scripts ported from prototypes
│  │
│  ├─ images/
│  │  ├─ ui/icons/                # UI icons (prefer SVG)
│  │  ├─ ui/arrows/               # arrows, chevrons
│  │  ├─ ui/loaders/              # spinners, skeletons
│  │  ├─ brands/                  # brand logos
│  │  ├─ products/                # product images
│  │  ├─ customization/           # placement diagrams, mock overlays
│  │  ├─ banners/                 # hero banners
│  │  └─ mockups/                 # marketing mockups
│  │
│  ├─ video/
│  │  ├─ hero/                    # homepage hero videos
│  │  └─ tutorials/               # customization walkthroughs
│  │
│  └─ fonts/                      # local font files (if needed)
│
├─ templates/
│  ├─ header/header-mega.php      # real header markup lives here
│  ├─ woocommerce/                # actual WC templates
│  └─ parts/                      # reusable partials
│
├─ woocommerce/                   # WC override entrypoints (thin wrappers)
└─ includes/                      # PHP helpers / endpoints (theme-local)
```

## Where to put files

- **CSS**
    - global variables/reset: `assets/css/base.css`
    - layout scaffolding: `assets/css/layout.css`
    - components: `assets/css/components/*.css`
    - page-specific: `assets/css/pages/*.css`

- **JS**
    - shared helpers: `assets/js/core.js`
    - menu/animations: `assets/js/menu.js`, `assets/js/animations.js`
    - upload modules: `assets/js/upload/*.js`
    - page logic: `assets/js/pages/*.js`

- **Media**
    - icons: `assets/images/ui/icons/`
    - product images: `assets/images/products/`
    - brand logos: `assets/images/brands/`
    - customization diagrams: `assets/images/customization/`
    - videos: `assets/video/`

## Notes
- Keep templates free of inline JS/CSS.
- Ensure `Template:` in `style.css` matches the parent theme folder name.
