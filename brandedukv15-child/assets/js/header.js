(function () {
    function closeAllDropdowns() {
        document.querySelectorAll('.category-dropdown[data-visible="true"]').forEach((dropdown) => {
            dropdown.setAttribute('data-visible', 'false');
            const button = dropdown.querySelector('.category-toggle');
            if (button) {
                button.setAttribute('aria-expanded', 'false');
            }
        });
    }

    function closeAllSearchbarDropdowns() {
        document.querySelectorAll('.searchbar-header__categories.is-open').forEach((container) => {
            container.classList.remove('is-open');
            const trigger = container.querySelector('.searchbar-header__categories-trigger');
            const dropdown = container.querySelector('.searchbar-header__dropdown');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
            if (dropdown) {
                dropdown.hidden = true;
            }
        });
    }

    function initCategoryDropdown() {
        document.querySelectorAll('.category-dropdown').forEach((dropdown) => {
            const button = dropdown.querySelector('.category-toggle');
            const dropdownBox = dropdown.querySelector('.dropdown-box');
            if (!button) return;

            const closeDropdown = () => {
                if (dropdown.getAttribute('data-visible') !== 'true') {
                    return;
                }
                dropdown.setAttribute('data-visible', 'false');
                button.setAttribute('aria-expanded', 'false');
            };

            button.addEventListener('click', (event) => {
                event.preventDefault();
                const currentlyVisible = dropdown.getAttribute('data-visible') === 'true';

                closeAllDropdowns();
                closeAllSearchbarDropdowns();

                dropdown.setAttribute('data-visible', currentlyVisible ? 'false' : 'true');
                button.setAttribute('aria-expanded', currentlyVisible ? 'false' : 'true');
            });

            dropdown.addEventListener('pointerleave', closeDropdown);

            if (dropdownBox) {
                dropdownBox.addEventListener('pointerleave', closeDropdown);
            }
        });

        document.querySelectorAll('.main-nav .menu > li > a').forEach((link) => {
            link.addEventListener('mouseenter', () => {
                if (link.closest('.category-dropdown')) {
                    return;
                }
                closeAllDropdowns();
            });
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.category-dropdown')) return;
            closeAllDropdowns();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            closeAllDropdowns();
        });
    }

    function initSearchbarHeaderDropdown() {
        const containers = Array.from(document.querySelectorAll('.searchbar-header__categories'));
        if (!containers.length) return;

        const closeContainer = (container) => {
            container.classList.remove('is-open');
            const trigger = container.querySelector('.searchbar-header__categories-trigger');
            const dropdown = container.querySelector('.searchbar-header__dropdown');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
            if (dropdown) {
                dropdown.hidden = true;
            }
        };

        const closeAll = () => {
            containers.forEach(closeContainer);
        };

        containers.forEach((container) => {
            const trigger = container.querySelector('.searchbar-header__categories-trigger');
            const dropdown = container.querySelector('.searchbar-header__dropdown');
            if (!trigger || !dropdown) return;

            dropdown.hidden = true;

            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const isOpen = container.classList.contains('is-open');
                closeAll();
                closeAllDropdowns();
                if (!isOpen) {
                    container.classList.add('is-open');
                    trigger.setAttribute('aria-expanded', 'true');
                    dropdown.hidden = false;
                }
            });

            trigger.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    trigger.click();
                }
                if (event.key === 'Escape') {
                    closeAll();
                }
            });

            dropdown.addEventListener('click', (event) => {
                event.stopPropagation();
            });
        });

        document.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) return;
            if (event.target.closest('.searchbar-header__categories')) return;
            closeAll();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeAll();
            }
        });
    }

    function initModernSearchDropdown() {
        const container = document.querySelector('.header-modern__categories');
        if (!container) return;

        const trigger = container.querySelector('.header-modern__categories-trigger');
        const dropdown = container.querySelector('.header-modern__categories-dropdown');
        if (!trigger || !dropdown) return;

        const openClass = 'header-modern__categories--open';

        const closeModernDropdown = () => {
            container.classList.remove(openClass);
            trigger.setAttribute('aria-expanded', 'false');
            dropdown.hidden = true;
        };

        const toggleModernDropdown = () => {
            const willOpen = !container.classList.contains(openClass);
            if (willOpen) {
                container.classList.add(openClass);
                trigger.setAttribute('aria-expanded', 'true');
                dropdown.hidden = false;
            } else {
                closeModernDropdown();
            }
        };

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleModernDropdown();
        });

        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleModernDropdown();
            }

            if (event.key === 'Escape') {
                closeModernDropdown();
            }
        });

        dropdown.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) return;
            if (container.contains(event.target)) return;
            closeModernDropdown();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeModernDropdown();
            }
        });
    }

    function initHeaderScripts() {
        initCategoryDropdown();
        initSearchbarHeaderDropdown();
        initModernSearchDropdown();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderScripts);
    } else {
        initHeaderScripts();
    }
})();
