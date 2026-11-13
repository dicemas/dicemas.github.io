/* ==========================================================
   CONFIGURACIÓN GENERAL DEL SITIO
   Lo que cambies aquí se aplica a todas las páginas
   (inicio y boletín).
   Reglas: textos entre comillas, números sin comillas,
   una coma al final de cada línea excepto la última de cada bloque.
   ========================================================== */

/* ====== LOGOS ======
   Sube los archivos a la carpeta "fotos" (PNG con fondo
   transparente o SVG se ven mejor) y escribe aquí su ruta. */
var LOGOS = {
  semillero: "",              /* ej. "fotos/logo-dicemas.png". Vacío = ícono de montaña */
  mostrarNombre: true,        /* false oculta el texto "DICEMAS" junto al logo
                                 (útil si el logo ya trae el nombre) */
  alturaSemillero: 44,        /* alto del logo del semillero, en píxeles */

  universidad: "",            /* ej. "fotos/logo-universidad.png". Vacío = no aparece */
  posicionUniversidad: "derecha",
                              /* "izquierda" = junto al logo del semillero
                                 "derecha"   = al final de la cabecera, después del menú
                                 "solo-pie"  = solo en el pie de página */
  alturaUniversidad: 40,      /* alto del logo de la universidad, en píxeles */
  enlaceUniversidad: ""       /* opcional: página web al hacer clic en el logo */
};

/* ====== CONTACTO Y REDES ======
   Se muestran en el pie de página, en "Únete" y en el boletín.
   Deja "" en las redes que no tengan. */
var CONTACTO = {
  correo: "correo-del-semillero@tu-universidad.edu.co",
  ciudad: "Bogotá, Colombia",
  linkedin: "",               /* ej. "https://www.linkedin.com/company/dicemas" */
  instagram: ""               /* ej. "https://www.instagram.com/dicemas" */
};
