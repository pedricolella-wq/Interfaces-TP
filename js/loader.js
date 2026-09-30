/* =========================================================
   frib · loader.js — carga simulada de 5 segundos
   ---------------------------------------------------------
   Qué resuelve este archivo:
     · que la pantalla de carga dure EXACTAMENTE 5 s,
     · que el porcentaje que se ve sea real (medido con el
       reloj del navegador, no inventado con un setInterval),
     · que al terminar avise al resto de la página.

   Por qué requestAnimationFrame y no setInterval:
   rAF se sincroniza con el refresco de la pantalla (~60 veces
   por segundo) y me da el tiempo exacto transcurrido, así que
   el porcentaje nunca se desfasa aunque el navegador se trabe
   un instante. Con setInterval, si un tick llega tarde, la
   cuenta se atrasa y los 5 s dejan de ser 5 s.

   Toda la animación del spinner es CSS (ver animations.css,
   bloque B): acá solo se calcula el número y el ancho de la
   barra. No se usa ningún GIF ni spritesheet.

   El patrón de cierre es un EVENTO PERSONALIZADO: en vez de
   que el loader sepa qué hay que construir después, dispara
   'frib:cargado' y home.js lo escucha. Así los dos archivos
   quedan desacoplados.
   ========================================================= */
'use strict';
(function () {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const DURACION = 5000;                    // 5 s exactos, como pide la consigna
  const TONO_INI = 233;                     // hue del azul de la marca
  const TONO_FIN = 82;                      // hue del lima
  const pct   = document.getElementById('loader-pct');
  const barra = document.getElementById('loader-barra');
  const texto = document.getElementById('loader-texto');

  const MENSAJES = [
    [0,   'Encendiendo las máquinas…'],
    [22,  'Cargando el catálogo de juegos…'],
    [45,  'Pidiendo novedades a la API de la cátedra…'],
    [68,  'Ordenando tus sugerencias…'],
    [86,  'Casi listo, preparando el tablero…'],
  ];

  /* Mientras carga no se puede scrollear la página de atrás. */
  document.body.style.overflow = 'hidden';
  let ultimo = -1;                          // último % pintado, para no tocar el DOM de más
  const inicio = performance.now();         // marca de tiempo de alta precisión

  /* Se ejecuta en cada cuadro. "ahora" lo pasa el navegador. */
  function paso(ahora) {
    const t = Math.min(1, (ahora - inicio) / DURACION);   // avance de 0 a 1
    const p = Math.floor(t * 100);                        // ese avance en %
    if (p !== ultimo) {
      ultimo = p;
      /* El color del loader es un solo numero: el hue. Se interpola de
         233 a 82 segun el avance y el CSS arma con el los dos colores. */
      loader.style.setProperty('--tono', (TONO_INI + (TONO_FIN - TONO_INI) * t).toFixed(1));
      pct.textContent = p + '%';
      barra.style.width = p + '%';
      loader.setAttribute('aria-valuenow', String(p));
      const m = MENSAJES.filter(x => p >= x[0]).pop();
      if (m && texto.textContent !== m[1]) texto.textContent = m[1];
    }
    /* Si todavía no llegó a 5 s, pide el próximo cuadro. */
    if (t < 1) { requestAnimationFrame(paso); }
    else {
      /* Terminó: se desvanece (clase .saliendo) y recién
         después se oculta y avisa al resto de la página. */
      texto.textContent = '¡Listo!';
      loader.classList.add('saliendo');
      setTimeout(() => {
        loader.hidden = true;
        document.body.style.overflow = '';
        document.dispatchEvent(new CustomEvent('frib:cargado'));
      }, 450);
    }
  }
  requestAnimationFrame(paso);
})();
