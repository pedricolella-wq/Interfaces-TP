/* =========================================================
   frib · home.js — hero animado, filas/carruseles y fila con datos de la API
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   1. HERO: carrusel con transición animada (fade + Ken Burns + texto escalonado)
   --------------------------------------------------------- */
function initHero(slides) {
  const marco    = document.getElementById('hero-slides');
  const bullets  = document.getElementById('hero-bullets');
  const progreso = document.getElementById('hero-progreso');
  const btnPrev  = document.getElementById('hero-prev');
  const btnNext  = document.getElementById('hero-next');
  if (!marco) return;

  marco.innerHTML = slides.map((s, i) => `
    <article class="hero__slide${i === 0 ? ' activo' : ''}" aria-hidden="${i !== 0}">
      <img src="${s.img}" alt="${s.titulo}" ${i === 0 ? '' : 'loading="lazy"'} width="1760" height="720">
      <div class="hero__velo"></div>
      <div class="hero__texto">
        <span class="hero__etiqueta">${s.etiqueta}</span>
        <h2 class="hero__titulo">${s.titulo}</h2>
        <p class="hero__bajada">${s.bajada}</p>
        <div class="hero__acciones">
          <a class="btn btn--primario" href="juego.html?j=${s.slug}">${s.cta}</a>
          <a class="btn btn--terciario" href="juego.html?j=${s.slug}#como-se-juega">${s.cta2}</a>
        </div>
      </div>
    </article>`).join('');

  bullets.innerHTML = slides.map((s, i) =>
    `<button type="button" aria-current="${i === 0}" aria-label="Ir al destacado ${i + 1}: ${s.titulo}"></button>`).join('');

  const items = Array.from(marco.children);
  const puntos = Array.from(bullets.children);
  let actual = 0, timer = null;
  const DURACION = 6000;

  function ir(i) {
    i = (i + items.length) % items.length;
    if (i === actual) return;
    items[actual].classList.remove('activo');
    items[actual].setAttribute('aria-hidden', 'true');
    puntos[actual].setAttribute('aria-current', 'false');
    actual = i;
    items[actual].classList.add('activo');
    items[actual].setAttribute('aria-hidden', 'false');
    puntos[actual].setAttribute('aria-current', 'true');
    reiniciarProgreso();
  }
  function reiniciarProgreso() {
    if (!progreso) return;
    progreso.classList.remove('corriendo');
    void progreso.offsetWidth;
    progreso.classList.add('corriendo');
  }
  function arrancar() { detener(); timer = setInterval(() => ir(actual + 1), DURACION); reiniciarProgreso(); }
  function detener()  { clearInterval(timer); }

  btnPrev.addEventListener('click', () => { ir(actual - 1); arrancar(); });
  btnNext.addEventListener('click', () => { ir(actual + 1); arrancar(); });
  puntos.forEach((p, i) => p.addEventListener('click', () => { ir(i); arrancar(); }));
  marco.addEventListener('mouseenter', detener);
  marco.addEventListener('mouseleave', arrancar);
  marco.addEventListener('focusin', detener);
  marco.addEventListener('focusout', arrancar);

  /* Deslizar con el dedo en mobile */
  let x0 = null;
  marco.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; detener(); }, { passive: true });
  marco.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) ir(actual + (dx < 0 ? 1 : -1));
    x0 = null; arrancar();
  });

  arrancar();
}

/* ---------------------------------------------------------
   2. FILAS de juegos (carrusel horizontal con flechas y bullets)
   --------------------------------------------------------- */
function pintarFila(cfg) {
  const cont = document.getElementById('filas');
  const juegos = cfg.juegos;
  const sec = document.createElement('section');
  sec.className = 'fila reveal';
  sec.id = 'fila-' + cfg.id;
  sec.innerHTML = `
    <div class="fila__encabezado">
      <h2 class="fila__titulo">${cfg.titulo}</h2>
      <a class="fila__vertodos" href="#fila-${cfg.id}">Ver todos</a>
    </div>
    ${cfg.nota ? `<p class="aviso-api">${cfg.nota}</p>` : ''}
    <div class="fila__marco">
      <button class="btn-icono fila__flecha fila__flecha--izq" type="button" aria-label="Anterior en ${cfg.titulo}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>
      </button>
      <div class="fila__pista" tabindex="0" role="list" aria-label="${cfg.titulo}">
        ${juegos.map(j => `<div role="listitem">${cardHTML(j)}</div>`).join('')}
      </div>
      <button class="btn-icono fila__flecha fila__flecha--der" type="button" aria-label="Siguiente en ${cfg.titulo}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
    <div class="fila__bullets" aria-hidden="true"></div>`;
  cont.appendChild(sec);
  activarCarrusel(sec);
  if (typeof initReveal === 'function') initReveal();
  return sec;
}

function activarCarrusel(sec) {
  const pista = sec.querySelector('.fila__pista');
  const izq = sec.querySelector('.fila__flecha--izq');
  const der = sec.querySelector('.fila__flecha--der');
  const bullets = sec.querySelector('.fila__bullets');
  const paso = () => pista.clientWidth * 0.8;

  izq.addEventListener('click', () => pista.scrollBy({ left: -paso(), behavior: 'smooth' }));
  der.addEventListener('click', () => pista.scrollBy({ left:  paso(), behavior: 'smooth' }));

  const items = Array.from(pista.children);
  bullets.innerHTML = items.map((_, i) => `<button type="button" aria-current="${i === 0}" tabindex="-1"></button>`).join('');
  const puntos = Array.from(bullets.children);
  puntos.forEach((p, i) => p.addEventListener('click', () => items[i].scrollIntoView({ behavior:'smooth', inline:'start', block:'nearest' })));

  const actualizar = () => {
    const max = pista.scrollWidth - pista.clientWidth;
    izq.disabled = pista.scrollLeft <= 2;
    der.disabled = pista.scrollLeft >= max - 2;
    const idx = Math.round(pista.scrollLeft / Math.max(1, pista.scrollWidth / items.length));
    puntos.forEach((p, i) => p.setAttribute('aria-current', String(i === Math.min(idx, items.length - 1))));
  };
  pista.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
  setTimeout(actualizar, 60);
}

/* ---------------------------------------------------------
   3. Arranque: se dispara cuando termina el loading de 5 s
   --------------------------------------------------------- */
async function construirHome() {
  const porSlug = Object.fromEntries(JUEGOS.map(j => [j.slug, j]));

  // Pedimos la API en paralelo con el armado local
  const promesaAPI = traerJuegosAPI();

  initHero(HERO_LOCAL);
  FILAS.forEach(f => pintarFila({ id: f.id, titulo: f.titulo, juegos: f.slugs.map(s => porSlug[s]) }));

  // Fila "Novedades" con datos en vivo de la API de la cátedra
  const cont = document.getElementById('filas');
  const hueco = document.createElement('section');
  hueco.className = 'fila';
  hueco.innerHTML = `
    <div class="fila__encabezado"><h2 class="fila__titulo">Novedades</h2></div>
    <p class="aviso-api">Conectando con la API de la cátedra…</p>
    <div class="fila__pista">${'<div class="skeleton skeleton--card"></div>'.repeat(5)}</div>`;
  cont.appendChild(hueco);

  const deAPI = await promesaAPI;
  hueco.remove();
  if (deAPI.length) {
    const sel = deAPI.slice(0, 12);
    sel[0].cucarda = 'nuevo'; if (sel[3]) sel[3].cucarda = 'top';
    pintarFila({
      id: 'novedades', titulo: 'Novedades',
      nota: `Datos en vivo desde la <b>API de la cátedra</b> · ${deAPI.length} juegos recibidos`,
      juegos: sel,
    });
  } else {
    pintarFila({
      id: 'novedades', titulo: 'Novedades',
      nota: 'La <b>API de la cátedra</b> no respondió: mostramos el catálogo local de respaldo.',
      juegos: ['damas','hanoi','snake','tres-en-raya','backgammon'].map(s => porSlug[s]),
    });
  }
  initReveal();
}

document.addEventListener('frib:cargado', construirHome, { once: true });
