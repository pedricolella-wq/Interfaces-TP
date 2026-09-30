/* =========================================================
   frib · juego.js — Peg Solitaire jugable y hilo de reseñas
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. Qué juego se está mostrando (?j=slug)
   --------------------------------------------------------- */
const slugActual = new URLSearchParams(location.search).get('j') || 'peg-solitaire';
const juegoActual = JUEGOS.find(j => j.slug === slugActual) || JUEGOS.find(j => j.slug === 'peg-solitaire');

/* ---------------------------------------------------------
   1. PEG SOLITAIRE — tablero inglés de 33 casilleros
   ---------------------------------------------------------
   El tablero se guarda como una matriz de 7×7 donde cada
   casilla vale:  1 = ficha · 0 = casillero libre · -1 = fuera
   del tablero (las cuatro esquinas de 2×2 que el tablero
   inglés no tiene). Eso es lo que decide valido(r, c).

   El tablero se DIBUJA como SVG generado por JS: por cada
   casilla se escribe un <circle>. Al ser SVG, las fichas se
   animan con CSS igual que cualquier elemento HTML (ver
   animations.css, bloque G): la ficha que salta usa
   @keyframes salto-ficha y los casilleros a los que se puede
   saltar laten solos con @keyframes latido.

   El degradado de las fichas es un <radialGradient> definido
   una sola vez en <defs> y reutilizado por las 32 fichas.
   --------------------------------------------------------- */
const TAM = 7;
const valido = (r, c) => (r >= 2 && r <= 4) || (c >= 2 && c <= 4);

let tablero, seleccion, historial, movimientos, t0, tickTimer;

function nuevoTablero() {
  tablero = [];
  for (let r = 0; r < TAM; r++) {
    tablero[r] = [];
    for (let c = 0; c < TAM; c++) tablero[r][c] = valido(r, c) ? 1 : -1; // 1 ficha, 0 vacío, -1 fuera
  }
  tablero[3][3] = 0;
  seleccion = null; historial = []; movimientos = 0;
}

function movimientosPosibles(r, c) {
  const dirs = [[-2,0],[2,0],[0,-2],[0,2]];
  const salidas = [];
  for (const [dr, dc] of dirs) {
    const tr = r + dr, tc = c + dc, mr = r + dr/2, mc = c + dc/2;
    if (tr < 0 || tr >= TAM || tc < 0 || tc >= TAM) continue;
    if (tablero[tr][tc] === 0 && tablero[mr][mc] === 1) salidas.push({ tr, tc, mr, mc });
  }
  return salidas;
}

function hayMovimientos() {
  for (let r = 0; r < TAM; r++)
    for (let c = 0; c < TAM; c++)
      if (tablero[r][c] === 1 && movimientosPosibles(r, c).length) return true;
  return false;
}

function fichasRestantes() {
  let n = 0;
  for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) if (tablero[r][c] === 1) n++;
  return n;
}

function dibujarTablero() {
  const svg = document.getElementById('tablero');
  if (!svg) return;
  const P = 100 / TAM, R = P * 0.34;
  let html = `<defs>
      <radialGradient id="gFicha" cx="35%" cy="30%">
        <stop offset="0%" stop-color="#D9F99D"/><stop offset="55%" stop-color="#A3E635"/><stop offset="100%" stop-color="#4D7C0F"/>
      </radialGradient>
    </defs>`;
  const destinos = seleccion ? movimientosPosibles(seleccion.r, seleccion.c) : [];
  for (let r = 0; r < TAM; r++) {
    for (let c = 0; c < TAM; c++) {
      if (tablero[r][c] === -1) continue;
      const cx = P * c + P / 2, cy = P * r + P / 2;
      const esDestino = destinos.some(d => d.tr === r && d.tc === c);
      if (tablero[r][c] === 0) {
        html += `<circle class="hueco${esDestino ? ' destino' : ''}" cx="${cx}" cy="${cy}" r="${R*0.8}" data-r="${r}" data-c="${c}"><title>Casillero ${r+1}-${c+1}</title></circle>`;
      } else {
        const sel = seleccion && seleccion.r === r && seleccion.c === c;
        html += `<circle class="ficha${sel ? ' sel' : ''}" cx="${cx}" cy="${cy}" r="${R}" data-r="${r}" data-c="${c}"><title>Ficha ${r+1}-${c+1}</title></circle>`;
      }
    }
  }
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = html;
  document.getElementById('mov').textContent = movimientos;
  document.getElementById('fichas').textContent = fichasRestantes();
  document.getElementById('btn-deshacer').disabled = historial.length === 0;
}

function clickTablero(e) {
  const el = e.target.closest('circle');
  if (!el) return;
  const r = +el.dataset.r, c = +el.dataset.c;

  if (tablero[r][c] === 1) {
    seleccion = (seleccion && seleccion.r === r && seleccion.c === c) ? null : { r, c };
    dibujarTablero();
    return;
  }
  if (tablero[r][c] === 0 && seleccion) {
    const mv = movimientosPosibles(seleccion.r, seleccion.c).find(d => d.tr === r && d.tc === c);
    if (!mv) { seleccion = null; dibujarTablero(); return; }
    historial.push({ from: { ...seleccion }, mv });
    tablero[seleccion.r][seleccion.c] = 0;
    tablero[mv.mr][mv.mc] = 0;
    tablero[r][c] = 1;
    movimientos++;
    seleccion = null;
    if (!t0) arrancarReloj();
    dibujarTablero();
    const nueva = document.querySelector(`#tablero .ficha[data-r="${r}"][data-c="${c}"]`);
    if (nueva) { nueva.classList.add('salta'); setTimeout(() => nueva.classList.remove('salta'), 340); }
    revisarFin();
  }
}

function deshacer() {
  const u = historial.pop();
  if (!u) return;
  tablero[u.from.r][u.from.c] = 1;
  tablero[u.mv.mr][u.mv.mc] = 1;
  tablero[u.mv.tr][u.mv.tc] = 0;
  movimientos = Math.max(0, movimientos - 1);
  seleccion = null;
  dibujarTablero();
}

function revisarFin() {
  const n = fichasRestantes();
  if (n === 1) {
    detenerReloj();
    const centro = tablero[3][3] === 1;
    mostrarFin(centro ? '¡Partida perfecta!' : '¡Ganaste!',
      centro ? `Te quedó una sola ficha y justo en el centro, en ${movimientos} movimientos.`
             : `Te quedó una sola ficha en ${movimientos} movimientos. La perfecta es dejarla en el centro.`);
  } else if (!hayMovimientos()) {
    detenerReloj();
    mostrarFin('Sin movimientos', `Te quedaron ${n} fichas. Probá deshacer o empezar de nuevo.`);
  }
}

function mostrarFin(titulo, texto) {
  const caja = document.getElementById('fin');
  document.getElementById('fin-titulo').textContent = titulo;
  document.getElementById('fin-texto').textContent = texto;
  caja.hidden = false;
  caja.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function arrancarReloj() {
  t0 = Date.now();
  tickTimer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    document.getElementById('reloj').textContent =
      String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }, 500);
}
function detenerReloj() { clearInterval(tickTimer); }

function reiniciar() {
  detenerReloj(); t0 = null;
  document.getElementById('reloj').textContent = '00:00';
  document.getElementById('fin').hidden = true;
  nuevoTablero();
  dibujarTablero();
}

/* ---------------------------------------------------------
   2. RESEÑAS — hilo de comentarios (patrón de tienda de apps)
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
   3. Arranque
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

  /* Tablero */
  nuevoTablero();
  dibujarTablero();
  document.getElementById('tablero').addEventListener('click', clickTablero);
  document.getElementById('btn-reiniciar').addEventListener('click', reiniciar);
  document.getElementById('btn-deshacer').addEventListener('click', deshacer);
  document.getElementById('btn-otra').addEventListener('click', reiniciar);

  /* Guardar partida (único guardar de la página) */
  document.getElementById('btn-guardar').addEventListener('click', () => {
    toast('Partida guardada · movimiento ' + movimientos);
  });

  /* Compartí tu récord — dentro del juego */
  document.getElementById('copiar-link').addEventListener('click', async () => {
    const txt = `Jugué a ${juegoActual.titulo} en frib y voy ${movimientos} movimientos. ${location.href}`;
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
