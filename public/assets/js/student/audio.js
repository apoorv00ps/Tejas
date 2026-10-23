/* Audio: background-music button, WebAudio sound engine and winner fanfare. */

import { $ } from "./dom.js";

/* musicDuckImpl is swapped for the real ducking closure inside initMusic(). */
var musicDuckImpl = function () {};

export function initMusic() {
  var btn = $("musicbtn");
  if (!btn) return;
  /* Was: data:audio/mpeg;base64,<1MB inline string> — now a real asset file. */
  var a = new Audio("./audio/tejas-theme.mp3");
  a.loop = true; a.volume = .35; a.preload = "auto";
  var playing = false, pref = "", resume = false, touched = false;
  try { pref = localStorage.getItem("tejas_music") || ""; } catch (e) {}
  function save(v) { try { localStorage.setItem("tejas_music", v); } catch (e) {} }
  function paint() { btn.textContent = playing ? "Music on" : "Music off"; btn.setAttribute("aria-pressed", String(playing)); }
  function play() {
    var p; try { p = a.play(); } catch (e) { return; }
    if (p && p.then) p.then(function () { playing = true; paint(); }, function () { playing = false; paint(); });
    else { playing = true; paint(); }
  }
  function pause() { a.pause(); playing = false; paint(); }
  btn.hidden = false; paint();
  btn.addEventListener("click", function () {
    touched = true;
    if (playing) { pause(); save("off"); } else { play(); save("on"); }
  });
  if (pref !== "off") {
    play();
    var first = function (e) {
      if (btn.contains(e.target)) return;
      document.removeEventListener("pointerdown", first, true);
      if (!touched && !playing) play();
    };
    document.addEventListener("pointerdown", first, true);
  }
  musicDuckImpl = function (on) {
    if (on) { resume = playing; if (playing) { a.pause(); playing = false; paint(); } }
    else if (resume) { resume = false; play(); }
  };
}

/* Stable wrapper: no-op until initMusic wires the real ducking closure. */
export function musicDuck(on) { musicDuckImpl(on); }

/* ---------- sound engine (synthesised in the browser: no audio files) ---------- */
var eng = null, audio = null, muted = false;

export function buildEngine(ctx) {
  var sr = ctx.sampleRate, E = { muted: false };
  var master = ctx.createGain(); master.gain.value = .85;
  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = .004; comp.release.value = .25;
  master.connect(comp); comp.connect(ctx.destination);
  var conv = ctx.createConvolver(), wet = ctx.createGain(), rl = Math.floor(sr * 2.4), ib = ctx.createBuffer(2, rl, sr), c, i;
  for (c = 0; c < 2; c++) { var d = ib.getChannelData(c); for (i = 0; i < rl; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 2.6); }
  conv.buffer = ib; wet.gain.value = .5; conv.connect(wet); wet.connect(master);
  var nb = ctx.createBuffer(1, sr * 3, sr), nd = nb.getChannelData(0);
  for (i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  function out(node, send) {
    node.connect(master);
    if (send) { var sg = ctx.createGain(); sg.gain.value = send; node.connect(sg); sg.connect(conv); }
  }
  function osc(type, f, t, dur, g, o) {
    o = o || {};
    var os = ctx.createOscillator(), node = os, a = o.a || .005, r = o.r || .1;
    os.type = type; os.frequency.setValueAtTime(f, t);
    if (o.glide) os.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
    if (o.detune) os.detune.value = o.detune;
    if (o.lp) {
      var fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(o.lp, t);
      if (o.lpEnd) fl.frequency.exponentialRampToValueAtTime(o.lpEnd, t + dur);
      os.connect(fl); node = fl;
    }
    var gn = ctx.createGain();
    gn.gain.setValueAtTime(.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + a);
    gn.gain.setValueAtTime(g, t + Math.max(a, dur - r));
    gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
    node.connect(gn); out(gn, o.send);
    os.start(t); os.stop(t + dur + .05);
  }
  function nz(t, dur, g, o) {
    o = o || {};
    var src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain(), a = o.a || .002;
    src.buffer = nb; src.loop = true;
    fl.type = o.type || "lowpass"; fl.frequency.setValueAtTime(o.f || 1000, t); fl.Q.value = o.q || .7;
    if (o.fEnd) fl.frequency.exponentialRampToValueAtTime(o.fEnd, t + dur);
    gn.gain.setValueAtTime(.0001, t);
    if (o.rise) { gn.gain.exponentialRampToValueAtTime(g, t + dur * .97); gn.gain.linearRampToValueAtTime(.0001, t + dur); }
    else { gn.gain.exponentialRampToValueAtTime(g, t + a); gn.gain.exponentialRampToValueAtTime(.0001, t + dur); }
    src.connect(fl); fl.connect(gn); out(gn, o.send);
    src.start(t, Math.random() * 2); src.stop(t + dur + .05);
  }
  function kick(t, g) { osc("sine", 150, t, .38, g, { glide: 42, a: .002, r: .36 }); nz(t, .03, g * .25, { type: "highpass", f: 2000 }); }
  function timp(t, f, g) { osc("sine", f * 1.25, t, 1.2, g, { glide: f, a: .003, r: 1.15, send: .25 }); nz(t, .09, g * .3, { type: "bandpass", f: f * 4, q: 1 }); }
  function snare(t, g) { nz(t, .16, g, { type: "bandpass", f: 1900, q: .8 }); osc("triangle", 190, t, .1, g * .6, { glide: 130, r: .09 }); }
  function bass(t, f, dur, g) { osc("sawtooth", f, t, dur, g, { a: .01, r: .3, lp: 260, lpEnd: 140 }); osc("sine", f / 2, t, dur, g * 1.2, { a: .01, r: .3 }); }
  function brass(f, t, dur, g) {
    [-7, 7].forEach(function (dt) { osc("sawtooth", f, t, dur, g, { a: .07, r: Math.min(.25, dur * .5), detune: dt, lp: 500, lpEnd: 2800, send: .3 }); });
    osc("sawtooth", f / 2, t, dur, g * .6, { a: .08, r: Math.min(.25, dur * .5), lp: 450, lpEnd: 1500, send: .2 });
  }
  function choir(t, dur, notes, g) {
    notes.forEach(function (f) { [-8, 8].forEach(function (dt) { osc("triangle", f, t, dur, g, { a: dur * .35, r: dur * .45, detune: dt, lp: 2200, send: .5 }); }); });
  }
  function bell(f, t, g) {
    osc("sine", f, t, 1.6, g, { a: .003, r: 1.6, send: .55 });
    osc("sine", f * 2.76, t, .8, g * .35, { a: .003, r: .8, send: .55 });
    osc("sine", f * 5.4, t, .4, g * .12, { a: .003, r: .4, send: .55 });
  }
  function cymbal(t, g) { nz(t, 2.6, g, { type: "highpass", f: 6500, send: .3, a: .003 }); nz(t, 1.5, g * .6, { type: "bandpass", f: 9000, q: .5 }); }
  function riser(t, dur) {
    nz(t, dur, .22, { type: "bandpass", f: 400, fEnd: 7000, q: 1.2, rise: true, send: .2 });
    osc("sawtooth", 110, t, dur, .07, { glide: 660, lp: 500, lpEnd: 4200, a: dur * .8, r: .05, send: .2 });
    osc("sawtooth", 110, t, dur, .07, { glide: 666, detune: 14, lp: 500, lpEnd: 4200, a: dur * .8, r: .05, send: .2 });
  }
  function boom(t) {
    osc("sine", 80, t, 2.4, .95, { glide: 28, a: .004, r: 2.2, send: .4 });
    nz(t, 2.2, .55, { type: "lowpass", f: 800, fEnd: 90, send: .5 });
    cymbal(t, .22);
  }
  function whistle(t) { osc("sine", 500, t, .7, .02, { glide: 2300, a: .05, r: .1, send: .2 }); }
  function firePop(t) {
    nz(t, .35, .34, { type: "lowpass", f: 800 }); nz(t, .22, .1, { type: "highpass", f: 4500 });
    osc("sine", 130, t, .25, .3, { glide: 50, r: .24 });
    for (var k = 0; k < 7; k++) nz(t + .08 + Math.random() * .6, .025, .05, { type: "highpass", f: 4500 + Math.random() * 3000 });
  }
  function cheer(t, dur) {
    var k, n = Math.min(150, Math.floor(dur * 32));
    nz(t, dur, .2, { type: "bandpass", f: 1100, q: .5, a: dur * .22, send: .35 });
    nz(t, dur, .1, { type: "bandpass", f: 2700, q: .6, a: dur * .3, send: .3 });
    for (k = 0; k < n; k++) nz(t + .3 + Math.random() * dur * .85, .03, .06, { type: "highpass", f: 2500 + Math.random() * 2500 });
  }
  function sparkles(t, dur) {
    var pent = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093.0], x = 0;
    while (x < dur) { bell(pent[Math.floor(Math.random() * pent.length)], t + x, .035); x += .1 + Math.random() * .16; }
  }
  E.tick = function (n, t) {
    var f = [82.4, 98, 123.5][3 - n] || 82.4, k;
    kick(t, .95); kick(t + .17, .5); bass(t, f, .6, .16);
    for (k = 0; k < 8; k++) snare(t + .42 + k * .07, .04 + k * .012 + (3 - n) * .02);
  };
  E.riser = riser;
  E.impact = function (t) { boom(t); kick(t, 1); };
  E.fanfare = function (t) {
    var M = [[392, 0, .2], [392, .22, .2], [392, .44, .2], [523.25, .66, .95], [392, 1.7, .2], [523.25, 1.92, .2], [659.25, 2.14, .2], [783.99, 2.36, 1.8]];
    choir(t, 4.6, [261.63, 329.63, 392, 523.25], .035);
    M.forEach(function (n) { brass(n[0], t + n[1], n[2], .075); brass(n[0] * .794, t + n[1], n[2], .04); timp(t + n[1], 98, .5); });
    cymbal(t + .66, .16); cymbal(t + 2.36, .22);
  };
  E.sparkles = sparkles; E.cheer = cheer; E.whistle = whistle; E.firePop = firePop;
  E.setMuted = function (m) { E.muted = m; master.gain.value = m ? 0 : .85; };
  E.ctx = ctx;
  return E;
}

export function S() {
  if (muted) return null;
  try {
    if (!eng) { audio = new (window.AudioContext || window.webkitAudioContext)(); eng = buildEngine(audio); }
    if (audio.state === "suspended") audio.resume();
    return eng;
  } catch (e) { return null; }
}

/* ---------- winner fanfare (was base64 window.TEJAS_WIN, now ./audio/tejas-winner.mp3) ---------- */
var winAud = null;

/* Prime the fanfare: play once muted so the browser unlocks later playback. */
export function winUnlock() {
  if (!winAud) { winAud = new Audio("./audio/tejas-winner.mp3"); winAud.preload = "auto"; winAud.volume = 1; }
  try {
    winAud.muted = true;
    var p = winAud.play();
    var done = function () { winAud.pause(); winAud.currentTime = 0; winAud.muted = muted; };
    if (p && p.then) p.then(done, function () {}); else done();
  } catch (e) {}
}

export function winStop() { if (winAud) { try { winAud.pause(); winAud.currentTime = 0; } catch (e) {} } }

export function winPlay() {
  if (!winAud) return false;
  try { winAud.currentTime = 0; winAud.muted = muted; var p = winAud.play(); if (p && p.catch) p.catch(function () {}); return true; } catch (e) { return false; }
}
