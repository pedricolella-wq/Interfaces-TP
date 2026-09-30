/* =========================================================
   frib · ui.js — utilidades y componentes compartidos
   ========================================================= */
'use strict';

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---------- Estrellas ---------- */
function estrellas(nota) {
  const pct = Math.max(0, Math.min(100, (nota / 5) * 100));
  return `<span class="estrellas" role="img" aria-label="${nota} de 5 estrellas"><i style="--v:${pct}%"></i></span>`;
}

/* ---------- Cucardas (4 estilos distintos) ---------- */
const CUCARDAS = {
  nuevo:   { clase: 'cucarda--nuevo',   texto: 'Nuevo',   icono: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.6 6.3L21 9.3l-4.7 4.3 1.3 6.4L12 16.8 6.4 20l1.3-6.4L3 9.3l6.4-1z"/></svg>' },
  top:     { clase: 'cucarda--top',     texto: 'Top 10',  icono: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l7 9h-4v7H9v-7H5z"/></svg>' },
  gratis:  { clase: 'cucarda--gratis',  texto: 'Gratis',  icono: '' },
  premium: { clase: 'cucarda--premium', texto: 'Premium', icono: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v3H3zM3 6l4.5 4L12 4l4.5 6L21 6v9H3z"/></svg>' },
};
function cucardaHTML(tipo) {
  const c = CUCARDAS[tipo];
  if (!c) return '';
  return `<span class="cucarda ${c.clase}">${c.icono}${c.texto}</span>`;
}

/* ---------- Card de juego ---------- */
function cardHTML(j) {
  return `
  <article class="card">
    <div class="card__media">
      <img src="${j.img}" alt="Portada del juego ${j.titulo}" loading="lazy" width="880" height="554">
      ${cucardaHTML(j.cucarda)}
      <button class="card__fav" type="button" aria-pressed="false" aria-label="Agregar ${j.titulo} a favoritos">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.4-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.4 12c-1.9 4.4-9.4 9-9.4 9z"/></svg>
      </button>
      <a class="btn btn--primario btn--sm card__jugar" href="juego.html?j=${j.slug}" tabindex="-1">JUGAR</a>
    </div>
    <a class="card__body" href="juego.html?j=${j.slug}">
      <p class="card__cat">${j.categoria}</p>
      <h3 class="card__titulo">${j.titulo}</h3>
      <p class="card__meta">${estrellas(j.nota)}<span class="card__nota">${j.nota.toFixed(1)}</span></p>
    </a>
  </article>`;
}

/* ---------- Favoritos ---------- */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.card__fav');
  if (!b) return;
  e.preventDefault();
  const on = b.getAttribute('aria-pressed') === 'true';
  b.setAttribute('aria-pressed', String(!on));
  b.classList.remove('late'); void b.offsetWidth; b.classList.add('late');
  toast(on ? 'Quitado de favoritos' : '¡Guardado en favoritos!');
});

/* ---------- Toast ---------- */
let tToast;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove('visible'), 2200);
}

/* ---------- Menú hamburguesa ---------- */
function initMenu() {
  const btn = $('.hamburguesa'), menu = $('.menu-lateral'), fondo = $('.menu-fondo');
  if (!btn || !menu) return;
  const abrir = (v) => {
    btn.setAttribute('aria-expanded', String(v));
    menu.classList.toggle('abierto', v);
    menu.setAttribute('aria-hidden', String(!v));
    fondo && fondo.classList.toggle('abierto', v);
    document.body.style.overflow = v ? 'hidden' : '';
  };
  btn.addEventListener('click', () => abrir(btn.getAttribute('aria-expanded') !== 'true'));
  fondo && fondo.addEventListener('click', () => abrir(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });
  $$('a', menu).forEach(a => a.addEventListener('click', () => abrir(false)));
}

/* ---------- Aparición al hacer scroll ----------
   Patrón "reveal on scroll" con IntersectionObserver.

   Por qué un observer y no el evento scroll: el evento scroll
   se dispara decenas de veces por segundo y obliga a medir
   posiciones a mano (lo que fuerza reflows y traba el scroll).
   El IntersectionObserver lo resuelve el navegador y me avisa
   solo cuando el elemento entra en pantalla.

   El CSS deja la sección en opacity 0 y corrida 26px; acá
   solo se le agrega la clase .visible y la transition de
   animations.css (bloque I) hace la animación.

   unobserve() después de mostrar: la animación ocurre una
   sola vez, no cada vez que se sube y se baja.

   Si el navegador no soporta la API, se muestran todas de
   una (mejora progresiva: sin animación, pero nada se pierde).
   --------------------------------------------------------- */
function initReveal() {
  const items = $$('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('visible')); return; }
  const io = new IntersectionObserver((entradas) => {
    entradas.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  items.forEach(i => io.observe(i));
}

/* ---------- Buscador ---------- */
function initBuscador(catalogo) {
  const input = $('#buscador'), caja = $('#buscador-resultados');
  if (!input || !caja) return;
  const pintar = (lista) => {
    if (!lista.length) { caja.innerHTML = '<p class="buscador__vacio">Sin resultados. Probá con «truco» o «sudoku».</p>'; caja.hidden = false; return; }
    caja.innerHTML = lista.slice(0, 6).map(j => `
      <a href="juego.html?j=${j.slug}">
        <img src="${j.img}" alt="">
        <span><p>${j.titulo}</p><small class="apagado">${j.categoria}</small></span>
      </a>`).join('');
    caja.hidden = false;
  };
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { caja.hidden = true; return; }
    pintar(catalogo.filter(j => (j.titulo + ' ' + j.categoria).toLowerCase().includes(q)));
  });
  input.addEventListener('blur', () => setTimeout(() => { caja.hidden = true; }, 160));
  input.closest('form').addEventListener('submit', (e) => e.preventDefault());
}

/* ---------- Newsletter del footer ---------- */
function initNews() {
  const f = $('#form-news');
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    toast('¡Listo! Te vamos a escribir a ' + (f.querySelector('input').value || 'tu correo'));
    f.reset();
  });
}

/* ---------- Año del footer + arranque común ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $$('.anio').forEach(e => e.textContent = new Date().getFullYear());
  initMenu();
  initNews();
  initReveal();
  if (typeof JUEGOS !== 'undefined') initBuscador(JUEGOS);
});
