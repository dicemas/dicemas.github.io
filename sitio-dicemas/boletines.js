/* ==========================================================
   BOLETÍN CLIMÁTICO
   Cada boletín es un bloque { ... }. El de fecha más reciente
   aparece primero en la página del boletín y en el inicio.

   Organización recomendada de archivos en GitHub:
     boletines/2026-10/DICEMAS_Boletin_03_2026-10.pdf
     boletines/2026-10/figura-1.jpg
     boletines/2026-10/figura-2.jpg
   (una carpeta por boletín, con el año y el mes)

   Para publicar uno nuevo: copia el primer bloque completo,
   pégalo debajo de "var BOLETINES = [" y cambia los datos.
   Campos vacíos: "" para textos y [] para listas. Lo que esté
   vacío no se muestra.
   ========================================================== */
var BOLETINES = [
  {
    numero: 3,
    periodo: "Octubre de 2026",
    fecha: "2026-11-05",               /* fecha de publicación: año-mes-día */
    titulo: "Lluvias por debajo de lo normal en la alta montaña",
    resumen: "Texto de ejemplo. Resume en dos o tres frases cómo estuvo el clima del mes y qué esperamos para el siguiente. Puede ser el mismo texto con el que abren la publicación de LinkedIn.",
    puntos: [
      "Texto de ejemplo. Primer mensaje clave del boletín.",
      "Texto de ejemplo. Segundo mensaje clave.",
      "Texto de ejemplo. Tercer mensaje clave."
    ],
    indicadores: [
      { n: "Fase ENSO", v: "Neutral", nota: "Dato de ejemplo" },
      { n: "Anomalía de temperatura", v: "+0,4 °C", nota: "Respecto a 1991–2020" },
      { n: "Precipitación", v: "82 %", nota: "Del promedio del mes" },
      { n: "Perspectiva", v: "Más seco", nota: "Próximos tres meses" }
    ],
    figuras: [
      { src: "boletines/2026-10/figura-1.jpg", pie: "Anomalía de precipitación de octubre", fuente: "CHIRPS" },
      { src: "boletines/2026-10/figura-2.jpg", pie: "Índice Oceánico El Niño (ONI) de los últimos 12 meses", fuente: "NOAA CPC" }
    ],
    analisis: [
      "Texto de ejemplo. Aquí va el análisis completo: temperatura, precipitación y su relación con El Niño–Oscilación del Sur.",
      "Texto de ejemplo. Aquí va lo que estas condiciones significan para los páramos y los bosques andinos."
    ],
    autores: ["Daniela Pérez Rojas", "Juan Sebastián Moreno"],
    pdf: "",                           /* ej. "boletines/2026-10/DICEMAS_Boletin_03_2026-10.pdf" */
    linkedin: ""                       /* enlace a la publicación en LinkedIn */
  },
  {
    numero: 2,
    periodo: "Septiembre de 2026",
    fecha: "2026-10-06",
    titulo: "Septiembre cálido y con lluvias cercanas al promedio",
    resumen: "Texto de ejemplo.",
    puntos: [],
    indicadores: [],
    figuras: [],
    analisis: [],
    autores: [],
    pdf: "",
    linkedin: ""
  },
  {
    numero: 1,
    periodo: "Agosto de 2026",
    fecha: "2026-09-04",
    titulo: "Primer boletín del semillero",
    resumen: "Texto de ejemplo.",
    puntos: [],
    indicadores: [],
    figuras: [],
    analisis: [],
    autores: [],
    pdf: "",
    linkedin: ""
  }
];
