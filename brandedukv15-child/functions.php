<?php
/**
 * BrandedUK v15 Child Theme Functions
 *
 * @package BrandedUKv15_Child
 * @version 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'BRANDEDUKV15_CHILD_VERSION', '1.0.0' );
define( 'BRANDEDUKV15_CHILD_DIR', get_stylesheet_directory() );
define( 'BRANDEDUKV15_CHILD_URI', get_stylesheet_directory_uri() );

/* ==========================================================================
   ENQUEUE STYLES
   ========================================================================== */

add_action( 'wp_enqueue_scripts', 'brandedukv15_child_enqueue_styles', 20 );

function brandedukv15_child_enqueue_styles() {
    // Parent theme style
    wp_enqueue_style(
        'brandedukv15-parent-style',
        get_template_directory_uri() . '/style.css',
        array(),
        BRANDEDUKV15_CHILD_VERSION
    );

    // Child theme main style (imports modular CSS files via @import in style.css)
    wp_enqueue_style(
        'brandedukv15-child-style',
        get_stylesheet_uri(),
        array( 'brandedukv15-parent-style' ),
        BRANDEDUKV15_CHILD_VERSION
    );
}

/* ==========================================================================
   ENQUEUE SCRIPTS
   ========================================================================== */

add_action( 'wp_enqueue_scripts', 'brandedukv15_child_enqueue_scripts', 20 );

function brandedukv15_child_enqueue_scripts() {
    // Core utilities
    wp_enqueue_script(
        'brandedukv15-core',
        BRANDEDUKV15_CHILD_URI . '/assets/js/core.js',
        array( 'jquery' ),
        BRANDEDUKV15_CHILD_VERSION,
        true
    );

    // Menu / Mega menu
    wp_enqueue_script(
        'brandedukv15-menu',
        BRANDEDUKV15_CHILD_URI . '/assets/js/menu.js',
        array( 'brandedukv15-core' ),
        BRANDEDUKV15_CHILD_VERSION,
        true
    );

    wp_enqueue_script(
        'brandedukv15-header',
        BRANDEDUKV15_CHILD_URI . '/assets/js/header.js',
        array( 'brandedukv15-core' ),
        BRANDEDUKV15_CHILD_VERSION,
        true
    );

    wp_enqueue_script(
        'brandedukv15-vat-toggle',
        BRANDEDUKV15_CHILD_URI . '/assets/js/vat-toggle.js',
        array( 'brandedukv15-header' ),
        BRANDEDUKV15_CHILD_VERSION,
        true
    );

    // Animations
    wp_enqueue_script(
        'brandedukv15-animations',
        BRANDEDUKV15_CHILD_URI . '/assets/js/animations.js',
        array( 'brandedukv15-core' ),
        BRANDEDUKV15_CHILD_VERSION,
        true
    );

    // Page scripts (ported from prototype into assets/js/pages/)
    // These are optional and safe: if the page slug doesn't exist, nothing loads.
    if ( is_front_page() || is_home() ) {
        wp_enqueue_script(
            'brandedukv15-page-home',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/home.js',
            array( 'brandedukv15-vat-toggle' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( function_exists( 'is_shop' ) && ( is_shop() || is_product_category() || is_product_tag() ) ) {
        wp_enqueue_script(
            'brandedukv15-page-shop',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/shop.js',
            array( 'brandedukv15-core' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( function_exists( 'is_product' ) && is_product() ) {
        wp_enqueue_script(
            'brandedukv15-page-product',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/product.js',
            array( 'brandedukv15-vat-toggle' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( is_page( 'quote-basket' ) ) {
        wp_enqueue_script(
            'brandedukv15-page-basket',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/basket.js',
            array( 'brandedukv15-vat-toggle' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( is_page( 'quote-form' ) ) {
        wp_enqueue_script(
            'brandedukv15-page-quote-form',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/quote-form.js',
            array( 'brandedukv15-vat-toggle' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( is_page( 'customize-positions' ) ) {
        wp_enqueue_script(
            'brandedukv15-page-customize-positions',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/customize-positions.js',
            array( 'brandedukv15-core' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( is_page( 'customize-detail' ) ) {
        wp_enqueue_script(
            'brandedukv15-page-customize-detail',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/customize-detail.js',
            array( 'brandedukv15-core' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    if ( is_page( 'customize' ) ) {
        wp_enqueue_script(
            'brandedukv15-page-customization',
            BRANDEDUKV15_CHILD_URI . '/assets/js/pages/customization.js',
            array( 'brandedukv15-core' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    // Upload helpers (only for product/customization flows)
    if ( is_product() || is_page( 'customize' ) ) {
        wp_enqueue_script(
            'brandedukv15-logo-upload',
            BRANDEDUKV15_CHILD_URI . '/assets/js/upload/logo-upload.js',
            array( 'brandedukv15-core' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );

        wp_enqueue_script(
            'brandedukv15-text-preview',
            BRANDEDUKV15_CHILD_URI . '/assets/js/upload/text-preview.js',
            array( 'brandedukv15-core' ),
            BRANDEDUKV15_CHILD_VERSION,
            true
        );
    }

    // Localize script data
    wp_localize_script( 'brandedukv15-core', 'brandedukv15Data', array(
        'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
        'nonce'    => wp_create_nonce( 'brandedukv15_nonce' ),
        'themeUri' => BRANDEDUKV15_CHILD_URI,
    ) );
}

/* ==========================================================================
   WOOCOMMERCE SUPPORT
   ========================================================================== */

add_action( 'after_setup_theme', 'brandedukv15_child_setup' );

function brandedukv15_child_setup() {
    add_theme_support( 'woocommerce' );
    add_theme_support( 'wc-product-gallery-zoom' );
    add_theme_support( 'wc-product-gallery-lightbox' );
    add_theme_support( 'wc-product-gallery-slider' );
}

/* ==========================================================================
   TEMPLATE INCLUDES
   ========================================================================== */

// NOTE: WordPress loads header variants from theme root (e.g. header-mega.php).
// We keep the real markup in /templates/header/ and include it from /header-mega.php.

/* ==========================================================================
    HOOKS & FILTERS (keep it clean)
   ========================================================================== */

// Remove default WooCommerce breadcrumbs (optional)
// remove_action( 'woocommerce_before_main_content', 'woocommerce_breadcrumb', 20 );

// Allow SVG uploads (use with care; security depends on your WP hardening)
add_filter( 'upload_mimes', 'brandedukv15_child_mime_types' );

function brandedukv15_child_mime_types( $mimes ) {
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}
