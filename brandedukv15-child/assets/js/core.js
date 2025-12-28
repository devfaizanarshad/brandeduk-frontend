/**
 * core.js
 * Purpose: Shared helpers/utilities and shared state keys.
 * Keep this dependency-light (Elementor-friendly).
 */

(function (window) {
  'use strict';

  window.brandedukv15 = window.brandedukv15 || {};

  window.brandedukv15.storageKeys = {
    quoteBasket: 'quoteBasket',
    customizingProduct: 'customizingProduct',
    selectedPositions: 'selectedPositions',
    positionCustomizations: 'positionCustomizations'
  };

  window.brandedukv15.toNumber = function (val, fallback) {
    var n = typeof val === 'number' ? val : parseFloat(val);
    return Number.isFinite(n) ? n : (fallback || 0);
  };

  // Cart badge update function
  window.brandedukv15.updateCartBadge = function() {
    var badge = document.getElementById('cartBadge');
    if (!badge) return;
    
    try {
      var basket = JSON.parse(localStorage.getItem('quoteBasket')) || [];
      var totalItems = basket.reduce(function(sum, item) {
        return sum + (item.quantity || 0);
      }, 0);
      
      if (totalItems > 0) {
        badge.textContent = totalItems > 99 ? '99+' : totalItems;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      badge.style.display = 'none';
    }
  };

  // Update badge on page load
  document.addEventListener('DOMContentLoaded', function() {
    window.brandedukv15.updateCartBadge();
  });

  // Listen for storage changes (cross-tab sync)
  window.addEventListener('storage', function(e) {
    if (e.key === 'quoteBasket') {
      window.brandedukv15.updateCartBadge();
    }
  });

})(window);
