import $ from 'jquery';

/**
 * Utility for controlled DOM micro-interactions in notifications and modal drawers.
 * Handles DOM traversal, animations, and event delegation cleanly outside React VDOM.
 */

// Toggle sliding notification drawer
export const toggleNotificationDrawer = (drawerSelector = '#app-notification-drawer') => {
  const $drawer = $(drawerSelector);
  if ($drawer.length) {
    $drawer.toggleClass('is-open');
    $drawer.stop(true, true).slideToggle(250);
  }
};

// Smoothly dismiss an individual notification item
export const dismissNotificationItem = (buttonElement) => {
  if (!buttonElement) return;
  const $item = $(buttonElement).closest('.notification-item');
  $item.slideUp(200, function () {
    $(this).remove();
    
    // Check if drawer is empty after removal
    const remainingCount = $('.notification-item').length;
    if (remainingCount === 0) {
      $('#notification-empty-state').fadeIn(200);
      $('.notification-badge-count').fadeOut(150);
    } else {
      $('.notification-badge-count').text(remainingCount);
    }
  });
};

// Initialize interactive listener for notifications
export const initNotificationDrawerListeners = () => {
  $(document).off('click', '.btn-dismiss-notification');
  $(document).on('click', '.btn-dismiss-notification', function (e) {
    e.stopPropagation();
    dismissNotificationItem(this);
  });
};
