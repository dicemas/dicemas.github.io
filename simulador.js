/* ==========================================================
   SIMULADOR DE LOS CICLOS DEL AGUA Y DEL CARBONO
   Modelo ilustrativo de una cuenca andina de páramo y bosque.
   No necesitas editar este archivo para actualizar el sitio.

   Agua (mm/año): balance anual con la ecuación de Budyko (Fu).
   Carbono (g C m⁻² año⁻¹): productividad limitada por agua y
   temperatura; respiración del suelo con Q10 = 2,2.
   Gases (g CO₂-eq m⁻² año⁻¹): potenciales de calentamiento a
   100 años del IPCC AR6 (CH₄ = 27, N₂O = 273).
   ========================================================== */
(function () {
  "use strict";
  var svg = document.getElementById("sim-svg");
  if (!svg) return;

  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";
  var nf0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var num = function (v) {
    var a = Math.abs(v);
    if (a < 0.005) return "0";
    var s = a < 1 ? nf2.format(a) : a < 10 ? nf1.format(a) : nf0.format(Math.round(a));
    return (v < 0 && s !== "0" ? "−" : "") + s;
  };
  var signed = function (v) { return (v > 0 ? "+" : "") + num(v); };

  /* ---------- Modelo ---------- */
  var B = { P: 1400, N: 150, PET: 800, GPP: 1600, CUE: 0.5, Rh: 650, Q10: 2.2, CH4: 3, N2O: 0.05, DOCk: 0.015 };
  var GWP = { CH4: 27, N2O: 273 };
  var C2CO2 = 44 / 12;

  function water(s) {
    var cov = s.cover;
    var P = B.P * (1 + s.dP);
    var N = B.N * cov * Math.max(0, 1 - 0.08 * s.dT);   /* la base de las nubes sube con el calentamiento */
    var W = P + N;
    var PET = B.PET * (1 + 0.05 * s.dT);
    var w = 1.8 + 0.8 * cov;                              /* parámetro de Fu: menor sin vegetación nativa */
    var phi = PET / W;
    var ET = W * (1 + phi - Math.pow(1 + Math.pow(phi, w), 1 / w));
    return { P: P, N: N, W: W, PET: PET, ET: ET };
  }
  var BASE_RATIO = (function () { var b = water({ dT: 0, dP: 0, cover: 1 }); return b.ET / b.PET; })();

  function model(s) {
    var cov = s.cover, loss = 1 - cov;
    var h = water(s);
    var T = h.ET * (0.45 + 0.25 * cov), E = h.ET - T;
    var Q = h.W - h.ET;
    var Qb = Q * (0.25 + 0.45 * cov), Qs = Q - Qb;        /* suelos de páramo regulan: más flujo base */
    var wf = clamp((h.ET / h.PET) / BASE_RATIO, 0.4, 1.1);
    var wet = h.W / (B.P + B.N);
    var GPP = B.GPP * (0.35 + 0.65 * cov) * (1 + 0.04 * s.dT) * wf;
    var Ra = GPP * (1 - B.CUE);
    var Rh = B.Rh * Math.pow(B.Q10, s.dT / 10) * (0.75 + 0.25 * Math.min(1.2, wet)) * (1 + 0.2 * loss);
    var NEP = GPP - Ra - Rh;
    var DOC = Q * B.DOCk;
    var CH4 = B.CH4 * Math.pow(wet, 1.5) * Math.pow(3, s.dT / 10) * (0.6 + 0.4 * cov);
    var N2O = B.N2O + 0.3 * loss;
    var CH4C = CH4 * 12 / 16;
    var NECB = NEP - DOC - CH4C;
    var CO2 = -NEP * C2CO2;
    var CH4e = CH4 * GWP.CH4, N2Oe = N2O * GWP.N2O;
    return {
      P: h.P, N: h.N, In: h.W, T: T, E: E, ET: h.ET, Qs: Qs, Qb: Qb, Q: Q, Out: h.ET + Q,
      GPP: GPP, Ra: Ra, Rh: Rh, NEP: NEP, DOC: DOC, CH4: CH4, CH4C: CH4C, N2O: N2O, NECB: NECB,
      CO2: CO2, CH4e: CH4e, N2Oe: N2Oe, GHG: CO2 + CH4e + N2Oe
    };
  }

  /* ---------- Paisaje ---------- */
  var GROUND = [[0, 175], [90, 168], [170, 182], [260, 215], [360, 250], [460, 282], [560, 308], [620, 322], [720, 326]];
  function gy(x) {
    for (var i = 1; i < GROUND.length; i++) {
      if (x <= GROUND[i][0]) {
        var a = GROUND[i - 1], b = GROUND[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return GROUND[GROUND.length - 1][1];
  }
  var mk = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var line = GROUND.map(function (p) { return p.join(","); }).join(" L");
  var defs = mk("defs", {}, svg);
  var sky = mk("linearGradient", { id: "sim-sky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  mk("stop", { offset: "0", "stop-color": "#DCEFF7" }, sky);
  mk("stop", { offset: "1", "stop-color": "#F4FAFB" }, sky);
  mk("rect", { x: 0, y: 0, width: 720, height: 460, fill: "url(#sim-sky)" }, svg);

  /* nubes */
  var cloud = function (cx, cy, s, op) {
    var g = mk("g", { opacity: op }, svg);
    [[0, 0, 26], [-26, 8, 18], [26, 8, 20], [-8, 12, 20], [12, -10, 18]].forEach(function (c) {
      mk("circle", { cx: cx + c[0] * s, cy: cy + c[1] * s, r: c[2] * s, fill: "#FFFFFF" }, g);
    });
    return g;
  };
  cloud(205, 46, 1.1, 0.95);
  cloud(600, 40, 0.8, 0.8);
  mk("rect", { x: -10, y: 118, width: 170, height: 34, rx: 17, fill: "#FFFFFF", opacity: 0.75 }, svg);
  mk("rect", { x: 20, y: 132, width: 120, height: 22, rx: 11, fill: "#FFFFFF", opacity: 0.6 }, svg);

  /* terreno: roca, suelo y superficie */
  mk("path", { d: "M" + line + " L720,460 L0,460 Z", fill: "#E4DCCF" }, svg);
  var soilBottom = GROUND.slice().reverse().map(function (p) { return p[0] + "," + (p[1] + 52); }).join(" L");
  mk("path", { d: "M" + line + " L" + soilBottom + " Z", fill: "#CDB79E" }, svg);
  mk("path", { d: "M" + line, fill: "none", stroke: "#8DBE8F", "stroke-width": 5, "stroke-linejoin": "round" }, svg);
  var t1 = mk("text", { x: 704, y: 420, "text-anchor": "end", "class": "sim-zone" }, svg); t1.textContent = "Roca y agua subterránea";
  var t2 = mk("text", { x: 704, y: 368, "text-anchor": "end", "class": "sim-zone" }, svg); t2.textContent = "Suelo";

  /* quebrada y turbera */
  mk("path", { d: "M596 321 Q 660 342 720 330 L720 342 Q 660 352 596 327 Z", fill: "#7DB6D3" }, svg);
  var tq = mk("text", { x: 704, y: 316, "text-anchor": "end", "class": "sim-zone" }, svg); tq.textContent = "Quebrada";
  mk("ellipse", { cx: 112, cy: gy(112) + 2, rx: 34, ry: 5, fill: "#8FC2D6" }, svg);
  var tt = mk("text", { x: 112, y: gy(112) + 20, "text-anchor": "middle", "class": "sim-zone" }, svg); tt.textContent = "Turbera";

  /* vegetación: se reemplaza por potrero cuando baja la cobertura */
  var vegG = mk("g", {}, svg);
  var veg = [];
  var order = [5, 1, 8, 3, 12, 6, 10, 0, 14, 4, 11, 2, 9, 7, 13, 15, 16];
  [22, 46, 70, 150, 178, 200].forEach(function (x) {
    var y = gy(x);
    var g = mk("g", {}, vegG);
    mk("line", { x1: x, y1: y, x2: x, y2: y - 18, stroke: "#7A6A55", "stroke-width": 3 }, g);
    mk("circle", { cx: x, cy: y - 22, r: 7, fill: "#B9C99A" }, g);
    mk("circle", { cx: x, cy: y - 22, r: 3.5, fill: "#E6D98A" }, g);
    veg.push(g);
  });
  [232, 262, 292, 322, 352, 382, 412, 442, 472, 500, 528].forEach(function (x, i) {
    var y = gy(x);
    var g = mk("g", {}, vegG);
    mk("rect", { x: x - 2.5, y: y - 20, width: 5, height: 20, fill: "#7A5B40" }, g);
    mk("circle", { cx: x, cy: y - 30, r: 15 + (i % 3) * 2, fill: i % 2 ? "#4E9A72" : "#5FAE7E" }, g);
    veg.push(g);
  });
  var pasture = veg.map(function (g, i) {
    var bb = i < 6 ? [22, 46, 70, 150, 178, 200][i] : [232, 262, 292, 322, 352, 382, 412, 442, 472, 500, 528][i - 6];
    var e = mk("ellipse", { cx: bb, cy: gy(bb) - 3, rx: 13, ry: 4, fill: "#E3D88E" }, vegG);
    return e;
  });

  /* ---------- Flechas ---------- */
  var arrowG = mk("g", {}, svg);
  var labelG = mk("g", {}, svg);
  var ARROWS = {
    agua: [
      { k: "P", name: "Precipitación", d: "M205 78 L205 " + (gy(205) - 30), color: "#2F7FB5", lx: 218, ly: 104, a: "start" },
      { k: "N", name: "Niebla", d: "M8 150 Q 50 158 84 166", color: "#6FA8C9", lx: 10, ly: 108, a: "start" },
      { k: "T", name: "Transpiración", d: "M412 " + (gy(412) - 48) + " L412 92", color: "#8EC3DD", lx: 424, ly: 110, a: "start" },
      { k: "E", name: "Evaporación", d: "M318 " + (gy(318) - 6) + " L318 128", color: "#A8CFE3", lx: 306, ly: 150, a: "end" },
      { k: "Qs", name: "Escorrentía superficial", d: "M290 216 Q 460 262 596 316", color: "#3C8DBC", lx: 550, ly: 266, a: "start" },
      { k: "Qb", name: "Flujo base", d: "M160 196 C 210 262, 430 316, 600 334", color: "#2D6E9E", lx: 330, ly: 302, a: "start", dark: true }
    ],
    carbono: [
      { k: "GPP", name: "Fotosíntesis (GPP)", d: "M480 82 L480 " + (gy(480) - 52), color: "#3F9C6E", lx: 492, ly: 104, a: "start" },
      { k: "Ra", name: "Respiración de plantas", d: "M430 " + (gy(430) - 50) + " L430 92", color: "#C9874B", lx: 418, ly: 104, a: "end" },
      { k: "Rh", name: "Respiración del suelo", d: "M342 " + (gy(342) + 18) + " L342 150", color: "#A0683A", lx: 326, ly: 160, a: "end" },
      { k: "CH4", name: "Metano (CH₄)", d: "M112 " + (gy(112) - 4) + " L112 66", color: "#8A6AB0", lx: 124, ly: 82, a: "start" },
      { k: "N2O", name: "Óxido nitroso (N₂O)", d: "M574 " + (gy(574) - 4) + " L574 176", color: "#C05C7A", lx: 586, ly: 196, a: "start" },
      { k: "DOC", name: "Carbono disuelto al río", d: "M180 206 C 250 280, 450 330, 600 336", color: "#5E8A47", lx: 300, ly: 314, a: "start", dark: true }
    ]
  };
  var built = {};
  function build(mode) {
    arrowG.innerHTML = "";
    labelG.innerHTML = "";
    built = {};
    ARROWS[mode].forEach(function (a) {
      var mid = "sim-m-" + a.k;
      var old = document.getElementById(mid);
      if (old) old.parentNode.removeChild(old);
      var m = mk("marker", { id: mid, viewBox: "0 0 10 10", refX: 3, refY: 5, markerUnits: "userSpaceOnUse", orient: "auto" }, defs);
      mk("path", { d: "M0 0 L10 5 L0 10 Z", fill: a.color }, m);
      var p = mk("path", { d: a.d, fill: "none", stroke: a.color, "stroke-linecap": "butt", "marker-end": "url(#" + mid + ")", "class": "sim-arrow" }, arrowG);
      var f = mk("path", { d: a.d, fill: "none", stroke: "#FFFFFF", "stroke-linecap": "round", "stroke-dasharray": "1 13", "class": "sim-flow" }, arrowG);
      var t = mk("text", { x: a.lx, y: a.ly, "text-anchor": a.a, "class": "sim-label" + (a.dark ? " on-soil" : "") }, labelG);
      var t1 = mk("tspan", { x: a.lx, dy: 0, "class": "sim-lname" }, t); t1.textContent = a.name;
      var t2 = mk("tspan", { x: a.lx, dy: 17, "class": "sim-lval" }, t);
      built[a.k] = { p: p, f: f, m: m, v: t2 };
    });
  }

  /* ---------- Controles ---------- */
  var state = { mode: "agua", dT: 0, dP: 0, cover: 1 };
  var PRESETS = {
    hoy: { dT: 0, dP: 0, cover: 1 },
    nino: { dT: 1, dP: -0.25, cover: 1 },
    nina: { dT: -0.3, dP: 0.25, cover: 1 },
    futuro: { dT: 2, dP: -0.1, cover: 0.85 },
    potrero: { dT: 0, dP: 0, cover: 0.4 }
  };
  var elT = $("sim-dt"), elP = $("sim-dp"), elC = $("sim-cov");
  var BASE = model({ dT: 0, dP: 0, cover: 1 });

  function rows(defs, m) {
    return defs.map(function (r) {
      if (r.sep) return '<tr class="sep"><th colspan="3">' + r.sep + "</th></tr>";
      var a = r.f(BASE), b = r.f(m);
      return '<tr class="' + (r.total ? "total" : "") + '"><td>' + r.n + "</td><td>" + (r.sign ? signed(a) : num(a)) + "</td><td>" + (r.sign ? signed(b) : num(b)) + "</td></tr>";
    }).join("");
  }

  function render() {
    var m = model(state);
    var water = state.mode === "agua";
    $("sim-dt-out").textContent = (state.dT > 0 ? "+" : state.dT < 0 ? "−" : "") + nf1.format(Math.abs(state.dT)) + " °C";
    $("sim-dp-out").textContent = (state.dP > 0 ? "+" : state.dP < 0 ? "−" : "") + nf0.format(Math.abs(state.dP * 100)) + " %";
    $("sim-cov-out").textContent = nf0.format(state.cover * 100) + " %";

    /* vegetación */
    var n = veg.length, keep = Math.round(state.cover * n);
    veg.forEach(function (g, i) {
      var visible = order.indexOf(i) < keep;
      g.style.opacity = visible ? 1 : 0;
      pasture[i].style.opacity = visible ? 0 : 1;
    });

    /* flechas */
    ARROWS[state.mode].forEach(function (a) {
      var v = m[a.k], w, label;
      if (water) {
        w = clamp(2.5 + v / 1600 * 16, 2.5, 20);
        label = num(v) + " mm";
      } else {
        var eq = a.k === "CH4" ? m.CH4e : a.k === "N2O" ? m.N2Oe : v * C2CO2;
        w = clamp(2.5 + Math.sqrt(Math.max(0, eq)) / Math.sqrt(7000) * 15, 2.5, 20);
        label = a.k === "CH4" ? num(v) + " g CH₄" : a.k === "N2O" ? num(v) + " g N₂O" : num(v) + " g C";
      }
      var b = built[a.k];
      b.p.setAttribute("stroke-width", w);
      b.f.setAttribute("stroke-width", Math.max(1.6, w * 0.32));
      var hs = w * 1.6 + 9;
      b.m.setAttribute("markerWidth", hs);
      b.m.setAttribute("markerHeight", hs);
      b.v.textContent = label;
    });

    /* balance */
    var tbl;
    if (water) {
      $("sim-unit").textContent = "mm por año";
      tbl = rows([
        { sep: "Entradas" },
        { n: "Precipitación", f: function (x) { return x.P; } },
        { n: "Niebla (precipitación horizontal)", f: function (x) { return x.N; } },
        { n: "Total entradas", f: function (x) { return x.In; }, total: true },
        { sep: "Salidas" },
        { n: "Transpiración", f: function (x) { return x.T; } },
        { n: "Evaporación", f: function (x) { return x.E; } },
        { n: "Escorrentía superficial", f: function (x) { return x.Qs; } },
        { n: "Flujo base", f: function (x) { return x.Qb; } },
        { n: "Total salidas", f: function (x) { return x.Out; }, total: true },
        { n: "Entradas − salidas", f: function (x) { return Math.abs(x.In - x.Out) < 0.5 ? 0 : x.In - x.Out; }, total: true }
      ], m);
      var y = m.Q / m.In * 100, reg = m.Qb / m.Q * 100;
      $("sim-read").textContent = "De cada 100 mm que entran a la cuenca, " + nf0.format(y) + " salen por la quebrada y " + nf0.format(100 - y) +
        " vuelven a la atmósfera. El " + nf0.format(reg) + " % del caudal es flujo base: el agua que el suelo regula y entrega en época seca.";
      $("sim-pill").hidden = true;
    } else {
      $("sim-unit").textContent = "g C por m² al año (gases en g CO₂-eq)";
      tbl = rows([
        { sep: "Carbono del ecosistema" },
        { n: "Fotosíntesis (GPP)", f: function (x) { return x.GPP; } },
        { n: "Respiración de plantas", f: function (x) { return -x.Ra; }, sign: true },
        { n: "Respiración del suelo", f: function (x) { return -x.Rh; }, sign: true },
        { n: "Producción neta (NEP)", f: function (x) { return x.NEP; }, sign: true, total: true },
        { n: "Carbono disuelto al río", f: function (x) { return -x.DOC; }, sign: true },
        { n: "Carbono emitido como CH₄", f: function (x) { return -x.CH4C; }, sign: true },
        { n: "Balance de carbono (NECB)", f: function (x) { return x.NECB; }, sign: true, total: true },
        { sep: "Gases de efecto invernadero" },
        { n: "CO₂ neto", f: function (x) { return x.CO2; }, sign: true },
        { n: "CH₄ (× 27)", f: function (x) { return x.CH4e; }, sign: true },
        { n: "N₂O (× 273)", f: function (x) { return x.N2Oe; }, sign: true },
        { n: "Balance neto de GEI", f: function (x) { return x.GHG; }, sign: true, total: true }
      ], m);
      var sink = m.GHG < 0;
      var pill = $("sim-pill");
      pill.hidden = false;
      pill.textContent = sink ? "Sumidero de GEI" : "Fuente de GEI";
      pill.className = "sim-pill " + (sink ? "sink" : "source");
      $("sim-read").textContent = sink
        ? "La cuenca captura más gases de los que emite: un balance de " + num(m.GHG) + " g CO₂-eq por m² al año, equivalente a " + nf1.format(Math.abs(m.GHG) / 100) + " t CO₂-eq por hectárea."
        : "La cuenca emite más gases de los que captura: un balance de +" + num(m.GHG) + " g CO₂-eq por m² al año, equivalente a " + nf1.format(m.GHG / 100) + " t CO₂-eq por hectárea.";
    }
    $("sim-tbody").innerHTML = tbl;

    Array.prototype.forEach.call(document.querySelectorAll("#sim-presets .pill"), function (b) {
      var p = PRESETS[b.getAttribute("data-p")];
      var on = Math.abs(p.dT - state.dT) < 0.05 && Math.abs(p.dP - state.dP) < 0.005 && Math.abs(p.cover - state.cover) < 0.005;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    Array.prototype.forEach.call(document.querySelectorAll("#sim-mode .pill"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-m") === state.mode ? "true" : "false");
    });
  }

  function syncInputs() {
    elT.value = state.dT;
    elP.value = Math.round(state.dP * 100);
    elC.value = Math.round(state.cover * 100);
  }
  elT.addEventListener("input", function () { state.dT = parseFloat(elT.value); render(); });
  elP.addEventListener("input", function () { state.dP = parseFloat(elP.value) / 100; render(); });
  elC.addEventListener("input", function () { state.cover = parseFloat(elC.value) / 100; render(); });
  $("sim-presets").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-p]");
    if (!b) return;
    var p = PRESETS[b.getAttribute("data-p")];
    state.dT = p.dT; state.dP = p.dP; state.cover = p.cover;
    syncInputs();
    render();
  });
  $("sim-mode").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-m]");
    if (!b || b.getAttribute("data-m") === state.mode) return;
    state.mode = b.getAttribute("data-m");
    build(state.mode);
    svg.setAttribute("aria-label", state.mode === "agua"
      ? "Diagrama de una cuenca andina con los flujos del ciclo del agua. El grosor de cada flecha es proporcional al flujo."
      : "Diagrama de una cuenca andina con los flujos de carbono y gases de efecto invernadero. El grosor de cada flecha crece con la raíz del flujo en CO₂ equivalente.");
    $("sim-note").textContent = state.mode === "agua"
      ? "El grosor de cada flecha es proporcional al flujo de agua."
      : "El grosor de cada flecha crece con la raíz cuadrada del flujo en CO₂ equivalente, para que los gases pequeños se vean.";
    render();
  });

  build(state.mode);
  syncInputs();
  render();
})();
