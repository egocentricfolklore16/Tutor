/**
 * Centralized z-index layers for Hyper Tutor.
 * Using unified z-index constants prevents layering conflicts (e.g. modals sitting under sticky headers or sidebars).
 */
export const Z_INDEX = {
  PAGE: 0,
  STICKY_HEADER: 20,
  APP_SIDEBAR: 30,
  FAB: 40,
  CHAT: 60,
  POPOVER: 70,
  MODAL: 80,
  TOAST: 90,
  TOOLTIP: 100,
};

export default Z_INDEX;
