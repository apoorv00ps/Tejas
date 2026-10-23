/* ---------- reveal: fireworks canvas, screen shake and the countdown stage ---------- */

import { TEAMS } from "./constants.js";
import { h, fmt, ordinal, $, sleep } from "./dom.js";
import { reduce, isAdmin } from "./state.js";
import { ranked } from "./data.js";
import { S, musicDuck, winStop, winUnlock, winPlay } from "./audio.js";

/* The original script.js declared `rev` and `token` here; the sound engine
 * (buildEngine/S) and the winner fanfare live in audio.js. */
var rev = $("reveal"), token = 0;

/* Fireworks and confetti on one canvas. */
var fx = { raf: 0, on: false, my: 0 };
function fxStop() {
  fx.on = false; cancelAnimationFrame(fx.raf);
  ["rv-burst", "rv-conf"].forEach(function (id) { var c = $(id); if (c.getContext) { var x = c.getContext("2d"); x.globalCompositeOperation = "source-over"; x.clearRect(0, 0, c.width, c.height); } });
}
function fxStart(colors) {
  if (reduce) return;
  fxStop();
  var c = $("rv-burst"), x = c.getContext("2d"), d = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.floor(innerWidth * d); c.height = Math.floor(innerHeight * d);
  var W = c.width, H = c.height, P = [], t0 = performance.now(), last = t0;
  var pal = ["255,120,70", "255,80,60", "255,170,90", "255,60,70"];
  fx.on = true; fx.my = token;
  function spawn(init) {
    return { x: Math.random() * W, y: init ? Math.random() * H : H + 10 * d, r: (.8 + Math.random() * 2) * d, vy: (-(18 + Math.random() * 60)) * d, sw: Math.random() * 6.283, sv: .6 + Math.random() * 1.2, amp: (8 + Math.random() * 26) * d, a: .25 + Math.random() * .6, c: pal[Math.floor(Math.random() * pal.length)], tw: Math.random() * 6.283 };
  }
  var N = Math.min(120, Math.max(50, Math.floor(innerWidth / 9)));
  for (var i = 0; i < N; i++) P.push(spawn(true));
  function frame(now) {
    if (!fx.on || fx.my !== token || rev.hidden) { fxStop(); return; }
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    x.clearRect(0, 0, W, H);
    x.globalCompositeOperation = "lighter";
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      p.y += p.vy * dt; p.sw += p.sv * dt; p.tw += dt * (3 + p.sv * 2);
      var px = p.x + Math.sin(p.sw) * p.amp;
      if (p.y < -10 * d) { P[i] = spawn(false); continue; }
      var al = p.a * (.55 + .45 * Math.sin(p.tw)) * Math.min(1, (p.y / H) * 1.6 + .15);
      var g = x.createRadialGradient(px, p.y, 0, px, p.y, p.r * 4);
      g.addColorStop(0, "rgba(" + p.c + "," + al + ")"); g.addColorStop(1, "rgba(" + p.c + ",0)");
      x.fillStyle = g; x.beginPath(); x.arc(px, p.y, p.r * 4, 0, 6.283); x.fill();
    }
    fx.raf = requestAnimationFrame(frame);
  }
  fx.raf = requestAnimationFrame(frame);
}

function shake() { if (reduce) return; rev.classList.remove("shake"); void rev.offsetWidth; rev.classList.add("shake"); }
function beat() { if (reduce) return; var p = $("rv-pulse"); p.classList.remove("beat"); void p.offsetWidth; p.classList.add("beat"); }
function countUp(el, to, ms, my) {
  if (reduce) { el.textContent = fmt(to) + " points"; return; }
  var t0 = performance.now();
  (function f(now) {
    if (my !== token) return;
    var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(to * e * 100) / 100) + " points";
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}

function showWinner(r) {
  var top = r.filter(function (x) { return x.rank === 1; }), win = $("rv-win"), color = top[0].team.color;
  var full = top.map(function (x) { return x.team.name; }).join(" & ");
  win.replaceChildren();
  win.style.setProperty("--c", color); rev.style.setProperty("--c", color);
  var name = h("h2", { class: "rv-name", "aria-label": full });
  var ci = 0;
  full.split(" ").forEach(function (word) {
    var wd = h("span", { class: "w", "aria-hidden": "true" });
    word.split("").forEach(function (ch) { wd.append(h("span", { class: "ch", style: "--i:" + (ci++) }, ch)); });
    ci++;
    name.append(wd);
  });
  var pts = h("p", { class: "rv-pts" }, "0 points");
  win.classList.remove("p2");
  win.append(
    h("div", { class: "rv-fold rv-fold-top" }, h("div", null, h("p", { class: "rv-k" }, top.length > 1 ? "Tied at the top" : "TEJAS 2.0 champions"))),
    name,
    h("div", { class: "rv-fold" }, h("div", null, pts,
      h("ol", { class: "rv-pod" }, r.filter(function (x) { return x.rank > 1 && x.rank <= 3; }).map(function (x, n) {
        return h("li", { style: "--c:" + x.team.color + ";--n:" + n }, h("span", { class: "pr" }, ordinal(x.rank)), h("span", null, x.team.name), h("span", { class: "pp" }, fmt(x.total) + " pts"));
      })))));
  win.hidden = false;
  $("rv-rays").classList.add("on");
  return { top: top, pts: pts, win: win };
}
export async function startReveal() {
  if (!isAdmin()) return;
  winStop(); winUnlock();
  var r = ranked(Infinity);
  if (!r.some(function (x) { return x.total > 0; })) return;
  var my = ++token;
  fxStop();
  $("app").inert = true;
  rev.hidden = false; musicDuck(true);
  $("rv-close").focus();
  var cnt = $("rv-count"), kick = $("rv-kick"), win = $("rv-win");
  win.hidden = true; win.replaceChildren();
  $("rv-rays").classList.remove("on");
  rev.querySelectorAll(".rv-ring").forEach(function (n) { n.remove(); });
  rev.style.removeProperty("--c");
  var e0 = S(); if (e0) e0.riser(e0.ctx.currentTime + .05, 2.95);
  cnt.hidden = false;
  var step = reduce ? 800 : 1000, msgs = ["The gate to the Upside Down opens in", "Something is coming", "Brace yourselves"];
  for (var n = 3; n >= 1; n--) {
    kick.textContent = msgs[3 - n];
    cnt.textContent = n;
    cnt.classList.remove("pop"); void cnt.offsetWidth; cnt.classList.add("pop");
    beat(); if (n === 1) shake();
    var et = S(); if (et) et.tick(n, et.ctx.currentTime + .02);
    await sleep(step);
    if (my !== token) return;
  }
  cnt.hidden = true; cnt.textContent = ""; kick.textContent = "";
  var fl = $("rv-flash"); fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go");
  shake();
  var ei = S(); if (ei) ei.impact(ei.ctx.currentTime + .02);
  await sleep(reduce ? 200 : 450);
  if (my !== token) return;
  var w = showWinner(r), colors = [w.top[0].team.color].concat(TEAMS.map(function (t) { return t.color; }));
  winPlay();
  fxStart(colors);
  /* Beat 1: the winner's name alone, centred. Beat 2: it eases up and the scorecard unfolds beneath it. */
  await sleep(reduce ? 1200 : 3600);
  if (my !== token) return;
  w.win.classList.add("p2");
  await sleep(reduce ? 0 : 900);
  if (my !== token) return;
  countUp(w.pts, w.top[0].total, 1600, my);
}
export function closeReveal() {
  if (rev.hidden) return;
  token++; fxStop(); winStop(); rev.hidden = true; $("app").inert = false; musicDuck(false);
  rev.querySelectorAll(".rv-ring").forEach(function (n) { n.remove(); });
  $("revealbtn").focus();
}
