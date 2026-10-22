/**
 * Centralized z-index layers for Hyper Tutor.
 * Using unified z-index constants prevents layering conflicts (e.g. modals sitting under sticky headers or sidebars).
 */
export const Z_INDEX = {
  SIDEBAR: 40,
  STICKY_HEADER: 50,
  DROPDOWN: 60,
  FAB: 70,
  MODAL_BACKDROP: 1000,
  MODAL_PANEL: 1001,
  TOAST: 2000,
};

export default Z_INDEX;
