/* ---------- state ---------- */
/* ES module exports are read-only bindings, so every value that more than one
 * module reassigns lives inside this single `state` container object. */

export var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export var state = {
  /* Live event map: id -> { day, section, name, time, venue, order, scores } */
  events: new Map(),
  /* Data store (see store.js). Null until Firebase connects. */
  store: null,
  /* True only when the signed-in account is allowed to write scores. */
  canWrite: false,
  /* True when Firebase is not configured at all. */
  noDb: false,
  /* UI flags: selected day/section, organizer edit mode, open rank editor. */
  ui: { day: null, section: "sports", edit: false, rank: null, unlocked: false, admin: "", role: null, who: "" }
};

/* Signing in as a developer or organizer shows the admin tools. Students only watch. */
export function viewMode() { return state.ui.unlocked ? "admin" : "students"; }
export function isAdminView() { return state.ui.unlocked; }
export function isAdmin() { return state.canWrite && state.ui.unlocked; }
