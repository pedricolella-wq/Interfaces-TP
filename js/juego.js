/* =========================================================
   frib · juego.js
   ---------------------------------------------------------
   Esta página es solo la maqueta visual del juego: el tablero
   es una imagen y no hay lógica de Peg Solitaire. Este archivo
   se ocupa únicamente de:
     · los datos del juego en la cabecera,
     · el botón de compartir,
     · el hilo de reseñas (listado, orden, votos y formulario).
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. Qué juego se está mostrando (?j=slug)
   --------------------------------------------------------- */
const slugActual = new URLSearchParams(location.search).get('j') || 'peg-solitaire';
const juegoActual = JUEGOS.find(j => j.slug === slugActual) || JUEGOS.find(j => j.slug === 'peg-solitaire');

/* ---------------------------------------------------------
   1. RESEÑAS — hilo de comentarios (patrón de tienda de apps)
   --------------------------------------------------------- */
const TOTAL_RESENIAS = 317;
const PASO = 3;
let visibles = 3;
let orden = 'relevantes';

/* Color de avatar estable según el nombre (estándar de los hilos sin foto) */
const COLORES = ['#15803D', '#3D52C9', '#B45309', '#9333EA', '#0E7490', '#BE123C', '#4D7C0F', '#0F766E'];
const colorDe = (n) => COLORES[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];

/* Cada reseña arranca con sus "me gusta" y sus horas jugadas */
RESENIAS.forEach((r, i) => {
  r.megusta = (r.nota * 31 + i * 17 + r.texto.length) % 118 + 3;
  r.horas   = (r.nota * 11 + i * 7) % 60 + 3;
  r.voto    = 0;      // 1 = me gusta, -1 = no me gusta
  r.orden   = i;      // el orden original es "más recientes"
});

function ordenadas() {
  const l = RESENIAS.slice();
  if (orden === 'recientes') return l.sort((a, b) => a.orden - b.orden);
  if (orden === 'mejores')   return l.sort((a, b) => b.nota - a.nota || b.megusta - a.megusta);
  if (orden === 'peores')    return l.sort((a, b) => a.nota - b.nota || b.megusta - a.megusta);
  return l.sort((a, b) => b.megusta - a.megusta);   // más relevantes
}

const pulgar = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#pulgar"></use></svg>';

function pintarResenias() {
  const lista = document.getElementById('lista-resenias');
  lista.innerHTML = ordenadas().slice(0, visibles).map((r, i) => `
    <article class="comentario" style="animation-delay:${Math.min(i, 5) * 40}ms">
      <span class="comentario__avatar" style="--c:${colorDe(r.quien)}" aria-hidden="true">${r.quien[0]}</span>
      <div>
        <p class="comentario__meta">
          <b>${r.quien}</b>
          <span class="cuando">${r.cuando}</span>
          ${estrellas(r.nota)}
          <span class="comentario__horas">${r.horas} h jugadas</span>
        </p>
        <p class="comentario__texto">${r.texto}</p>
        <div class="comentario__acciones">
          <button class="accion" type="button" data-voto="1" data-quien="${r.quien}"
                  aria-pressed="${r.voto === 1}" aria-label="Me gusta la reseña de ${r.quien}">
            ${pulgar}<span>${r.megusta + (r.voto === 1 ? 1 : 0)}</span>
          </button>
          <button class="accion accion--abajo" type="button" data-voto="-1" data-quien="${r.quien}"
                  aria-pressed="${r.voto === -1}" aria-label="No me gusta la reseña de ${r.quien}">
            ${pulgar}
          </button>
          <button class="accion" type="button" data-responder="${r.quien}">Responder</button>
        </div>
      </div>
    </article>`).join('');

  document.getElementById('contador-resenias').textContent =
    `Mostrando ${Math.min(visibles, RESENIAS.length)} de ${TOTAL_RESENIAS} reseñas`;
  document.getElementById('btn-mas').disabled = visibles >= RESENIAS.length;
}

/* Resumen con la distribución de estrellas, como en las tiendas de apps */
function pintarResumen() {
  const total = RESENIAS.length;
  const prom = RESENIAS.reduce((a, r) => a + r.nota, 0) / total;
  document.getElementById('res-nota').textContent = prom.toFixed(1).replace('.', ',');
  document.getElementById('res-estrellas').innerHTML = estrellas(Math.round(prom * 10) / 10);
  document.getElementById('res-total').textContent = `${TOTAL_RESENIAS} reseñas`;
  document.getElementById('res-barras').innerHTML = [5, 4, 3, 2, 1].map(n => {
    const c = RESENIAS.filter(r => r.nota === n).length;
    const pct = Math.round((c / total) * 100);
    return `<li><span>${n}</span><i style="--v:${pct}%"></i><em>${pct}%</em></li>`;
  }).join('');
}

function votar(quien, valor) {
  const r = RESENIAS.find(x => x.quien === quien);
  if (!r) return;
  r.voto = r.voto === valor ? 0 : valor;
  pintarResenias();
}

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

  /* Reseñas */
  pintarResumen();
  pintarResenias();
  document.getElementById('btn-mas').addEventListener('click', () => { visibles += PASO; pintarResenias(); });
  document.getElementById('orden-resenias').addEventListener('change', (e) => {
    orden = e.target.value; pintarResenias();
  });

  /* Me gusta / no me gusta y "Responder", como en cualquier hilo de comentarios */
  document.getElementById('lista-resenias').addEventListener('click', (e) => {
    const b = e.target.closest('.accion'); if (!b) return;
    if (b.dataset.voto) { votar(b.dataset.quien, +b.dataset.voto); return; }
    if (b.dataset.responder) {
      const caja = document.getElementById('txt-resenia');
      caja.value = `@${b.dataset.responder} `;
      caja.focus();
      caja.setSelectionRange(caja.value.length, caja.value.length);
      caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  /* Formulario de reseña */
  const puntaje = document.getElementById('puntaje');
  let miNota = 0;
  puntaje.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    miNota = +b.dataset.n;
    Array.from(puntaje.children).forEach((x, i) => x.classList.toggle('on', i < miNota));
  });
  document.getElementById('form-resenia').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = document.getElementById('txt-resenia').value.trim();
    if (!t) { toast('Escribí tu comentario antes de publicar'); return; }
    RESENIAS.unshift({ quien: 'Pedro', cuando: 'recién', nota: miNota || 5, texto: t,
                       megusta: 0, horas: 4, voto: 0, orden: -1 });
    visibles++; orden = 'recientes';
    document.getElementById('orden-resenias').value = 'recientes';
    pintarResumen(); pintarResenias();
    e.target.reset(); miNota = 0;
    Array.from(puntaje.children).forEach(x => x.classList.remove('on'));
    toast('¡Gracias por tu reseña!');
  });
});
