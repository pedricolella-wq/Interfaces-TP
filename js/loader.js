/* =========================================================
   frib · loader.js
   Carga simulada de 5 segundos con porcentaje real y animación CSS.
   No se usa ningún GIF: el spinner es conic-gradient + @keyframes.
   ========================================================= */
'use strict';
(function () {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const DURACION = 5000;                    // 5 s exactos, como pide la consigna
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

  document.body.style.overflow = 'hidden';
  let ultimo = -1;
  const inicio = performance.now();

  function paso(ahora) {
    const t = Math.min(1, (ahora - inicio) / DURACION);
    const p = Math.floor(t * 100);
    if (p !== ultimo) {
      ultimo = p;
      pct.textContent = p + '%';
      barra.style.width = p + '%';
      loader.setAttribute('aria-valuenow', String(p));
      const m = MENSAJES.filter(x => p >= x[0]).pop();
      if (m && texto.textContent !== m[1]) texto.textContent = m[1];
    }
    if (t < 1) { requestAnimationFrame(paso); }
    else {
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
