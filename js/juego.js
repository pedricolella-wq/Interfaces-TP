/* =========================================================
   frib · juego.js — Peg Solitaire jugable, galería animada y reseñas
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. Qué juego se está mostrando (?j=slug)
   --------------------------------------------------------- */
const slugActual = new URLSearchParams(location.search).get('j') || 'peg-solitaire';
const juegoActual = JUEGOS.find(j => j.slug === slugActual) || JUEGOS.find(j => j.slug === 'peg-solitaire');

/* ---------------------------------------------------------
   1. PEG SOLITAIRE — tablero inglés de 33 casilleros
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
   2. GALERÍA con transición animada (flip 3D + desenfoque)
   --------------------------------------------------------- */
const GALERIA = [
  { img: 'img/galeria/g1.jpg', pie: 'Arrancás con 32 fichas y un solo casillero libre, justo en el centro.' },
  { img: 'img/galeria/g2.jpg', pie: 'Saltás una ficha por encima de otra: la del medio se elimina.' },
  { img: 'img/galeria/g3.jpg', pie: 'En la recta final conviene no dejar fichas aisladas en los bordes.' },
  { img: 'img/galeria/g4.jpg', pie: 'Si te queda una sola ficha en el centro, la partida es perfecta.' },
];

function initGaleria() {
  const vp = document.getElementById('galeria-vp');
  const tiras = document.getElementById('galeria-tiras');
  if (!vp) return;

  vp.innerHTML = GALERIA.map((g, i) => `
    <figure class="galeria__item${i === 0 ? ' activo' : ''}" aria-hidden="${i !== 0}">
      <img src="${g.img}" alt="Captura ${i + 1} de Peg Solitaire" ${i ? 'loading="lazy"' : ''} width="1280" height="720">
      <figcaption class="galeria__pie">${g.pie}</figcaption>
    </figure>`).join('');
  tiras.innerHTML = GALERIA.map((g, i) => `
    <button type="button" aria-current="${i === 0}" aria-label="Ver captura ${i + 1}"><img src="${g.img}" alt=""></button>`).join('');

  const items = Array.from(vp.children), botones = Array.from(tiras.children);
  let i = 0, auto;

  function ir(n) {
    n = (n + items.length) % items.length;
    if (n === i) return;
    const saliendo = items[i];
    saliendo.classList.remove('activo');
    saliendo.classList.add('saliendo');
    saliendo.setAttribute('aria-hidden', 'true');
    setTimeout(() => saliendo.classList.remove('saliendo'), 480);
    botones[i].setAttribute('aria-current', 'false');
    i = n;
    items[i].classList.add('activo');
    items[i].setAttribute('aria-hidden', 'false');
    botones[i].setAttribute('aria-current', 'true');
    botones[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
  const arrancar = () => { clearInterval(auto); auto = setInterval(() => ir(i + 1), 4200); };

  botones.forEach((b, n) => b.addEventListener('click', () => { ir(n); arrancar(); }));
  document.getElementById('gal-prev').addEventListener('click', () => { ir(i - 1); arrancar(); });
  document.getElementById('gal-next').addEventListener('click', () => { ir(i + 1); arrancar(); });
  vp.addEventListener('mouseenter', () => clearInterval(auto));
  vp.addEventListener('mouseleave', arrancar);
  arrancar();
}

/* ---------------------------------------------------------
   3. RESEÑAS — paginado "Ver más" (patrón load more)
   --------------------------------------------------------- */
const TOTAL_RESENIAS = 317;
let visibles = 2;

function pintarResenias() {
  const lista = document.getElementById('lista-resenias');
  lista.innerHTML = RESENIAS.slice(0, visibles).map(r => `
    <article class="resenia">
      <header>
        <span class="avatar" aria-hidden="true">${r.quien[0]}</span>
        <span><span class="quien">${r.quien}</span> <span class="cuando">· ${r.cuando}</span></span>
      </header>
      <p>${r.texto}</p>
      ${estrellas(r.nota)}
    </article>`).join('');
  document.getElementById('contador-resenias').textContent =
    `Mostrando ${Math.min(visibles, RESENIAS.length)} de ${TOTAL_RESENIAS} reseñas`;
  document.getElementById('btn-mas').disabled = visibles >= RESENIAS.length;
}

/* ---------------------------------------------------------
   4. Arranque
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

  /* Galería y reseñas */
  initGaleria();
  pintarResenias();
  document.getElementById('btn-mas').addEventListener('click', () => { visibles += 2; pintarResenias(); });

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
    RESENIAS.unshift({ quien: 'Vos', cuando: 'recién', nota: miNota || 5, texto: t });
    visibles++; pintarResenias();
    e.target.reset(); miNota = 0;
    Array.from(puntaje.children).forEach(x => x.classList.remove('on'));
    toast('¡Gracias por tu reseña!');
  });
});
