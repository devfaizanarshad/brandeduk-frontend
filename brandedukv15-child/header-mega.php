<?php
/**
 * header-mega.php
 * Purpose: WordPress-recognized header variant (get_header('mega')).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

get_template_part( 'templates/header/header', 'mega' );
