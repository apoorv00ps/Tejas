/* Standings board: per-team totals with live ranking. */

import { TEAMS, SECTIONS } from "./constants.js";
import { h, $, fmt } from "./dom.js";
import { ranked, curDay } from "./data.js";
import { state } from "./state.js";

var rows = new Map();

export function buildBoard() {
  var ol = $("board");
  TEAMS.forEach(function (tm) {
    var li = h("li", { class: "row", style: "--c:" + tm.color },
      h("span", { class: "rank" }),
      h("span", { class: "who" }, h("i", { class: "dot" }), h("span", { class: "nm" }, tm.name), h("span", { class: "lead", hidden: true }, "Leading")),
      h("span", { class: "pts" }),
      h("div", { class: "bar" }, h("b")));
    rows.set(tm.id, li); ol.append(li);
  });
}

export function renderStandings() {
  var day = curDay(), section = state.ui.section, r = ranked(day, section);
  var max = Math.max(1, Math.max.apply(null, r.map(function (x) { return x.total; })));
  var leaders = r.filter(function (x) { return x.rank === 1; }).length;
  r.forEach(function (x) {
    var li = rows.get(x.team.id);
    $("board").append(li);
    li.classList.toggle("first", x.rank === 1 && x.total > 0);
    li.querySelector(".rank").textContent = x.rank;
    li.querySelector(".pts").textContent = fmt(x.total);
    li.querySelector(".bar b").style.width = Math.max(0, x.total / max * 100) + "%";
    var lead = li.querySelector(".lead");
    lead.hidden = !(x.rank === 1 && x.total > 0);
    lead.textContent = leaders > 1 ? "Tied lead" : "Leading";
  });
  $("stand-sub").textContent = "Day " + day + " · " + SECTIONS.filter(function (s) { return s.id === section; })[0].label;
}
