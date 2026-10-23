/* Ambient background visuals: twinkling lights and floating spores. */

import { $, h } from "./dom.js";
import { reduce } from "./state.js";

var wallBuilt = false, wallCells = [];

export function buildLights() {
  if (wallBuilt) return;
  wallBuilt = true;
  var box = $("wall"), cols = ["#ffb347", "#35d8e0", "#ff4d5e", "#4db8ff", "#ff7ac0", "#4ee0a1", "#b07cff", "#f2e14c"];
  for (var i = 0; i < 26; i++) {
    var ch = String.fromCharCode(65 + i), cell = h("div", { class: "cell", style: "--b:" + cols[i % cols.length] }, h("i"), h("b", null, ch));
    wallCells[ch] = cell; box.append(cell);
  }
  var MSGS = ["POORNIMA", "TEJAS", "POORNIMA", "HOSTEL FEST", "POORNIMA HOSTEL", "WELCOME", "POORNIMA"];
  if (reduce) { Object.keys(wallCells).forEach(function (k) { wallCells[k].classList.add("on"); }); return; }
  var mi = 0;
  function sleepW(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function spell(msg) {
    for (var j = 0; j < msg.length; j++) {
      var c = wallCells[msg[j]];
      if (c) { c.classList.add("on"); await sleepW(420); c.classList.remove("on"); await sleepW(140); }
      else await sleepW(520);
    }
  }
  (async function loop() {
    await sleepW(1200);
    while (true) {
      if (!document.hidden) { await spell(MSGS[mi % MSGS.length]); mi++; }
      await sleepW(5000);
    }
  })();
}

export function startSpores() {
  var c = $("spores"), ctx = c.getContext("2d"), w = 0, ht = 0, dpr = 1, P = [], i;
  function size() { dpr = Math.min(2, window.devicePixelRatio || 1); w = c.width = Math.floor(innerWidth * dpr); ht = c.height = Math.floor(innerHeight * dpr); }
  size(); window.addEventListener("resize", size);
  for (i = 0; i < 48; i++) P.push({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .02 + Math.random() * .05, dx: (Math.random() - .5) * .02, a: .15 + Math.random() * .35, c: Math.random() < .7 ? "255,110,90" : "255,193,94" });
  var running = false;
  function draw(step) {
    ctx.clearRect(0, 0, w, ht);
    P.forEach(function (p) {
      if (step) { p.y -= p.v / 60; p.x += p.dx / 60; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); } }
      ctx.fillStyle = "rgba(" + p.c + "," + p.a + ")";
      ctx.beginPath(); ctx.arc(p.x * w, p.y * ht, p.r * dpr, 0, 6.283); ctx.fill();
    });
  }
  function loop() { if (reduce || document.hidden) { running = false; return; } draw(true); requestAnimationFrame(loop); }
  draw(false);
  if (!reduce) { running = true; requestAnimationFrame(loop); }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && !running && !reduce) { running = true; requestAnimationFrame(loop); } });
}
