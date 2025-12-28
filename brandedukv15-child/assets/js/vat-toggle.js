(function (window, document) {
    'use strict';

    var STORAGE_KEY = 'brandeduk-vat-mode';
    var VAT_RATE = 0.20;

    window.brandedukv15 = window.brandedukv15 || {};

    function getStorage() {
        try {
            return window.localStorage;
        } catch (error) {
            return null;
        }
    }

    function readState() {
        var store = getStorage();
        if (!store) {
            return false;
        }
        return store.getItem(STORAGE_KEY) === 'on';
    }

    function writeState(nextState) {
        var store = getStorage();
        if (!store) {
            return;
        }
        try {
            store.setItem(STORAGE_KEY, nextState ? 'on' : 'off');
        } catch (error) {
            console.warn('VAT toggle: unable to persist state', error);
        }
    }

    function dispatchChange(source) {
        var isOn = readState();
        var event;

        try {
            event = new CustomEvent('brandeduk:vat-change', {
                detail: {
                    isOn: isOn,
                    rate: VAT_RATE,
                    source: source || 'toggle'
                }
            });
        } catch (error) {
            event = document.createEvent('CustomEvent');
            event.initCustomEvent('brandeduk:vat-change', false, false, {
                isOn: isOn,
                rate: VAT_RATE,
                source: source || 'toggle'
            });
        }

        document.dispatchEvent(event);
    }

    function updateControl(control, isOn) {
        var button = control.querySelector('.header-top-vat-toggle');
        if (!button) {
            return;
        }

        button.classList.toggle('is-on', isOn);
        button.setAttribute('aria-pressed', isOn ? 'true' : 'false');
        button.setAttribute(
            'aria-label',
            isOn ? 'Show prices excluding VAT' : 'Show prices including VAT'
        );

        var incLabel = control.querySelector('[data-vat-inc]');
        var excLabel = control.querySelector('[data-vat-exc]');
        if (incLabel) {
            incLabel.classList.toggle('is-active', isOn);
        }
        if (excLabel) {
            excLabel.classList.toggle('is-active', !isOn);
        }
    }

    function setupControl(control) {
        var button = control.querySelector('.header-top-vat-toggle');
        if (!button) {
            return;
        }

        if (!control.hasAttribute('data-vat-init')) {
            button.addEventListener('click', function () {
                var nextState = !readState();
                writeState(nextState);
                syncControls();
                dispatchChange('toggle');
            });
            control.setAttribute('data-vat-init', 'true');
        }

        updateControl(control, readState());
    }

    function syncControls() {
        var controls = document.querySelectorAll('.header-top-vat-control');
        var isOn = readState();
        controls.forEach(function (control) {
            setupControl(control);
            updateControl(control, isOn);
        });
    }

    var vatApi = {
        rate: VAT_RATE,
        isOn: function () {
            return readState();
        },
        set: function (nextState) {
            writeState(!!nextState);
            syncControls();
            dispatchChange('programmatic');
        },
        toggle: function () {
            this.set(!this.isOn());
        },
        apply: function (baseAmount, options) {
            if (!Number.isFinite(baseAmount)) {
                baseAmount = parseFloat(baseAmount) || 0;
            }
            var includeVat = !options || options.includeVat !== false;
            if (!includeVat || !this.isOn()) {
                return baseAmount;
            }
            return baseAmount * (1 + VAT_RATE);
        },
        vatAmount: function (baseAmount) {
            if (!Number.isFinite(baseAmount)) {
                baseAmount = parseFloat(baseAmount) || 0;
            }
            return this.isOn() ? baseAmount * VAT_RATE : 0;
        },
        format: function (baseAmount, options) {
            options = options || {};
            var currency = options.currency || '£';
            var decimals = Number.isFinite(options.decimals) ? options.decimals : 2;
            var includeVat = options.includeVat !== false;
            var value = includeVat ? this.apply(baseAmount, options) : baseAmount;
            return currency + value.toFixed(decimals);
        },
        suffix: function () {
            return this.isOn() ? 'inc VAT' : 'ex VAT';
        },
        onChange: function (handler) {
            document.addEventListener('brandeduk:vat-change', handler);
        },
        offChange: function (handler) {
            document.removeEventListener('brandeduk:vat-change', handler);
        }
    };

    window.brandedukv15.vat = vatApi;

    function init() {
        syncControls();
        dispatchChange('init');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(window, document);
