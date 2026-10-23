/* DOM helpers and small pure utilities shared by every view module. */

import { MIN_SCORE, MAX_SCORE } from "./constants.js";

export var $ = function (id) { return document.getElementById(id); };

/* h(tag, attrs, ...children): tiny hyperscript-style element builder. */
export function h(tag, attrs) {
  var n = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
  }
  for (var i = 2; i < arguments.length; i++) {
    var kids = [].concat(arguments[i]);
    for (var j = 0; j < kids.length; j++) {
      var c = kids[j];
      if (c === null || c === undefined || c === false) continue;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
  }
  return n;
}

/* Clamp/validate a stored score; returns null when the value is out of range. */
export function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  var n = Number(v);
  return isFinite(n) && n >= MIN_SCORE && n <= MAX_SCORE ? n : null;
}

export function fmt(n) { return String(n); }

export function ordinal(n) { return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : n + "th"; }

export function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
