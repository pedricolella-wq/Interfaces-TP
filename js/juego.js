/* =========================================================
   frib · juego.js
   ---------------------------------------------------------
   Esta página es solo la maqueta visual del juego: el tablero
   es una imagen y no hay lógica de Peg Solitaire. Este archivo
   se ocupa únicamente de:
     · los datos del juego en la cabecera,
     · el botón de compartir,
     · pedirle a resenias.js que arme el hilo de comentarios.
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. Qué juego se está mostrando (?j=slug)
   --------------------------------------------------------- */
const slugActual = new URLSearchParams(location.search).get('j') || 'peg-solitaire';
const juegoActual = JUEGOS.find(j => j.slug === slugActual) || JUEGOS.find(j => j.slug === 'peg-solitaire');

/* ---------------------------------------------------------
   2. Arranque
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  /* Datos del juego en la cabecera */
  document.getElementById('juego-titulo').textContent = juegoActual.titulo;
  document.getElementById('miga-cat').textContent = juegoActual.categoria;
  document.getElementById('miga-juego').textContent = juegoActual.titulo;
  document.getElementById('juego-estrellas').innerHTML = estrellas(juegoActual.nota);
  document.getElementById('juego-nota').textContent = `${juegoActual.nota.toFixed(1)} (${TOTAL_RESENIAS} reseñas)`;
  document.getElementById('juego-desc').textContent = juegoActual.desc;
  document.title = `${juegoActual.titulo} · frib`;

  /* Compartí tu récord — dentro del juego */
  document.getElementById('copiar-link').addEventListener('click', async () => {
    const txt = `Jugué a ${juegoActual.titulo} en frib. ${location.href}`;
    try { await navigator.clipboard.writeText(txt); toast('¡Link copiado!'); }
    catch { toast('Copiá el link desde la barra del navegador'); }
  });

  /* El hilo de resenias es de la plantilla: vive en resenias.js
     y lo comparten todas las paginas de juego. */
  initResenias();
});
