<?php
/**
 * templates/woocommerce/single-product.php
 * Purpose: Main single product wrapper (WooCommerce).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

do_action( 'woocommerce_before_main_content' );

while ( have_posts() ) {
    the_post();
    wc_get_template_part( 'content', 'single-product' );
}

do_action( 'woocommerce_after_main_content' );
