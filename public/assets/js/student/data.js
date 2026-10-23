/* Schedule data layer: embedded fallback schedule, filtering and rankings. */

import { TEAMS, SEC_IDS, DAYS } from "./constants.js";
import { num } from "./dom.js";
import { state } from "./state.js";

/* Public-only fallback schedule, separate from the admin's event seed. */
var embeddedSchedule = new Map();

export function loadEmbeddedSchedule() {
  return fetch(new URL("../../data/student-events.seed.json", import.meta.url), { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("Could not fetch student-events.seed.json (HTTP " + response.status + ").");
      return response.json();
    })
    .then(function (schedule) {
      embeddedSchedule = new Map(Object.entries(schedule || {}));
    })
    .catch(function () {
      embeddedSchedule = new Map();
    });
}

export function embeddedEvents() { return embeddedSchedule; }

/* Overlay live database events on top of the embedded schedule.
 * Event metadata (names, times, venues, order) comes from the schedule;
 * scores come from the database; anything missing falls back to the seed. */
export function mergeScheduleWithEmbedded(liveEvents) {
  var merged = new Map(embeddedSchedule);
  liveEvents.forEach(function (liveEvent, id) {
    var embeddedEvent = embeddedSchedule.get(id) || {};
    var scores = Object.assign({}, embeddedEvent.scores || {}, liveEvent && liveEvent.scores || {});
    merged.set(id, Object.assign({}, liveEvent || {}, embeddedEvent, { scores: scores }));
  });
  return merged;
}

/* Normalized, sorted view of every stored event (optionally filtered). */
export function evList(maxDay, sec) {
  var out = [];
  state.events.forEach(function (e, id) {
    if (!e || typeof e !== "object") return;
    var day = Number(e.day);
    if (DAYS.indexOf(day) < 0 || day > maxDay) return;
    if (SEC_IDS.indexOf(e.section) < 0) return;
    if (sec && e.section !== sec) return;
    out.push({
      id: id, section: e.section, day: day,
      name: String(e.name || "Untitled"),
      time: String(e.time || ""),
      venue: String(e.venue || ""),
      order: Number(e.order) || 0,
      scores: e.scores && typeof e.scores === "object" ? e.scores : {}
    });
  });
  out.sort(function (a, b) { return a.day - b.day || a.order - b.order || a.name.localeCompare(b.name); });
  return out;
}

export function dayEvents(day, sec) {
  return evList(Infinity, sec).filter(function (e) { return e.day === day; });
}

/* Per-team totals, optionally limited to events up to a given day. */
export function totals(maxDay, section) {
  var t = {};
  TEAMS.forEach(function (tm) { t[tm.id] = { sports: 0, edufun: 0, cultural: 0, total: 0 }; });
  var scoreEvents = maxDay === Infinity ? evList(Infinity, section) : dayEvents(maxDay, section);
  scoreEvents.forEach(function (e) {
    if (SEC_IDS.indexOf(e.section) < 0) return;
    TEAMS.forEach(function (tm) {
      var v = num(e.scores[tm.id]);
      if (v !== null) { t[tm.id][e.section] += v; t[tm.id].total += v; }
    });
  });
  return t;
}

/* Teams sorted by total with competition ranking (ties share a rank). */
export function ranked(maxDay, section) {
  var t = totals(maxDay, section);
  var arr = TEAMS.map(function (tm) {
    var x = t[tm.id];
    return { team: tm, sports: x.sports, edufun: x.edufun, cultural: x.cultural, total: x.total, rank: 0 };
  });
  arr.sort(function (a, b) { return b.total - a.total || a.team.name.localeCompare(b.team.name); });
  var r = 0;
  arr.forEach(function (x, i) { if (i === 0 || x.total !== arr[i - 1].total) r = i + 1; x.rank = r; });
  return arr;
}

export function hasScores() {
  return evList(Infinity).some(function (e) {
    return TEAMS.some(function (tm) {
      var score = num(e.scores[tm.id]);
      return score !== null && score !== 0;
    });
  });
}

export function curDay() {
  return state.ui.day;
}
