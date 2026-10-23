/* ---------- section tables: score grid, rank editor and add-event form ---------- */

import { TEAMS, SECTIONS, DAYS, PLACE_POINTS, SEC_IDS, MIN_SCORE, MAX_SCORE } from "./constants.js";
import { catalogFor, STARTER } from "./catalog.js";
import { h, num, fmt, ordinal, slug, $ } from "./dom.js";
import { state, isAdmin } from "./state.js";
import { toast, act } from "./feedback.js";
import { evList, dayEvents } from "./data.js";
import { renderAll } from "./main.js";

/* Add-event form draft (shared with renderSections' focus restore). */
export var draft = { name: "", day: 1 };
/* Finishing-order draft for the rank editor. */
var rankDraft = { 1: "", 2: "", 3: "", 4: "", 5: "", 6: "", 7: "", 8: "" };
/* Debounced score commits keyed by "id|team". */
var pending = new Map();

function delBtn(e) {
  var armed = false, timer = 0;
  var b = h("button", { type: "button", class: "del", "aria-label": "Delete " + e.name }, "×");
  b.addEventListener("click", function () {
    if (!armed) {
      armed = true; b.textContent = "Sure?"; b.classList.add("armed");
      timer = setTimeout(function () { armed = false; b.textContent = "×"; b.classList.remove("armed"); }, 3000);
    } else { clearTimeout(timer); act(function () { return state.store.remove(e.id); }); }
  });
  return b;
}
function commitScore(id, team, raw) {
  var v = 0;
  raw = String(raw).trim();
  if (raw !== "") {
    v = Number(raw);
    if (!isFinite(v) || v < MIN_SCORE || v > MAX_SCORE) { toast("Enter a number from " + MIN_SCORE + " to " + MAX_SCORE + "."); return; }
  }
  var e = state.events.get(id), cur = e && e.scores ? num(e.scores[team]) : null;
  if (cur === v) return;
  act(function () { return state.store.setScore(id, team, v); });
}
function onScoreInput(ev) {
  var i = ev.target;
  if (i.validity && i.validity.badInput) return;
  var id = i.dataset.id, team = i.dataset.team, raw = i.value, key = id + "|" + team;
  var p = pending.get(key);
  if (p) clearTimeout(p.timer);
  pending.set(key, { timer: setTimeout(function () { pending.delete(key); commitScore(id, team, raw); }, 700) });
}
function onScoreChange(ev) {
  var i = ev.target, key = i.dataset.id + "|" + i.dataset.team, p = pending.get(key);
  if (p) { clearTimeout(p.timer); pending.delete(key); }
  commitScore(i.dataset.id, i.dataset.team, i.value);
}

function blankDraft() { var d = {}; for (var i = 1; i <= PLACE_POINTS.length; i++) d[i] = ""; return d; }
function rankBtn(e) {
  return h("button", {
    type: "button", class: "mini", "aria-expanded": String(state.ui.rank === e.id), "aria-label": "Enter finishing order for " + e.name,
    onclick: function () { state.ui.rank = state.ui.rank === e.id ? null : e.id; rankDraft = blankDraft(); renderAll(true); }
  }, "Rank");
}
function buildRankRow(e) {
  var places = PLACE_POINTS.map(function (_, i) { return i + 1; });
  var taken = {};
  places.forEach(function (p) { if (rankDraft[p]) taken[rankDraft[p]] = p; });
  var sels = places.map(function (p) {
    var sel = h("select", {
      "data-place": p, "aria-label": ordinal(p) + " place",
      onchange: function (ev) {
        rankDraft[p] = ev.target.value;
        renderAll(true);
        var next = document.querySelector('.rankrow select[data-place="' + Math.min(p + 1, PLACE_POINTS.length) + '"]');
        if (next) next.focus();
      }
    },
      h("option", { value: "" }, "Choose team"),
      TEAMS.filter(function (tm) { return !taken[tm.id] || taken[tm.id] === p; })
        .map(function (tm) { return h("option", { value: tm.id, selected: rankDraft[p] === tm.id }, tm.name); }));
    return h("label", { class: "rk", style: rankDraft[p] ? "--c:" + TEAMS.filter(function (t) { return t.id === rankDraft[p]; })[0].color : null },
      h("span", null, ordinal(p) + " \u00b7 " + PLACE_POINTS[p - 1] + " pts"), sel);
  });
  var filled = places.filter(function (p) { return rankDraft[p]; }).length;
  return h("tr", { class: "rankrow" }, h("td", { colspan: TEAMS.length + 1 },
    h("div", { class: "rkgrid" }, sels),
    h("div", { class: "rkwrap" },
      h("button", { type: "button", class: "btn primary", onclick: function () { applyRank(e); } }, "Apply points"),
      h("button", { type: "button", class: "btn", onclick: function () { rankDraft = blankDraft(); renderAll(true); } }, "Clear"),
      h("button", { type: "button", class: "btn", onclick: function () { state.ui.rank = null; renderAll(true); } }, "Cancel"),
      h("span", { class: "rkcount" }, filled + " of " + PLACE_POINTS.length + " places filled. Teams left out get 0."))));
}
function applyRank(e) {
  var n = PLACE_POINTS.length, picks = [], p;
  for (p = 1; p <= n; p++) if (rankDraft[p]) picks.push(rankDraft[p]);
  if (!picks.length) { toast("Choose at least the winner."); return; }
  for (p = 2; p <= n; p++) { if (rankDraft[p] && !rankDraft[p - 1]) { toast("Fill the places in order, starting with 1st."); return; } }
  if (new Set(picks).size !== picks.length) { toast("Each team can take only one place."); return; }
  var scores = {};
  TEAMS.forEach(function (tm) { scores[tm.id] = 0; });
  for (p = 1; p <= n; p++) if (rankDraft[p]) scores[rankDraft[p]] = PLACE_POINTS[p - 1];
  state.ui.rank = null;
  act(function () { return state.store.setScores(e.id, scores); });
  renderAll(true);
}

function buildTable(sec, day) {
  var evs = dayEvents(day, sec), editing = state.ui.edit && isAdmin();
  var head = h("tr", null,
    h("th", { scope: "col", class: "evcol" }, "Event"),
    TEAMS.map(function (tm) { return h("th", { scope: "col", title: tm.name, style: "--c:" + tm.color }, h("i", { class: "dot" }), tm.short); }));
  var body = h("tbody"), lastDay = null;
  evs.forEach(function (e) {
    if (e.day !== lastDay) {
      lastDay = e.day;
      body.append(h("tr", { class: "dayrow" }, h("th", { colspan: TEAMS.length + 1, scope: "colgroup" }, "Day " + e.day)));
    }
    var vals = TEAMS.map(function (tm) { return num(e.scores[tm.id]); });
    var mx = Math.max.apply(null, vals.map(function (v) { return v === null ? -Infinity : v; }));
    var nameNodes = [h("span", { class: "evname" }, e.name)];
    if (e.time || e.venue) {
      var metaStr = [e.time, e.venue].filter(Boolean).join(" · ");
      nameNodes.push(h("span", { class: "evmeta" }, metaStr));
    }
    var tr = h("tr", null, h("th", { scope: "row" }, nameNodes, editing ? [rankBtn(e), delBtn(e)] : null));
    TEAMS.forEach(function (tm, idx) {
      var v = vals[idx], cell;
      if (editing) {
        cell = h("input", { class: "score", type: "number", step: "any", inputmode: "decimal", value: v === null ? "" : v, "data-id": e.id, "data-team": tm.id, "aria-label": e.name + ", " + tm.name, oninput: onScoreInput, onchange: onScoreChange });
      } else {
        cell = h("span", { class: "num" }, v === null ? "–" : fmt(v));
      }
      tr.append(h("td", { class: v !== null && v > 0 && v === mx ? "top" : null, style: "--c:" + tm.color },
        h("span", { class: "mobile-team-name" }, tm.name), cell));
    });
    body.append(tr);
    if (editing && state.ui.rank === e.id) body.append(buildRankRow(e));
  });
  var sums = TEAMS.map(function (tm) { return evs.reduce(function (a, e) { return a + (num(e.scores[tm.id]) || 0); }, 0); });
  var smax = Math.max.apply(null, sums);
  var foot = h("tfoot", null, h("tr", null,
    h("th", { scope: "row" }, "Section total"),
    TEAMS.map(function (tm, idx) {
      return h("td", { class: smax > 0 && sums[idx] === smax ? "top" : null, style: "--c:" + tm.color },
        h("span", { class: "mobile-team-name" }, tm.name), fmt(sums[idx]));
    })));
  return h("div", { class: "tablewrap" },
    h("table", null, h("caption", { class: "sr-only" }, SECTIONS.filter(function (s) { return s.id === sec; })[0].label + " points by team"), h("thead", null, head), body, foot));
}

function buildAdd(sec) {
  var cat = catalogFor(sec), listId = "dl-" + sec;
  var have = {};
  evList(Infinity, sec).forEach(function (e) { have[e.name.toLowerCase()] = true; });
  var name = h("input", { id: "newname", type: "text", maxlength: "40", list: listId, autocomplete: "off", placeholder: "Start typing, e.g. " + cat.slice(0, 2).map(function (c) { return c.name; }).join(", "), "aria-label": "Event name", value: draft.name, oninput: function (e) { draft.name = e.target.value; } });
  var dl = h("datalist", { id: listId }, cat.map(function (c) { return h("option", { value: c.name, label: c.tag }); }));
  var day = h("select", { id: "newday", "aria-label": "Day", onchange: function (e) { draft.day = Number(e.target.value); } },
    DAYS.map(function (d) { return h("option", { value: d, selected: d === draft.day }, "Day " + d); }));
  var form = h("form", { class: "addrow", onsubmit: function (e) { e.preventDefault(); addEvent(sec); } }, name, dl, day, h("button", { class: "btn", type: "submit" }, "Add event"));
  var pool = cat.filter(function (c) { return !have[c.name.toLowerCase()]; }).slice(0, 8);
  var chips = h("div", { class: "chips" }, h("span", null, "Popular"),
    pool.length ? pool.map(function (c) {
      return h("button", { type: "button", class: "chip", title: c.tag, onclick: function () { draft.name = c.name; renderAll(true); var n = $("newname"); if (n) n.focus(); } }, c.name);
    }) : h("span", null, "No suggestions. You can still type any name."));
  return h("div", null, form, chips);
}
function addEvent(sec) {
  var name = draft.name.trim();
  if (!name) { toast("Type an event name first."); return; }
  var id = sec + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  var data = { section: sec, day: draft.day, name: name, order: Date.now(), scores: {} };
  state.ui.day = data.day;
  draft.name = "";
  act(function () { return state.store.setEvent(id, data); });
  renderAll(true);
}
function loadStarter(btn) {
  btn.disabled = true;
  var n = 0, jobs = [];
  SEC_IDS.forEach(function (sec) {
    STARTER[sec].forEach(function (p) {
      var id = sec + "-d" + p[0] + "-" + slug(p[1]);
      n++;
      if (!state.events.has(id)) jobs.push([id, { section: sec, day: p[0], name: p[1], order: n, scores: {} }]);
    });
  });
  jobs.reduce(function (chain, j) { return chain.then(function () { return state.store.setEvent(j[0], j[1]); }); }, Promise.resolve())
    .catch(function () { toast("Couldn't load the starter events. Check that you are signed in as an organizer."); btn.disabled = false; });
}

export { buildTable, buildAdd, loadStarter };
