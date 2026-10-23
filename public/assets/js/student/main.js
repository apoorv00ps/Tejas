/* ---------- main: chrome rendering, wiring and boot (the shell of script.js) ---------- */

import { TEAMS, SECTIONS, DAYS } from "./constants.js";
import { h, $ } from "./dom.js";
import { state, viewMode, isAdminView } from "./state.js";
import { loadEmbeddedSchedule, embeddedEvents, mergeScheduleWithEmbedded, dayEvents, curDay, hasScores } from "./data.js";
import { makeDbStore } from "./store.js";
import { setStatus, toast } from "./feedback.js";
import { buildTable } from "./table.js";
import { renderStandings, buildBoard } from "./standings.js";
import { buildLights, startSpores } from "./visuals.js";
import { startReveal, closeReveal } from "./reveal.js";
import { initMusic } from "./audio.js";

var lastSig = "";
var standingSwitches = [
  { at: Date.parse("2026-10-23T18:00:00+05:30"), day: 2 },
  { at: Date.parse("2026-10-24T18:00:00+05:30"), day: 3 },
  { at: Date.parse("2026-10-25T18:00:00+05:30"), day: 4 }
];
var standingTimer = 0;

function standingDayAt(now) {
  for (var i = 0; i < standingSwitches.length; i++) {
    if (now < standingSwitches[i].at) return standingSwitches[i].day - 1;
  }
  return DAYS[DAYS.length - 1];
}

function standingWindowLabel(day) {
  var next = standingSwitches.filter(function (change) { return change.day === day + 1; })[0];
  if (!next) return "Day " + day + " standings · Final day";
  var when = new Date(next.at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
  return "Day " + day + " standings · Day " + next.day + " begins " + when + " IST";
}

function scheduleStandingUpdate() {
  clearTimeout(standingTimer);
  var now = Date.now(), next = standingSwitches.filter(function (change) { return change.at > now; })[0];
  if (!next) return;
  standingTimer = setTimeout(function () {
    state.ui.day = standingDayAt(Date.now());
    renderAll(true);
  }, next.at - now + 50);
}

function renderSections() {
  var day = curDay();
  document.querySelectorAll("#tabs button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.sec === state.ui.section)); });
  $("real-sub").textContent = SECTIONS.filter(function (s) { return s.id === state.ui.section; })[0].label;
}

function renderChrome() {
  var day = curDay();
  $("standings-section").hidden = day === null;
  $("standing-window").textContent = day === null ? "" : standingWindowLabel(day);
  var scorecard = $("scorecard-section"), scorePanel = $("panel");
  scorecard.hidden = day === null;
  if (day !== null) {
    $("scorecard-sub").textContent = SECTIONS.filter(function (s) { return s.id === state.ui.section; })[0].label + " · Day " + day;
    scorePanel.replaceChildren(buildTable(state.ui.section, day));
    scorePanel.append(h("div", { class: "key" }, TEAMS.map(function (tm) {
      return h("span", { style: "--c:" + tm.color }, h("i", { class: "dot" }), tm.short + " " + tm.name);
    })));
    if (dayEvents(day, state.ui.section).length === 0) {
      scorePanel.append(h("div", { class: "empty" }, h("p", null, "No " + state.ui.section + " events on Day " + day + " yet.")));
    }
  }
  /* The reveal ceremony is a display feature for the closing event, so the
   * button stays visible; it stays disabled until real scores exist.
   * (Organizer *editing* lives on admin.html — see the README.) */
  var rb = $("revealbtn"), ok = hasScores();
  rb.disabled = !ok;
  rb.title = ok ? "" : "Enter some scores first";
  scheduleStandingUpdate();
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
  k.replaceChildren(h("span", { class: "viewtag" }, adm ? "Admin panel" : "Live scoreboard"), document.createTextNode(" \u00b7 Hostel Fest \u00b7 " + DAYS.length + " days \u00b7 8 teams"));
  $("foot").textContent = adm
    ? "Admin panel. Students see the same live scores, without any of these controls."
    : "Standings and event scores show the current day's results for the selected committee.";
  $("credits").hidden = adm;
  document.title = "TEJAS 2.0 Live";
}

function wire() {
  initMusic();
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
  state.ui.day = standingDayAt(Date.now());
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
