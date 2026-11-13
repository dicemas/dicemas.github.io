/* ==========================================================
   FUNCIONES COMPARTIDAS DEL SITIO
   Aplica los logos y los datos de contacto de configuracion.js.
   No necesitas editar este archivo.
   ========================================================== */
var SITIO = (function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function copyText(text, btn, label, onFail) {
    var done = function (ok) {
      btn.textContent = ok ? "Copiado" : "No se pudo copiar";
      if (!ok && onFail) onFail();
      setTimeout(function () { btn.textContent = label; }, 1800);
    };
    var fallback = function () {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        ta.remove();
        done(ok);
      } catch (e) { done(false); }
    };
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } catch (e) { fallback(); }
  }

  /* Si una imagen no carga, se reemplaza por su respaldo (data-fb) */
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG" || !img.hasAttribute("data-fb")) return;
    var box = img.closest(".ph") || img.parentElement;
    box.classList.remove("has-img");
    box.innerHTML = img.getAttribute("data-fb");
  }, true);

  /* Logos */
  if (typeof LOGOS !== "undefined") {
    var root = document.documentElement.style;
    root.setProperty("--h-sem", (parseInt(LOGOS.alturaSemillero, 10) || 44) + "px");
    root.setProperty("--h-uni", (parseInt(LOGOS.alturaUniversidad, 10) || 40) + "px");
    var foot = $("foot-logos"), footHtml = "";
    if (LOGOS.semillero) {
      if ($("logo-sem")) $("logo-sem").innerHTML = '<img src="' + esc(LOGOS.semillero) + '" alt="Logo de DICEMAS">';
      footHtml += '<img src="' + esc(LOGOS.semillero) + '" alt="Logo de DICEMAS">';
    }
    if (LOGOS.mostrarNombre === false && $("brand-text")) $("brand-text").hidden = true;
    if (LOGOS.universidad) {
      var img = '<img src="' + esc(LOGOS.universidad) + '" alt="Logo de la universidad">';
      var uni = LOGOS.enlaceUniversidad ? '<a href="' + esc(LOGOS.enlaceUniversidad) + '" target="_blank" rel="noopener">' + img + "</a>" : img;
      var pos = LOGOS.posicionUniversidad;
      var slot = pos === "izquierda" ? $("uni-left") : pos !== "solo-pie" ? $("uni-right") : null;
      if (slot) { slot.innerHTML = uni; slot.hidden = false; }
      footHtml += uni;
    }
    if (foot && footHtml) { foot.innerHTML = footHtml; foot.hidden = false; }
  }

  /* Contacto y redes */
  if (typeof CONTACTO !== "undefined") {
    Array.prototype.forEach.call(document.querySelectorAll("[data-correo]"), function (el) { el.textContent = CONTACTO.correo; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-ciudad]"), function (el) { el.textContent = CONTACTO.ciudad; });
    ["linkedin", "instagram"].forEach(function (red) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-red="' + red + '"]'), function (el) {
        if (CONTACTO[red]) {
          var a = el.tagName === "A" ? el : el.querySelector("a");
          if (a) a.href = CONTACTO[red];
          el.hidden = false;
        } else {
          el.hidden = true;
        }
      });
    });
  }

  /* Botones para copiar el correo */
  Array.prototype.forEach.call(document.querySelectorAll("[data-copiar-correo]"), function (btn) {
    btn.addEventListener("click", function () {
      copyText(CONTACTO.correo, btn, btn.textContent);
    });
  });

  return { esc: esc, copyText: copyText };
})();
