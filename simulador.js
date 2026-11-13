/* ==========================================================
   SIMULADOR DE LOS CICLOS DEL AGUA Y DEL CARBONO
   Dos escalas: el planeta y una cuenca andina.
   No necesitas editar este archivo para actualizar el sitio.

   PLANETA (valores de un año típico actual)
   - Agua (miles de km³/año): Trenberth et al. (2007), J. Hydrometeorology.
     Evaporación del océano 413, lluvia sobre el océano 373, transporte
     de humedad hacia los continentes 40, lluvia sobre tierra 113,
     evapotranspiración 73, ríos al océano 40, vapor en la atmósfera 12,7.
     Con el calentamiento, lluvia y evaporación globales ≈ +2 %/°C y el
     vapor de agua ≈ +7 %/°C (Dai y Trenberth). Transpiración ≈ 60 % de
     la evapotranspiración de los continentes.
   - Carbono (Gt C/año): Global Carbon Budget 2025, emisiones de 2024
     (fósiles 10,3; cambio de uso del suelo 1,3) con la fracción promedio
     2015–2024 que absorben el océano (29 %) y la tierra (21 %).
     Fotosíntesis terrestre ≈ 123 Gt C/año (Beer et al., 2010).
     1 ppm de CO₂ = 2,124 Gt C.
   - Metano (Mt CH₄/año): Global Methane Budget 2000–2020 (Saunois et
     al., 2025), periodo 2010–2019. Fuentes 575; crecimiento 7,6 ppb/año.
   - Las respuestas al calentamiento, a las emisiones y a la
     deforestación son ilustrativas, para enseñar.

   CUENCA ANDINA (mm/año y g C por m² al año)
   - Agua: ecuación de Budyko (Fu); niebla según cobertura y temperatura.
   - Carbono: respiración del suelo con Q10 = 2,2; metano según humedad.
   - CO₂ equivalente: IPCC AR6 a 100 años (CH₄ = 27, N₂O = 273).
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
    var s = a < 1 ? nf2.format(a) : a < 100 ? nf1.format(a) : nf0.format(Math.round(a));
    return (v < 0 ? "−" : "") + s;
  };
  var signed = function (v) { return (v > 0.004 ? "+" : "") + num(v); };
  var pct = function (v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + nf0.format(Math.abs(v)) + " %"; };
  var deg = function (v) { return (v > 0 ? "+" : v < 0 ? "−" : "") + nf1.format(Math.abs(v)) + " °C"; };
  var mk = function (tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  var label = function (parent, x, y, text, anchor, cls) {
    var t = mk("text", { x: x, y: y, "text-anchor": anchor || "start", "class": cls || "sim-zone" }, parent);
    t.textContent = text;
    return t;
  };
  var GWP = { CH4: 27, N2O: 273 };
  var C2CO2 = 44 / 12;

  /* ---------- Elementos comunes del dibujo ---------- */
  var defs = mk("defs", {}, svg);
  var g1 = mk("linearGradient", { id: "sim-sky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  mk("stop", { offset: "0", "stop-color": "#DCEFF7" }, g1);
  mk("stop", { offset: "1", "stop-color": "#F4FAFB" }, g1);
  var g2 = mk("linearGradient", { id: "sim-sea", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  mk("stop", { offset: "0", "stop-color": "#6FB3D2" }, g2);
  mk("stop", { offset: "1", "stop-color": "#2F7DA6" }, g2);
  mk("rect", { x: 0, y: 0, width: 960, height: 460, fill: "url(#sim-sky)" }, svg);

  function cloud(parent, cx, cy, s, op) {
    var g = mk("g", { opacity: op }, parent);
    [[0, 0, 26], [-26, 8, 18], [26, 8, 20], [-8, 12, 20], [12, -10, 18]].forEach(function (c) {
      mk("circle", { cx: cx + c[0] * s, cy: cy + c[1] * s, r: c[2] * s, fill: "#FFFFFF" }, g);
    });
  }
  function waves(parent, list) {
    var d = list.map(function (p) { return "M" + p[0] + " " + p[1] + " q 10 -5 20 0 t 20 0"; }).join(" ");
    mk("path", { d: d, fill: "none", stroke: "#BFE0EE", "stroke-width": 2, "stroke-linecap": "round", opacity: 0.85 }, parent);
  }
  function groundFn(pts) {
    return function (x) {
      for (var i = 1; i < pts.length; i++) {
        if (x <= pts[i][0]) {
          var a = pts[i - 1], b = pts[i];
          return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        }
      }
      return pts[pts.length - 1][1];
    };
  }
  function tree(parent, x, y, r, i) {
    var g = mk("g", {}, parent);
    mk("rect", { x: x - 2.5, y: y - 20, width: 5, height: 20, fill: "#7A5B40" }, g);
    mk("circle", { cx: x, cy: y - 30, r: r, fill: i % 2 ? "#4E9A72" : "#5FAE7E" }, g);
    return g;
  }
  function frailejon(parent, x, y) {
    var g = mk("g", {}, parent);
    mk("line", { x1: x, y1: y, x2: x, y2: y - 18, stroke: "#7A6A55", "stroke-width": 3 }, g);
    mk("circle", { cx: x, cy: y - 22, r: 7, fill: "#B9C99A" }, g);
    mk("circle", { cx: x, cy: y - 22, r: 3.5, fill: "#E6D98A" }, g);
    return g;
  }

  /* ==========================================================
     ESCENA 1: PLANETA
     ========================================================== */
  var PL = (function () {
    var B = {
      Eo: 413, Po: 373, Tr: 40, Pl: 113, ETl: 73, R: 40, Vap: 12.7, Tfrac: 0.6,
      F: 10.3, LUC: 1.3, fO: 0.29, fL: 0.21, GPP: 123, PPM: 2.124,
      CH4wet: 160, CH4nat: 46, CH4agr: 217, CH4fos: 123, CH4bb: 29, CH4sink: 554, PPB: 2.75
    };
    B.Osink = (B.F + B.LUC) * B.fO;
    B.Lsink = (B.F + B.LUC) * B.fL;

    function model(s) {
      var k = 1 + 0.02 * s.dT;
      var def = s.defo, fos = s.fossil;
      var Eo = B.Eo * k, Tr = B.Tr * k, Po = Eo - Tr;
      var ETl = B.ETl * k * (1 - 0.03 * (def - 1));
      var Tl = ETl * B.Tfrac, El = ETl - Tl;
      var Pl = ETl + Tr, R = Tr;
      var Vap = B.Vap * (1 + 0.07 * s.dT);
      var F = B.F * fos, LUC = B.LUC * def;
      var O = B.Osink * Math.max(0, 1 - 0.04 * s.dT);
      var L = B.Lsink * Math.max(0, 1 - 0.15 * s.dT) * Math.max(0, 1 - 0.05 * (def - 1));
      var GPP = B.GPP * (1 - 0.01 * (def - 1));
      var Resp = GPP - L;
      var G = F + LUC - O - L;
      var wet = B.CH4wet * (1 + 0.1 * s.dT);
      var cfos = B.CH4fos * fos, cbb = B.CH4bb * def;
      var nat = wet + B.CH4nat;
      var src = nat + B.CH4agr + cfos + cbb;
      var CG = src - B.CH4sink;
      return {
        Eo: Eo, Po: Po, Tr: Tr, Pl: Pl, ETl: ETl, Tl: Tl, El: El, R: R, Vap: Vap,
        oceanBal: Eo - Po - Tr, landBal: Pl - ETl - R, days: Vap / (Eo + B.Pl * k) * 365,
        F: F, LUC: LUC, O: O, L: L, GPP: GPP, Resp: Resp, G: G, ppm: G / B.PPM,
        AF: (F + LUC) > 0 ? G / (F + LUC) : 0,
        wet: wet, nat: nat, cnat: B.CH4nat, agr: B.CH4agr, cfos: cfos, cbb: cbb, src: src, sink: B.CH4sink, CG: CG, ppb: CG / B.PPB,
        Fx: F, LUCx: LUC, Ox: O, CH4n: nat, CH4a: B.CH4agr
      };
    }

    var G0 = [[360, 300], [440, 292], [650, 284], [700, 240], [790, 140], [860, 236], [890, 262], [960, 264]];
    var gy = groundFn(G0);
    var forest = [], stumps = [];

    function draw(g) {
      cloud(g, 296, 70, 1, 0.95);
      cloud(g, 640, 62, 1, 0.95);
      /* océano */
      mk("path", { d: "M0 300 L366 300 L392 460 L0 460 Z", fill: "url(#sim-sea)" }, g);
      waves(g, [[30, 330], [110, 360], [200, 334], [270, 380], [50, 410], [170, 420], [300, 344]]);
      label(g, 20, 446, "Océano", "start", "sim-zone sim-sea");
      /* tierra */
      var line = G0.map(function (p) { return p.join(","); }).join(" L");
      mk("path", { d: "M" + line + " L960,460 L392,460 Z", fill: "#D5C2A9" }, g);
      mk("path", { d: "M" + line, fill: "none", stroke: "#8DBE8F", "stroke-width": 5, "stroke-linejoin": "round" }, g);
      mk("path", { d: "M358 300 L392 298 L400 303 L370 305 Z", fill: "#EADFB8" }, g);
      /* río */
      mk("path", { d: "M784 152 Q 740 220 690 252 Q 640 286 560 288 L 366 299", fill: "none", stroke: "#7DB6D3", "stroke-width": 5, "stroke-linecap": "round" }, g);
      /* ciudad e industria */
      [[366, 34, 22], [392, 18, 50], [414, 22, 30]].forEach(function (b) {
        mk("rect", { x: b[0], y: gy(b[0]) - b[2], width: b[1], height: b[2], fill: "#A9B4BA", rx: 2 }, g);
      });
      mk("rect", { x: 380, y: gy(384) - 66, width: 8, height: 66, fill: "#8C979E" }, g);
      /* humedal */
      mk("ellipse", { cx: 470, cy: gy(470) - 2, rx: 26, ry: 6, fill: "#6FAFCB" }, g);
      /* bosque */
      forest = [];
      [500, 522, 544, 590, 612, 634].forEach(function (x, i) { forest.push(tree(g, x, gy(x), 13 + (i % 3) * 2, i)); });
      /* deforestación */
      stumps = [];
      [654, 670].forEach(function (x) {
        stumps.push(mk("rect", { x: x - 3, y: gy(x) - 7, width: 6, height: 7, fill: "#7A5B40" }, g));
      });
      stumps.push(mk("path", { d: "M660 " + (gy(660) - 4) + " q -6 -10 0 -20 q 2 8 6 6 q 2 -8 -2 -14 q 10 8 6 22 Z", fill: "#F0A35E", opacity: 0.9 }, g));
      /* páramo */
      [770, 806, 826].forEach(function (x) { frailejon(g, x, gy(x)); });
      /* agricultura */
      [900, 932].forEach(function (x) {
        var y = gy(x);
        mk("ellipse", { cx: x, cy: y - 10, rx: 11, ry: 6.5, fill: "#F2EFE8", stroke: "#6B5D4E", "stroke-width": 1.2 }, g);
        mk("circle", { cx: x + 11, cy: y - 14, r: 4, fill: "#F2EFE8", stroke: "#6B5D4E", "stroke-width": 1.2 }, g);
        mk("line", { x1: x - 6, y1: y - 4, x2: x - 6, y2: y, stroke: "#6B5D4E", "stroke-width": 1.5 }, g);
        mk("line", { x1: x + 6, y1: y - 4, x2: x + 6, y2: y, stroke: "#6B5D4E", "stroke-width": 1.5 }, g);
      });
      mk("path", { d: "M890 " + (gy(890) + 8) + " L960 " + (gy(960) + 8), stroke: "#C9B98F", "stroke-width": 6 }, g);
      label(g, 368, 322, "Ciudades", "start");
      label(g, 560, 314, "Bosques y humedales", "middle");
      label(g, 790, 280, "Montañas y páramo", "middle");
      label(g, 954, 296, "Agricultura", "end");
    }

    var ARROWS = {
      agua: [
        { k: "Eo", name: "Evaporación del océano", d: "M110 296 L110 120", color: "#5A9FC8", lx: 122, ly: 150 },
        { k: "Po", name: "Lluvia sobre el océano", d: "M296 98 L296 294", color: "#2F7FB5", lx: 308, ly: 206 },
        { k: "Tr", name: "Humedad hacia los continentes", d: "M336 64 C 420 28, 520 28, 598 56", color: "#6FA8C9", lx: 468, ly: 94, a: "middle" },
        { k: "Pl", name: "Lluvia en los continentes", d: "M640 94 L640 " + (gy(640) - 46), color: "#2F7FB5", lx: 652, ly: 112 },
        { k: "Tl", name: "Transpiración de las plantas", d: "M560 " + (gy(560) - 44) + " L560 128", color: "#8EC3DD", lx: 548, ly: 150, a: "end" },
        { k: "El", name: "Evaporación", d: "M822 " + (gy(822) - 8) + " L822 104", color: "#A8CFE3", lx: 834, ly: 120 },
        { k: "R", name: "Ríos hacia el océano", d: "M778 166 Q 740 220 690 250 Q 640 284 560 286 L 372 297", color: "#3C8DBC", lx: 520, ly: 344, dark: true }
      ],
      carbono: [
        { k: "Ox", name: "Absorción del océano", d: "M200 86 L200 294", color: "#2F8FA0", lx: 212, ly: 120 },
        { k: "Fx", name: "Combustibles fósiles", d: "M384 " + (gy(384) - 70) + " L384 70", color: "#6B6F76", lx: 396, ly: 66, both: "cfos" },
        { k: "CH4n", name: "Humedales y otras fuentes naturales", d: "M470 " + (gy(470) - 4) + " L470 232", color: "#8A6AB0", lx: 446, ly: 352, dark: true, unit: "ch4" },
        { k: "Resp", name: "Respiración y descomposición", d: "M560 " + (gy(560) - 44) + " L560 112", color: "#C9874B", lx: 572, ly: 110 },
        { k: "GPP", name: "Fotosíntesis", d: "M612 150 L612 " + (gy(612) - 48), color: "#3F9C6E", lx: 624, ly: 166 },
        { k: "LUCx", name: "Deforestación", d: "M662 " + (gy(662) - 26) + " L662 206", color: "#C05C3A", lx: 682, ly: 214, dark: true, both: "cbb" },
        { k: "CH4a", name: "Ganadería, arroz y residuos", d: "M916 " + (gy(916) - 22) + " L916 120", color: "#8A6AB0", lx: 952, ly: 70, a: "end", unit: "ch4" }
      ]
    };

    function width(mode, a, m) {
      if (mode === "agua") return clamp(2.5 + m[a.k] / B.Eo * 18, 2.5, 20.5);
      var eq = a.unit === "ch4" ? m[a.k] * GWP.CH4 / 1000 : m[a.k] * C2CO2 + (a.both ? m[a.both] * GWP.CH4 / 1000 : 0);
      return clamp(2.5 + Math.sqrt(Math.max(0, eq)) / Math.sqrt(B.GPP * C2CO2) * 17, 2.5, 20);
    }
    function text(mode, a, m) {
      if (mode === "agua") return num(m[a.k]) + " mil km³";
      if (a.unit === "ch4") return nf0.format(m[a.k]) + " Mt CH₄";
      return num(m[a.k]) + " Gt C" + (a.both ? " + " + nf0.format(m[a.both]) + " Mt CH₄" : "");
    }
    function update(s) {
      forest.forEach(function (t, i) { t.style.opacity = i < Math.round(forest.length * (1 - 0.18 * (s.defo - 1))) ? 1 : 0.25; });
      stumps.forEach(function (t) { t.style.opacity = s.defo > 0.05 ? 1 : 0; });
    }

    function table(mode) {
      if (mode === "agua") return {
        unit: "Miles de km³ por año",
        rows: [
          { sep: "Océano" },
          { n: "Evaporación", f: function (x) { return x.Eo; } },
          { n: "Lluvia sobre el océano", f: function (x) { return x.Po; } },
          { n: "Humedad que viaja a los continentes", f: function (x) { return x.Tr; } },
          { n: "Evaporación − lluvia − transporte", f: function (x) { return x.oceanBal; }, total: true },
          { sep: "Continentes" },
          { n: "Lluvia", f: function (x) { return x.Pl; } },
          { n: "Transpiración de las plantas", f: function (x) { return x.Tl; } },
          { n: "Evaporación de suelos y lagos", f: function (x) { return x.El; } },
          { n: "Ríos hacia el océano", f: function (x) { return x.R; } },
          { n: "Lluvia − evapotranspiración − ríos", f: function (x) { return x.landBal; }, total: true },
          { sep: "Atmósfera" },
          { n: "Vapor de agua almacenado", f: function (x) { return x.Vap; } },
          { n: "Días que tarda en renovarse", f: function (x) { return x.days; } }
        ]
      };
      return {
        unit: "CO₂ en Gt C por año · metano en Mt CH₄ por año",
        rows: [
          { sep: "Dióxido de carbono (CO₂)" },
          { n: "Combustibles fósiles y cemento", f: function (x) { return x.F; } },
          { n: "Deforestación y cambio de uso del suelo", f: function (x) { return x.LUC; } },
          { n: "Absorción neta del océano", f: function (x) { return -x.O; }, sign: true },
          { n: "Absorción neta de bosques y suelos", f: function (x) { return -x.L; }, sign: true },
          { n: "Se acumula en la atmósfera", f: function (x) { return x.G; }, sign: true, total: true },
          { n: "Aumento de CO₂ (ppm por año)", f: function (x) { return x.ppm; }, sign: true },
          { n: "Fotosíntesis de las plantas", f: function (x) { return x.GPP; } },
          { n: "Respiración y descomposición", f: function (x) { return x.Resp; } },
          { sep: "Metano (CH₄)" },
          { n: "Humedales", f: function (x) { return x.wet; } },
          { n: "Otras fuentes naturales", f: function (x) { return x.cnat; } },
          { n: "Ganadería, arroz y residuos", f: function (x) { return x.agr; } },
          { n: "Combustibles fósiles", f: function (x) { return x.cfos; } },
          { n: "Quema de biomasa", f: function (x) { return x.cbb; } },
          { n: "Destrucción en la atmósfera y suelos", f: function (x) { return -x.sink; }, sign: true },
          { n: "Se acumula en la atmósfera", f: function (x) { return x.CG; }, sign: true, total: true },
          { n: "Aumento de CH₄ (ppb por año)", f: function (x) { return x.ppb; }, sign: true }
        ]
      };
    }
    function read(mode, m) {
      if (mode === "agua") {
        return "Cada año el océano evapora " + nf0.format(m.Eo) + " mil km³ de agua. " + nf0.format(m.Po / m.Eo * 100) +
          " % vuelve al mar como lluvia y el resto viaja a los continentes. Allí las plantas devuelven a la atmósfera " +
          nf0.format(m.Tl) + " mil km³ por transpiración, y los ríos llevan " + nf0.format(m.R) + " mil km³ de vuelta al océano.";
      }
      var E = m.F + m.LUC;
      if (E <= 0.01) return "Sin emisiones humanas, el océano y los bosques siguen absorbiendo carbono y el CO₂ de la atmósfera baja " + num(-m.ppm) + " ppm al año.";
      var pa = m.G / E * 10, po = m.O / E * 10, pl = m.L / E * 10;
      if (m.G < 0) return "El océano y los bosques absorben más carbono del que emitimos: el CO₂ de la atmósfera baja " + num(-m.ppm) + " ppm al año.";
      return "De cada 10 toneladas de carbono que emitimos, " + nf1.format(pa) + " se quedan en la atmósfera, " + nf1.format(po) +
        " las absorbe el océano y " + nf1.format(pl) + " los bosques y suelos. El CO₂ sube " + num(m.ppm) + " ppm y el metano " + num(m.ppb) + " ppb al año.";
    }
    function pill(mode, m) {
      if (mode === "agua") return null;
      return m.G > 0 ? { t: "El CO₂ sigue subiendo", c: "source" } : { t: "El CO₂ baja", c: "sink" };
    }
    return {
      defaults: { dT: 0, fossil: 1, defo: 1 },
      presets: {
        hoy: { dT: 0, fossil: 1, defo: 1 },
        cerodef: { dT: 0, fossil: 1, defo: 0 },
        mitad: { dT: 0, fossil: 0.5, defo: 0.5 },
        dos: { dT: 2, fossil: 1, defo: 1 },
        cero: { dT: 0, fossil: 0, defo: 0 }
      },
      model: model, draw: draw, ARROWS: ARROWS, width: width, text: text, update: update, table: table, read: read, pill: pill,
      aria: {
        agua: "Diagrama del ciclo global del agua entre el océano, la atmósfera y los continentes. El grosor de cada flecha es proporcional al flujo.",
        carbono: "Diagrama del ciclo global del carbono y del metano entre el océano, los bosques, los humedales, la agricultura y las ciudades."
      },
      note: {
        agua: "El grosor de cada flecha es proporcional al flujo de agua.",
        carbono: "El grosor de cada flecha crece con la raíz cuadrada del flujo en CO₂ equivalente, para que los flujos pequeños se vean."
      }
    };
  })();

  /* ==========================================================
     ESCENA 2: CUENCA ANDINA
     ========================================================== */
  var CU = (function () {
    var B = { P: 1400, N: 150, PET: 800, GPP: 1600, CUE: 0.5, Rh: 650, Q10: 2.2, CH4: 3, N2O: 0.05, DOCk: 0.015, OU: 8 };
    function water(s) {
      var cov = s.cover;
      var P = B.P * (1 + s.dP);
      var N = B.N * cov * Math.max(0, 1 - 0.08 * s.dT);
      var W = P + N;
      var PET = B.PET * (1 + 0.05 * s.dT);
      var w = 1.8 + 0.8 * cov;
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
      var Qb = Q * (0.25 + 0.45 * cov), Qs = Q - Qb;
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
      var CO2 = -NEP * C2CO2;
      var CH4e = CH4 * GWP.CH4, N2Oe = N2O * GWP.N2O;
      var rec = 0.1 + 0.2 * cov;
      return {
        P: h.P, N: h.N, In: h.W, T: T, E: E, ET: h.ET, Qs: Qs, Qb: Qb, Q: Q, Out: h.ET + Q,
        Mo: h.W * (1 - rec), Rec: h.W * rec, Dis: Q, OU: B.OU * Math.max(0, 1 - 0.04 * s.dT), ODOC: DOC,
        GPP: GPP, Ra: Ra, Rh: Rh, NEP: NEP, DOC: DOC, CH4: CH4, CH4C: CH4C, N2O: N2O, NECB: NEP - DOC - CH4C,
        CO2: CO2, CH4e: CH4e, N2Oe: N2Oe, GHG: CO2 + CH4e + N2Oe
      };
    }

    var G0 = [[0, 175], [90, 168], [170, 182], [260, 215], [360, 250], [460, 282], [560, 308], [620, 322], [720, 326], [800, 334], [836, 342]];
    var gy = groundFn(G0);
    var veg = [], pasture = [];
    var order = [5, 1, 8, 3, 12, 6, 10, 0, 14, 4, 11, 2, 9, 7, 13, 15, 16];

    function draw(g) {
      cloud(g, 205, 46, 1.1, 0.95);
      cloud(g, 660, 40, 0.8, 0.8);
      mk("rect", { x: -10, y: 118, width: 170, height: 34, rx: 17, fill: "#FFFFFF", opacity: 0.75 }, g);
      mk("rect", { x: 20, y: 132, width: 120, height: 22, rx: 11, fill: "#FFFFFF", opacity: 0.6 }, g);
      var line = G0.map(function (p) { return p.join(","); }).join(" L");
      mk("path", { d: "M" + line + " L836,460 L0,460 Z", fill: "#E4DCCF" }, g);
      var soilBottom = G0.slice().reverse().map(function (p) { return p[0] + "," + (p[1] + 52); }).join(" L");
      mk("path", { d: "M" + line + " L" + soilBottom + " Z", fill: "#CDB79E" }, g);
      mk("path", { d: "M" + line, fill: "none", stroke: "#8DBE8F", "stroke-width": 5, "stroke-linejoin": "round" }, g);
      label(g, 760, 448, "Roca y agua subterránea", "end");
      mk("path", { d: "M806 340 Q 830 338 860 341 L960 341 L960 460 L770 460 Q 790 400 806 340 Z", fill: "url(#sim-sea)" }, g);
      mk("path", { d: "M800 338 Q 818 334 836 342 L 812 342 Z", fill: "#EADFB8" }, g);
      waves(g, [[846, 360], [896, 372], [850, 392]]);
      label(g, 948, 440, "Océano", "end", "sim-zone sim-sea");
      mk("path", { d: "M596 321 Q 660 342 720 330 Q 770 326 812 340 L812 346 Q 770 336 720 342 Q 660 352 596 327 Z", fill: "#7DB6D3" }, g);
      label(g, 704, 316, "Quebrada", "end");
      mk("ellipse", { cx: 112, cy: gy(112) + 2, rx: 34, ry: 5, fill: "#8FC2D6" }, g);
      label(g, 112, gy(112) + 20, "Turbera", "middle");
      veg = []; pasture = [];
      var xs = [22, 46, 70, 150, 178, 200, 232, 262, 292, 322, 352, 382, 412, 442, 472, 500, 528];
      xs.forEach(function (x, i) {
        veg.push(i < 6 ? frailejon(g, x, gy(x)) : tree(g, x, gy(x), 15 + ((i - 6) % 3) * 2, i - 6));
      });
      xs.forEach(function (x) { pasture.push(mk("ellipse", { cx: x, cy: gy(x) - 3, rx: 13, ry: 4, fill: "#E3D88E" }, g)); });
    }

    var ARROWS = {
      agua: [
        { k: "P", name: "Precipitación", d: "M205 78 L205 " + (gy(205) - 30), color: "#2F7FB5", lx: 218, ly: 104 },
        { k: "N", name: "Niebla", d: "M8 150 Q 50 158 84 166", color: "#6FA8C9", lx: 10, ly: 108 },
        { k: "T", name: "Transpiración", d: "M412 " + (gy(412) - 48) + " L412 92", color: "#8EC3DD", lx: 424, ly: 110 },
        { k: "E", name: "Evaporación", d: "M318 " + (gy(318) - 6) + " L318 128", color: "#A8CFE3", lx: 306, ly: 150, a: "end" },
        { k: "Qs", name: "Escorrentía superficial", d: "M290 216 Q 460 262 596 316", color: "#3C8DBC", lx: 550, ly: 278 },
        { k: "Qb", name: "Flujo base", d: "M160 196 C 210 262, 430 316, 600 334", color: "#2D6E9E", lx: 330, ly: 302, dark: true },
        { k: "Mo", name: "Humedad desde el océano", d: "M904 334 C 904 150, 560 30, 252 50", color: "#5A9FC8", lx: 850, ly: 228, a: "end" },
        { k: "Dis", name: "Descarga al océano", d: "M636 342 Q 730 350 842 350", color: "#2D6E9E", lx: 640, ly: 386, dark: true }
      ],
      carbono: [
        { k: "GPP", name: "Fotosíntesis (GPP)", d: "M480 82 L480 " + (gy(480) - 52), color: "#3F9C6E", lx: 492, ly: 104 },
        { k: "Ra", name: "Respiración de plantas", d: "M430 " + (gy(430) - 50) + " L430 92", color: "#C9874B", lx: 418, ly: 104, a: "end" },
        { k: "Rh", name: "Respiración del suelo", d: "M342 " + (gy(342) + 18) + " L342 150", color: "#A0683A", lx: 326, ly: 160, a: "end" },
        { k: "CH4", name: "Metano (CH₄)", d: "M112 " + (gy(112) - 4) + " L112 66", color: "#8A6AB0", lx: 124, ly: 82 },
        { k: "N2O", name: "Óxido nitroso (N₂O)", d: "M574 " + (gy(574) - 4) + " L574 176", color: "#C05C7A", lx: 586, ly: 196 },
        { k: "DOC", name: "Carbono disuelto al río", d: "M180 206 C 250 280, 450 330, 600 336", color: "#5E8A47", lx: 300, ly: 314, dark: true },
        { k: "OU", name: "CO₂ absorbido por el océano", d: "M904 150 L904 336", color: "#2F8FA0", lx: 948, ly: 118, a: "end" },
        { k: "ODOC", name: "Carbono del río al océano", d: "M636 344 Q 730 352 842 352", color: "#5E8A47", lx: 640, ly: 386, dark: true }
      ]
    };
    function width(mode, a, m) {
      if (mode === "agua") return clamp(2.5 + m[a.k] / 1600 * 16, 2.5, 20);
      var eq = a.k === "CH4" ? m.CH4e : a.k === "N2O" ? m.N2Oe : m[a.k] * C2CO2;
      return clamp(2.5 + Math.sqrt(Math.max(0, eq)) / Math.sqrt(7000) * 15, 2.5, 20);
    }
    function text(mode, a, m) {
      var v = m[a.k];
      if (mode === "agua") return num(v) + " mm";
      if (a.k === "CH4") return num(v) + " g CH₄";
      if (a.k === "N2O") return num(v) + " g N₂O";
      if (a.k === "OU") return num(v) + " g C por m² de océano";
      return num(v) + " g C";
    }
    function update(s) {
      var keep = Math.round(s.cover * veg.length);
      veg.forEach(function (g, i) {
        var visible = order.indexOf(i) < keep;
        g.style.opacity = visible ? 1 : 0;
        pasture[i].style.opacity = visible ? 0 : 1;
      });
    }
    function table(mode) {
      if (mode === "agua") return {
        unit: "mm por año",
        rows: [
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
          { n: "Entradas − salidas", f: function (x) { return x.In - x.Out; }, total: true },
          { sep: "Conexión con el océano" },
          { n: "Humedad que llega desde el océano", f: function (x) { return x.Mo; } },
          { n: "Humedad reciclada por la vegetación", f: function (x) { return x.Rec; } },
          { n: "Descarga del río al océano", f: function (x) { return x.Dis; } }
        ]
      };
      return {
        unit: "g C por m² al año (gases en g CO₂-eq)",
        rows: [
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
          { n: "Balance neto de GEI", f: function (x) { return x.GHG; }, sign: true, total: true },
          { sep: "Océano (no se suma a la cuenca)" },
          { n: "Carbono del río al océano", f: function (x) { return x.ODOC; } },
          { n: "CO₂ absorbido por el océano (g C por m² de océano)", f: function (x) { return x.OU; } }
        ]
      };
    }
    function read(mode, m, s) {
      if (mode === "agua") {
        var y = m.Q / m.In * 100, reg = m.Qb / m.Q * 100;
        return "De cada 100 mm que entran a la cuenca, " + nf0.format(y) + " salen por la quebrada y " + nf0.format(100 - y) +
          " vuelven a la atmósfera. El " + nf0.format(reg) + " % del caudal es flujo base: el agua que el suelo regula y entrega en época seca. El " +
          nf0.format(m.Mo / m.In * 100) + " % de la humedad viene del océano y el resto la reciclan las plantas.";
      }
      var t = m.GHG < 0
        ? "La cuenca captura más gases de los que emite: un balance de " + num(m.GHG) + " g CO₂-eq por m² al año, equivalente a " + nf1.format(Math.abs(m.GHG) / 100) + " t CO₂-eq por hectárea."
        : "La cuenca emite más gases de los que captura: un balance de +" + num(m.GHG) + " g CO₂-eq por m² al año, equivalente a " + nf1.format(m.GHG / 100) + " t CO₂-eq por hectárea.";
      return t + " Cada m² de océano absorbe " + num(m.OU) + " g C al año" + (s.dT > 0.05 ? ", menos que hoy porque el agua cálida disuelve menos CO₂." : ".");
    }
    function pill(mode, m) {
      if (mode === "agua") return null;
      return m.GHG < 0 ? { t: "Sumidero de GEI", c: "sink" } : { t: "Fuente de GEI", c: "source" };
    }
    return {
      defaults: { dT: 0, dP: 0, cover: 1 },
      presets: {
        hoy: { dT: 0, dP: 0, cover: 1 },
        nino: { dT: 1, dP: -0.25, cover: 1 },
        nina: { dT: -0.3, dP: 0.25, cover: 1 },
        futuro: { dT: 2, dP: -0.1, cover: 0.85 },
        potrero: { dT: 0, dP: 0, cover: 0.4 }
      },
      model: model, draw: draw, ARROWS: ARROWS, width: width, text: text, update: update, table: table, read: read, pill: pill,
      aria: {
        agua: "Diagrama de una cuenca andina conectada con el océano, con los flujos del ciclo del agua. El grosor de cada flecha es proporcional al flujo.",
        carbono: "Diagrama de una cuenca andina conectada con el océano, con los flujos de carbono y gases de efecto invernadero."
      },
      note: {
        agua: "El grosor de cada flecha es proporcional al flujo de agua.",
        carbono: "El grosor de cada flecha crece con la raíz cuadrada del flujo en CO₂ equivalente, para que los gases pequeños se vean."
      }
    };
  })();

  /* ==========================================================
     MOTOR: dibujo, controles y tablas
     ========================================================== */
  var SCENES = { planeta: PL, cuenca: CU };
  var sceneG = {}, arrowG, labelG;
  Object.keys(SCENES).forEach(function (k) {
    sceneG[k] = mk("g", { "data-scene": k }, svg);
    SCENES[k].draw(sceneG[k]);
  });
  arrowG = mk("g", {}, svg);
  labelG = mk("g", {}, svg);

  var state = { scale: "planeta", mode: "agua", planeta: {}, cuenca: {} };
  Object.keys(SCENES).forEach(function (k) {
    var d = SCENES[k].defaults;
    for (var p in d) state[k][p] = d[p];
  });
  var BASES = { planeta: PL.model(PL.defaults), cuenca: CU.model(CU.defaults) };
  var built = [];

  function build() {
    var sc = SCENES[state.scale];
    arrowG.innerHTML = "";
    labelG.innerHTML = "";
    built = [];
    sc.ARROWS[state.mode].forEach(function (a) {
      var mid = "sim-m-" + state.scale + "-" + a.k;
      var old = document.getElementById(mid);
      if (old) old.parentNode.removeChild(old);
      var m = mk("marker", { id: mid, viewBox: "0 0 10 10", refX: 3, refY: 5, markerUnits: "userSpaceOnUse", orient: "auto" }, defs);
      mk("path", { d: "M0 0 L10 5 L0 10 Z", fill: a.color }, m);
      var p = mk("path", { d: a.d, fill: "none", stroke: a.color, "marker-end": "url(#" + mid + ")", "class": "sim-arrow" }, arrowG);
      var f = mk("path", { d: a.d, fill: "none", stroke: "#FFFFFF", "stroke-linecap": "round", "stroke-dasharray": "1 13", "class": "sim-flow" }, arrowG);
      var t = mk("text", { x: a.lx, y: a.ly, "text-anchor": a.a || "start", "class": "sim-label" + (a.dark ? " on-soil" : "") }, labelG);
      var t1 = mk("tspan", { x: a.lx, dy: 0, "class": "sim-lname" }, t); t1.textContent = a.name;
      var t2 = mk("tspan", { x: a.lx, dy: 17, "class": "sim-lval" }, t);
      built.push({ a: a, p: p, f: f, m: m, v: t2 });
    });
    Object.keys(sceneG).forEach(function (k) { sceneG[k].style.display = k === state.scale ? "" : "none"; });
    svg.setAttribute("aria-label", sc.aria[state.mode]);
    $("sim-note").textContent = sc.note[state.mode];
    ["planeta", "cuenca"].forEach(function (k) {
      $("sim-ctl-" + k).hidden = k !== state.scale;
      $("sim-legend-" + k).hidden = k !== state.scale;
      $("sim-cap-" + k).hidden = k !== state.scale;
    });
  }

  function rows(defsList, base, m) {
    return defsList.map(function (r) {
      if (r.sep) return '<tr class="sep"><th colspan="3">' + r.sep + "</th></tr>";
      var a = r.f(base), b = r.f(m);
      return '<tr class="' + (r.total ? "total" : "") + '"><td>' + r.n + "</td><td>" + (r.sign ? signed(a) : num(a)) + "</td><td>" + (r.sign ? signed(b) : num(b)) + "</td></tr>";
    }).join("");
  }

  var OUTS = {
    planeta: { dT: ["pl-dt", deg], fossil: ["pl-fos", function (v) { return nf0.format(v * 100) + " %"; }], defo: ["pl-def", function (v) { return nf0.format(v * 100) + " %"; }] },
    cuenca: { dT: ["sim-dt", deg], dP: ["sim-dp", function (v) { return pct(v * 100); }], cover: ["sim-cov", function (v) { return nf0.format(v * 100) + " %"; }] }
  };
  var SCALE_IN = { dT: 1, fossil: 100, defo: 100, dP: 100, cover: 100 };

  function render() {
    var k = state.scale, sc = SCENES[k], s = state[k];
    var m = sc.model(s);
    Object.keys(OUTS[k]).forEach(function (p) {
      $(OUTS[k][p][0] + "-out").textContent = OUTS[k][p][1](s[p]);
    });
    sc.update(s);
    built.forEach(function (b) {
      var w = sc.width(state.mode, b.a, m);
      b.p.setAttribute("stroke-width", w);
      b.f.setAttribute("stroke-width", Math.max(1.6, w * 0.32));
      var hs = w * 1.6 + 9;
      b.m.setAttribute("markerWidth", hs);
      b.m.setAttribute("markerHeight", hs);
      b.v.textContent = sc.text(state.mode, b.a, m);
    });
    var t = sc.table(state.mode);
    $("sim-unit").textContent = t.unit;
    $("sim-tbody").innerHTML = rows(t.rows, BASES[k], m);
    $("sim-th-base").textContent = k === "planeta" ? "Hoy" : "Actual";
    $("sim-read").textContent = sc.read(state.mode, m, s);
    var pl = sc.pill(state.mode, m), pe = $("sim-pill");
    pe.hidden = !pl;
    if (pl) { pe.textContent = pl.t; pe.className = "sim-pill " + pl.c; }

    Array.prototype.forEach.call(document.querySelectorAll("#sim-ctl-" + k + " [data-p]"), function (b) {
      var p = sc.presets[b.getAttribute("data-p")], on = true;
      for (var q in p) if (Math.abs(p[q] - s[q]) > 0.004) on = false;
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    Array.prototype.forEach.call(document.querySelectorAll("#sim-mode .pill"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-m") === state.mode ? "true" : "false");
    });
    Array.prototype.forEach.call(document.querySelectorAll("#sim-scale .pill"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-s") === state.scale ? "true" : "false");
    });
  }

  function syncInputs(k) {
    Object.keys(OUTS[k]).forEach(function (p) {
      $(OUTS[k][p][0]).value = Math.round(state[k][p] * SCALE_IN[p] * 10) / 10;
    });
  }
  Object.keys(OUTS).forEach(function (k) {
    Object.keys(OUTS[k]).forEach(function (p) {
      var el = $(OUTS[k][p][0]);
      el.addEventListener("input", function () { state[k][p] = parseFloat(el.value) / SCALE_IN[p]; render(); });
    });
    $("sim-ctl-" + k).addEventListener("click", function (e) {
      var b = e.target.closest("button[data-p]");
      if (!b) return;
      var p = SCENES[k].presets[b.getAttribute("data-p")];
      for (var q in p) state[k][q] = p[q];
      syncInputs(k);
      render();
    });
  });
  $("sim-mode").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-m]");
    if (!b || b.getAttribute("data-m") === state.mode) return;
    state.mode = b.getAttribute("data-m");
    build();
    render();
  });
  $("sim-scale").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-s]");
    if (!b || b.getAttribute("data-s") === state.scale) return;
    state.scale = b.getAttribute("data-s");
    build();
    render();
  });

  syncInputs("planeta");
  syncInputs("cuenca");
  build();
  render();
})();
