<?php
/**
 * templates/header/header-mega.php
 * Purpose: Multi-tier header with search bar and mega navigation.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$cart_url   = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/cart' );
$cart_count = 0;
if ( function_exists( 'WC' ) && null !== WC() && WC()->cart ) {
    $cart_count = (int) WC()->cart->get_cart_contents_count();
}

$asset_dir = get_stylesheet_directory_uri();
?>
<header class="site-header">
    <div class="header-top">
        <div class="header-container">
            <div class="header-top-left">
                <p class="header-top-message"><?php esc_html_e( 'WELCOME TO BRANDEDUK, YOUR WORKWEAR EXPERTS.', 'brandedukv15-child' ); ?></p>
            </div>
            <div class="header-top-right">
                <a class="header-top-email" href="mailto:info@brandeduk.com">info@brandeduk.com</a>
                <nav class="header-top-links" aria-label="<?php esc_attr_e( 'Utility navigation', 'brandedukv15-child' ); ?>">
                    <a href="#"><?php esc_html_e( 'Blog', 'brandedukv15-child' ); ?></a>
                    <a href="#"><?php esc_html_e( 'Contact', 'brandedukv15-child' ); ?></a>
                    <a href="#"><?php esc_html_e( 'My Account', 'brandedukv15-child' ); ?></a>
                    <a href="#"><?php esc_html_e( 'Sign In', 'brandedukv15-child' ); ?></a>
                    <span class="header-top-divider" aria-hidden="true">/</span>
                    <a href="#"><?php esc_html_e( 'Register', 'brandedukv15-child' ); ?></a>
                    <div class="header-top-vat-control" role="group" aria-label="<?php esc_attr_e( 'Toggle VAT pricing', 'brandedukv15-child' ); ?>">
                        <button class="header-top-vat-toggle" type="button" aria-pressed="false" aria-label="<?php esc_attr_e( 'Toggle VAT pricing', 'brandedukv15-child' ); ?>">
                            <span class="header-top-vat-toggle__label header-top-vat-toggle__label--exc" data-vat-exc><?php esc_html_e( 'exc vat', 'brandedukv15-child' ); ?></span>
                            <span class="header-top-vat-toggle__thumb" aria-hidden="true"></span>
                            <span class="header-top-vat-toggle__label header-top-vat-toggle__label--inc" data-vat-inc><?php esc_html_e( 'inc vat', 'brandedukv15-child' ); ?></span>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    </div>

    <div class="searchbar-header">
        <div class="searchbar-header__surface">
            <div class="searchbar-header__inner">
                <a class="searchbar-header__brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'brandedUK home', 'brandedukv15-child' ); ?>">
                    <span class="searchbar-header__brand-badge" aria-hidden="true">bd</span>
                    <span class="searchbar-header__brand-text">brandeduk.com</span>
                </a>

                <form class="searchbar-header__search" role="search" method="get" action="<?php echo esc_url( home_url( '/' ) ); ?>">
                    <div class="searchbar-header__categories">
                        <button class="searchbar-header__categories-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
                            <span class="searchbar-header__categories-label"><?php esc_html_e( 'Categories', 'brandedukv15-child' ); ?></span>
                            <span class="searchbar-header__categories-arrow" aria-hidden="true">&#9662;</span>
                        </button>
                        <ul class="searchbar-header__dropdown" role="listbox" aria-label="<?php esc_attr_e( 'Product categories', 'brandedukv15-child' ); ?>" hidden>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'All Categories', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'T-Shirts', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Polo Shirts', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Hoodies & Sweatshirts', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Jackets & Softshell', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Hi-Vis Clothing', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Work Trousers', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Fleeces', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item"><?php esc_html_e( 'Headwear & Accessories', 'brandedukv15-child' ); ?></li>
                            <li class="searchbar-header__dropdown-item searchbar-header__dropdown-item--sustainable"><?php esc_html_e( 'Sustainable / Recycled & Organic', 'brandedukv15-child' ); ?></li>
                        </ul>
                    </div>

                    <span class="searchbar-header__divider" aria-hidden="true"></span>

                    <div class="searchbar-header__input-wrap">
                        <label class="visually-hidden" for="searchbarHeaderInput"><?php esc_html_e( 'Search products', 'brandedukv15-child' ); ?></label>
                        <input
                            id="searchbarHeaderInput"
                            class="searchbar-header__input"
                            type="search"
                            name="s"
                            placeholder="<?php esc_attr_e( 'Search…', 'brandedukv15-child' ); ?>"
                            autocomplete="off"
                        >
                        <button class="searchbar-header__submit" type="submit" aria-label="<?php esc_attr_e( 'Search', 'brandedukv15-child' ); ?>">
                            <svg class="searchbar-header__icon" viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="11" cy="11" r="7"></circle>
                                <line x1="16.5" y1="16.5" x2="22" y2="22"></line>
                            </svg>
                        </button>
                    </div>
                </form>

                <div class="searchbar-header__actions">
                    <a class="searchbar-header__action" href="tel:02089742722" aria-label="<?php esc_attr_e( 'Call us', 'brandedukv15-child' ); ?>">
                        <span class="searchbar-header__action-ring is-animating">
                            <svg class="searchbar-header__action-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.5 0 1 .4 1 1V20c0 .5-.5 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.5 0 1 .4 1 1 0 1.2.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.3 2.2z"></path>
                            </svg>
                        </span>
                    </a>

                    <a class="searchbar-header__action" href="https://wa.me/447447348564" target="_blank" rel="noreferrer" aria-label="<?php esc_attr_e( 'Chat on WhatsApp', 'brandedukv15-child' ); ?>">
                        <span class="searchbar-header__action-ring is-animating">
                            <svg class="searchbar-header__action-icon searchbar-header__action-icon--whatsapp" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 2C6.48 2 2 6.33 2 11.82c0 1.98.56 3.85 1.6 5.47L2 22l4.89-1.53C8.41 21.4 10.18 21.8 12 21.8c5.52 0 10-4.33 10-9.98C22 6.33 17.52 2 12 2zm0 17.45c-1.65 0-3.27-.45-4.68-1.3l-.34-.2-2.9.91.94-2.8-.22-.36a8.02 8.02 0 0 1-1.23-4.26c0-4.37 3.58-7.92 8.02-7.92 4.41 0 7.98 3.55 7.98 7.92 0 4.37-3.57 8.01-7.97 8.01zm4.55-5.58c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.98-.15.17-.29.19-.54.07-.25-.12-1.04-.41-1.98-1.3-.73-.66-1.22-1.47-1.37-1.72-.15-.25-.02-.38.11-.5.11-.1.25-.27.38-.4.12-.13.17-.23.25-.39.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.42-.43-.57-.44-.15-.01-.32-.02-.49-.02-.17 0-.45.06-.68.31-.23.25-.9.88-.9 2.14s.92 2.49 1.05 2.66c.13.17 1.81 2.87 4.38 3.97.61.26 1.08.41 1.45.52.61.19 1.16.16 1.6.1.49-.07 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2-.06-.1-.22-.16-.47-.28z"></path>
                            </svg>
                        </span>
                    </a>

                    <a class="searchbar-header__cart" href="<?php echo esc_url( $cart_url ); ?>" aria-label="<?php esc_attr_e( 'View basket', 'brandedukv15-child' ); ?>">
                        <img class="searchbar-header__cart-icon" src="<?php echo esc_url( $asset_dir . '/assets/images/ui/icons/branded-cart.svg' ); ?>" alt="<?php esc_attr_e( 'Cart', 'brandedukv15-child' ); ?>">
                    </a>
                </div>
            </div>
        </div>
    </div>

    <div class="header-bottom sticky-header">
        <div class="header-container">
            <div class="category-dropdown has-border" data-visible="false">
                <button type="button" class="category-toggle" aria-haspopup="true" aria-expanded="false" title="<?php esc_attr_e( 'Browse categories', 'brandedukv15-child' ); ?>">
                    <span class="category-toggle-icon" aria-hidden="true"></span>
                    <span class="category-toggle-label"><?php esc_html_e( 'Browse Categories', 'brandedukv15-child' ); ?></span>
                    <span class="category-toggle-caret" aria-hidden="true"></span>
                </button>
                <div class="dropdown-box" role="region" aria-label="<?php esc_attr_e( 'Browse categories', 'brandedukv15-child' ); ?>">
                    <ul class="menu vertical-menu category-menu">
                        <?php
                        $category_icons = [
                            't-shirts'     => 'icon-shirt-71%201.png',
                            'polos'        => 'Polo.png',
                            'hoodies'      => 'icon-hoodies-71%201.png',
                            'jackets'      => 'Jacket.png',
                            'hi-vis'       => 'Hi%20Vis.png',
                            'trousers'     => 'Trousers.png',
                            'work-uniform' => 'Apron.png',
                            'fleeces'      => 'Fleece.png',
                            'headwear'     => 'Cap.png',
                            'sustainable'  => 'Recycle.png',
                        ];

                        $category_lists = [
                            't-shirts'     => [ 'Crew Neck', 'Heavyweight / Workwear', 'Kids T-shirts', 'Lightweight', 'Long Sleeve T-shirts', 'Performance / Sports', 'Short Sleeve T-shirts', 'Tank Tops', 'T-shirts for Embroidery', 'T-shirts for Print', 'V-Neck', "Women's T-shirts" ],
                            'polos'        => [ 'Classic Cotton Polos', 'Kids Polos', 'Long Sleeve Polos', 'Performance Polos', 'Poly Cotton Polos', 'Polos for Embroidery', 'Short Sleeve Polos', 'Slim Fit Polos', "Women’s Polos" ],
                            'hoodies'      => [ 'Heavyweight Hoodies', 'Kids Hoodies', 'Lightweight Hoodies', 'Premium / Workwear Hoodies', 'Pullover Hoodies', 'Sweatshirts (Crew Neck)', "Women’s Hoodies", 'Zip Hoodies' ],
                            'jackets'      => [ 'Bodywarmers / Gilets', 'Bomber Jackets', 'Fleece Jackets', 'High-performance Jackets', 'Softshell Jackets', 'Waterproof Jackets', 'Windbreakers', "Women’s Jackets", 'Workwear Jackets' ],
                            'hi-vis'       => [ 'EN ISO 20471 Certified', 'Hi-vis Hoodies', 'Hi-vis Jackets', 'Hi-vis Polos', 'Hi-vis T-shirts', 'Hi-vis Trousers', 'Hi-vis Vests', 'RIS-3279 Rail', 'Waterproof Hi-Vis' ],
                            'trousers'     => [ 'Cargo Pants', 'Ripstop Trousers', 'Stretch Work Trousers', 'Waterproof / Over-trousers', 'Work Shorts', 'Work Trousers', "Women’s Work Trousers" ],
                            'work-uniform' => [ 'Work Trousers', 'Workwear Jackets', 'Workwear Hoodies', 'Work Accessories', 'Aprons' ],
                            'fleeces'      => [ 'Full Zip Fleece', 'Half Zip Fleece', 'Heavy Fleece', 'Kids Fleece', 'Microfleece Jackets', "Women’s Fleece" ],
                            'headwear'     => [ 'Beanies', 'Bucket Hats', 'Caps', 'Gloves & Scarves', 'Hi-Vis Headwear', 'Kids Headwear', 'Work Accessories' ],
                        ];

                        foreach ( $category_lists as $slug => $items ) :
                            $icon = isset( $category_icons[ $slug ] ) ? $category_icons[ $slug ] : '';
                            ?>
                            <li class="has-children">
                                <a href="#">
                                    <?php if ( $icon ) : ?>
                                        <img class="category-icon" src="<?php echo esc_url( $asset_dir . '/assets/images/ui/icons/categories/' . $icon ); ?>" alt="" aria-hidden="true">
                                    <?php endif; ?>
                                    <span class="category-text"><?php echo esc_html( ucwords( str_replace( '-', ' ', $slug ) ) ); ?></span>
                                    <span class="category-caret" aria-hidden="true"></span>
                                </a>
                                <ul class="megamenu">
                                    <li>
                                        <ul>
                                            <?php foreach ( $items as $item ) : ?>
                                                <li><a href="#"><?php echo esc_html( $item ); ?></a></li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                        <?php endforeach; ?>

                        <li class="has-children">
                            <a href="#">
                                <img class="category-icon" src="<?php echo esc_url( $asset_dir . '/assets/images/ui/icons/categories/Recycle.png' ); ?>" alt="" aria-hidden="true">
                                <span class="category-text"><?php esc_html_e( 'Sustainable / Recycled & Organic', 'brandedukv15-child' ); ?></span>
                                <span class="category-caret" aria-hidden="true"></span>
                            </a>
                            <ul class="megamenu brand-grid">
                                <?php
                                $sustainable_sections = [
                                    '0 - 9' => [ '2786' ],
                                    'A'     => [ 'Adidas', 'Asquith & Fox', 'AWDis Just Cool', 'AWDis Just Hoods' ],
                                    'B'     => [ 'B&C Collection', 'Bagbase', 'Beechfield', 'Build Your Brand' ],
                                    'C'     => [ 'Callaway', 'Craghoppers' ],
                                    'F'     => [ 'Finden & Hales', 'Flexfit by Yupoong', 'Front Row' ],
                                    'H'     => [ 'Henbury', 'Home & Living' ],
                                    'K'     => [ 'Kariban', 'KiMood' ],
                                    'L'     => [ 'Larkwood' ],
                                    'M'     => [ 'Madeira', 'Mumbles' ],
                                    'N'     => [ 'New Morning Studios', 'Nike', 'Nimbus', 'Nutshell' ],
                                    'P'     => [ 'Portwest', 'Premier', 'Pro RTX' ],
                                    'Q'     => [ 'Quadra' ],
                                    'R'     => [ 'RalaFlex', 'Regatta Junior', 'Regatta Professional', 'Result', 'Russell Athletic®' ],
                                    'S'     => [ 'Scruffs', 'SF' ],
                                    'T'     => [ 'Stormtech', 'Tee Jays', 'Tombo', 'TriDri' ],
                                    'W'     => [ 'Westford Mill', 'Wombat' ],
                                    'Y'     => [ 'Yoko' ],
                                ];

                                foreach ( $sustainable_sections as $letter => $brands ) :
                                    ?>
                                    <li class="brand-heading"><?php echo esc_html( $letter ); ?></li>
                                    <?php foreach ( $brands as $brand ) : ?>
                                        <li><a href="#"><?php echo esc_html( $brand ); ?></a></li>
                                    <?php endforeach; ?>
                                <?php endforeach; ?>
                            </ul>
                        </li>
                        <li>
                            <a href="#" class="view-all-link">
                                <span class="category-text"><?php esc_html_e( 'View All Categories', 'brandedukv15-child' ); ?></span>
                                <span class="category-caret" aria-hidden="true"></span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <nav class="main-nav" aria-label="<?php esc_attr_e( 'Primary navigation', 'brandedukv15-child' ); ?>">
                <ul class="menu">
                    <li class="has-megamenu">
                        <a href="#" aria-haspopup="true">
                            <?php esc_html_e( 'All Products', 'brandedukv15-child' ); ?>
                            <span class="nav-caret" aria-hidden="true"></span>
                        </a>
                        <ul class="nav-megamenu brand-grid">
                            <?php
                            $alpha_sections = [
                                'A' => [ 'Accessories', 'Anti Static / ESD', 'Aprons', 'Arc Flash', 'Autumn Workwear' ],
                                'B' => [ 'Bags', 'Beanies', 'Bib & Brace Overalls', 'Blouses', 'Bodywarmers & Gilets' ],
                                'C' => [ 'Caps', 'Chainsaw and Forestry', 'Chefswear', 'Chem Splash', 'Coats & Jackets', 'Coldstore', 'Construction', 'Coveralls', 'Covid Test Kit' ],
                                'D' => [ 'Disposable', 'Dresses', 'DTF Supplies' ],
                                'F' => [ 'Face Masks & Covers', 'Flame Retardant', 'Fleece Jackets', 'Footwear' ],
                                'G' => [ 'Gilets', 'Golf', 'Gloves PPE', 'Gloves Winter' ],
                                'H' => [ 'Headwear', 'Healthcare', 'Helmets', 'Hi-Vis', 'Hoodies', 'Hospitality' ],
                                'J' => [ 'Jackets', 'Joggers' ],
                                'K' => [ 'Knitwear' ],
                                'L' => [ 'Lab / Medical Coats', 'Lateral Flow Tests', 'Lounge & Underwear' ],
                                'M' => [ 'Maternity' ],
                                'O' => [ 'Offshore Clothing', 'Overalls' ],
                                'P' => [ 'Painter & Decorator Clothing', 'Plus Size', 'Polo Shirts', 'PPE' ],
                                'R' => [ 'Rail Spec' ],
                                'S' => [ 'Scarves', 'Schoolwear', 'Scrubs', 'Security', 'Shirts', 'Shorts', 'Skirts', 'Socks', 'Softshell Jackets', 'Sports & Teamwear', 'Spring Workwear', 'Suits & Tailoring', 'Summer Workwear', 'Sustainable', 'Sweatshirts' ],
                                'T' => [ 'Tabards', 'Thermals & Base Layers', 'Ties', 'Tote Bags', 'Towelling', 'Trades', 'Trousers', 'T-Shirts', 'Tunics' ],
                                'U' => [ 'Umbrellas' ],
                                'W' => [ 'Waistcoats', 'Welding Workwear', 'Winter Workwear' ],
                            ];

                            foreach ( $alpha_sections as $letter => $items ) :
                                ?>
                                <li class="brand-heading"><?php echo esc_html( $letter ); ?></li>
                                <?php foreach ( $items as $item ) : ?>
                                    <li><a href="#"><?php echo esc_html( $item ); ?></a></li>
                                <?php endforeach; ?>
                            <?php endforeach; ?>
                        </ul>
                    </li>
                    <li><a href="#"><?php esc_html_e( 'BrandedUK', 'brandedukv15-child' ); ?></a></li>
                    <li class="has-megamenu promotions-menu">
                        <a href="#" aria-haspopup="true">
                            <?php esc_html_e( 'Promotions', 'brandedukv15-child' ); ?>
                            <span class="nav-caret" aria-hidden="true"></span>
                        </a>
                        <div class="promo-dropdown" role="region" aria-label="<?php esc_attr_e( 'Promotional bundles', 'brandedukv15-child' ); ?>">
                            <div class="promo-dropdown-inner">
                                <?php
                                $promo_cards = [
                                    [ 'theme' => 'promo-theme-1', 'title' => 'Bundle 1', 'tag' => 'Starter' ],
                                    [ 'theme' => 'promo-theme-2', 'title' => 'Bundle 2', 'tag' => 'Teams' ],
                                    [ 'theme' => 'promo-theme-3', 'title' => 'Bundle 3', 'tag' => 'Eco' ],
                                    [ 'theme' => 'promo-theme-4', 'title' => 'Bundle 4', 'tag' => 'Season' ],
                                    [ 'theme' => 'promo-theme-5', 'title' => 'Bundle 5', 'tag' => 'Pro' ],
                                ];

                                foreach ( $promo_cards as $card ) :
                                    ?>
                                    <figure class="promo-card <?php echo esc_attr( $card['theme'] ); ?>">
                                        <div class="promo-card-thumb" aria-hidden="true"></div>
                                        <figcaption class="promo-card-title"><?php echo esc_html( $card['title'] ); ?></figcaption>
                                        <span class="promo-card-tag"><?php echo esc_html( $card['tag'] ); ?></span>
                                    </figure>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </li>
                    <li><a href="#"><?php esc_html_e( 'More', 'brandedukv15-child' ); ?></a></li>
                    <li><a href="#"><?php esc_html_e( 'Services', 'brandedukv15-child' ); ?></a></li>
                    <li><a href="#"><?php esc_html_e( 'About', 'brandedukv15-child' ); ?></a></li>
                </ul>
            </nav>
        </div>
    </div>
</header>
