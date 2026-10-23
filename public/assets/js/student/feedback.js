/* User feedback: toasts, safe action wrapper and the connection status pill. */

import { $ } from "./dom.js";

var toastTimer = 0;

export function toast(msg) {
  var t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 4500);
}

/* Run a store write; failures surface as a friendly toast. */
export function act(fn) {
  return Promise.resolve().then(fn).catch(function () {
    toast("Couldn't save that. Check that you are signed in as an organizer, then try again.");
  });
}

var lastStatus = ["wait", "Connecting"];

export function setStatus(statusState, text) { lastStatus = [statusState, text]; refreshStatus(); }

export function refreshStatus() {
  var s = $("status"), st = lastStatus[0], tx = lastStatus[1];
  s.dataset.state = st; s.textContent = tx;
}
