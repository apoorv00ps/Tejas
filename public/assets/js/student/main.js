/* ---------- main: chrome rendering, wiring and boot (the shell of script.js) ---------- */

import { TEAMS, SECTIONS, DAYS, DAY_LABELS } from "./constants.js";
import { h, $ } from "./dom.js";
import { state, viewMode, isAdminView, isAdmin } from "./state.js";
import { loadEmbeddedSchedule, embeddedEvents, mergeScheduleWithEmbedded, dayEvents, curDay, hasScores } from "./data.js";
import { makeDbStore } from "./store.js";
import { setStatus, toast } from "./feedback.js";
import { buildTable, buildAdd, loadStarter, draft } from "./table.js";
import { renderStandings, buildBoard } from "./standings.js";
import { buildLights, startSpores } from "./visuals.js";
import { startReveal, closeReveal } from "./reveal.js";
import { initMusic } from "./audio.js";

var lastSig = "";

function renderSections() {
  var day = curDay(), panel = $("panel"), editing = state.ui.edit && isAdmin();
  var ae = document.activeElement, keep = null;
  if (ae && ae.classList && ae.classList.contains("score")) keep = { sel: 'input.score[data-id="' + (window.CSS && CSS.escape ? CSS.escape(ae.dataset.id) : ae.dataset.id) + '"][data-team="' + ae.dataset.team + '"]', val: ae.value };
  else if (ae && ae.id === "newname") keep = { sel: "#newname", val: draft.name };
  panel.replaceChildren();

  document.querySelectorAll("#tabs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.sec === state.ui.section)); });

  if (day === null) {
    panel.append(h("div", { class: "empty" }, h("p", null, "Choose a day above to view that day's events and scores for each team in the selected committee.")));
  } else if (state.events.size === 0) {
    var box = h("div", { class: "empty" });
    if (state.ui.unlocked && !state.canWrite) {
      box.append(h("p", null, "The board is empty, and this account can't save scores yet. Ask the owner of the page for Editor access."));
    } else if (state.canWrite && isAdminView()) {
      var btn = h("button", { class: "btn primary", type: "button" }, "Load starter events");
      btn.addEventListener("click", function () { loadStarter(btn); });
      box.append(h("p", null, "The board is empty. Load a starter schedule with six events per section across the three days, then rename or delete anything you don't need."), btn);
    } else if (state.noDb) {
      box.append(h("p", null, "The live scoreboard is only shown to signed-in viewers. Sign in to TEJAS and open this page again."));
    } else {
      box.append(h("p", null, "Nothing on the board yet. Scores appear here as soon as the organizers enter them."));
    }
    panel.append(box);
  } else {
    panel.append(buildTable(state.ui.section, day));
    panel.append(h("div", { class: "key" }, TEAMS.map(function (tm) { return h("span", { style: "--c:" + tm.color }, h("i", { class: "dot" }), tm.short + " " + tm.name); })));
    if (dayEvents(day, state.ui.section).length === 0) {
      panel.append(h("div", { class: "empty" }, h("p", null, "No " + state.ui.section + " events on Day " + day + " yet.")));
    }
    if (editing) panel.append(buildAdd(state.ui.section));
  }
  if (keep) {
    var n = panel.querySelector(keep.sel);
    if (n) { n.value = keep.val; n.focus(); }
  }
  $("real-sub").textContent = day === null
    ? SECTIONS.filter(function (s) { return s.id === state.ui.section; })[0].label + " committee · choose a day"
    : editing ? "Organizer mode · type points and press Tab" : SECTIONS.filter(function (s) { return s.id === state.ui.section; })[0].label + " · Day " + day;
}

function renderChrome() {
  var day = curDay();
  document.querySelectorAll("#dayseg button").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.day) === day)); });
  $("standings-section").hidden = day === null;
  /* The reveal ceremony is a display feature for the closing event, so the
   * button stays visible; it stays disabled until real scores exist.
   * (Organizer *editing* lives on admin.html — see the README.) */
  var rb = $("revealbtn"), ok = hasScores();
  rb.disabled = !ok;
  rb.title = ok ? "" : "Enter some scores first";
}

/* Exported so table.js can request a re-render (e.g. after an edit). The
 * import cycle main.js <-> table.js is safe: renderAll is only invoked at
 * runtime, never during module evaluation. */
export function renderAll(force) {
  var sig = JSON.stringify(Array.from(state.events.entries())) + "|" + state.ui.section + "|" + curDay() + "|" + state.ui.edit + "|" + state.canWrite + "|" + state.noDb + "|" + state.ui.rank + "|" + state.ui.unlocked + "|" + viewMode() + "|" + state.ui.role;
  if (!force && sig === lastSig) return;
  lastSig = sig;
  if (curDay() !== null) renderStandings();
  renderSections(); renderChrome();
}

function applyView() {
  var adm = isAdminView();
  var k = $("kicker");
  k.replaceChildren(h("span", { class: "viewtag" }, adm ? "Admin panel" : "Live scoreboard"), document.createTextNode(" \u00b7 Hostel Fest \u00b7 3 days \u00b7 8 teams"));
  $("foot").textContent = adm
    ? "Admin panel. Students see the same live scores, without any of these controls."
    : "Scores are refreshed by the organizers after each event. The bar above each team splits its total into Sports, Edufun and Cultural.";
  $("credits").hidden = adm;
  document.title = "TEJAS 2.0 Live";
}

function wire() {
  initMusic();
  var seg = $("dayseg");
  DAYS.forEach(function (d) {
    seg.append(h("button", { type: "button", "data-day": d, "aria-pressed": "false", onclick: function () { state.ui.day = d; renderAll(); } }, DAY_LABELS[d - 1]));
  });
  var tabs = $("tabs");
  SECTIONS.forEach(function (s) {
    tabs.append(h("button", { type: "button", "data-sec": s.id, "aria-pressed": String(s.id === state.ui.section), onclick: function () { state.ui.section = s.id; renderAll(); } }, s.label));
  });
  $("revealbtn").addEventListener("click", startReveal);
  $("rv-close").addEventListener("click", closeReveal);
  $("rv-replay").addEventListener("click", startReveal);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeReveal(); });

  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(buildLights, 200); });
}

async function init() {
  applyView(); buildLights(); startSpores(); buildBoard(); wire();
  renderAll(true);
  state.canWrite = false; state.ui.unlocked = false; state.ui.role = "student";
  /* Was: `var EMBED = {...}` inline in script.js — now loaded from the seed file. */
  await loadEmbeddedSchedule();
  state.events = new Map(embeddedEvents());
  var config = window.TEJAS_FIREBASE_CONFIG;
  if (config && config.projectId && window.firebase && firebase.apps) {
    try {
      var app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      state.store = makeDbStore(app.database());
      state.events = new Map();
      setStatus("wait", "Connecting to live scores");
      renderAll(true);
      state.store.subscribe(function (liveEvents) {
        state.events = mergeScheduleWithEmbedded(liveEvents);
        if (liveEvents.size) {
          var when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
          setStatus("live", "Updated " + when + " IST");
        } else {
          setStatus("local", "Published schedule · awaiting database setup");
        }
        renderAll(true);
      }, function (err) {
        state.events = new Map(embeddedEvents());
        setStatus("off", "Live scores unavailable");
        toast("Couldn't load live scores from Firebase: " + err.message);
        renderAll(true);
      });
      return;
    } catch (err) {
      setStatus("off", "Live scores unavailable");
      toast("Couldn't connect to Firebase: " + err.message);
      state.events = new Map();
      renderAll(true);
      return;
    }
  }
  setStatus("local", "Published scores");
  state.noDb = !(config && config.projectId && window.firebase && firebase.apps);
  renderAll(true);
}

init();
