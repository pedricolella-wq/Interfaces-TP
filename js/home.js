/* =========================================================
   frib · home.js — hero animado, filas/carruseles y fila con datos de la API
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   1. HERO: carrusel con transición animada
   ---------------------------------------------------------
   Cómo funciona el cambio de slide:

   Los tres slides se dibujan de una y quedan APILADOS
   (position: absolute, uno encima del otro). Solo el que
   tiene la clase .activo se ve. Cambiar de slide es entonces
   sacarle .activo a uno y ponérsela a otro: el JS no anima
   nada, todo el movimiento lo hace el CSS.

   Al ponerse .activo se disparan tres cosas al mismo tiempo
   (ver animations.css, bloque E):
     · fade: transition de opacity sobre .hero__slide,
     · Ken Burns: la imagen pasa de scale(1.14) a scale(1)
       durante 7 s, como un travelling de cámara,
     · texto en cascada: etiqueta, título, bajada y botones
       usan el mismo @keyframes con animation-delay distinto
       (0.10 / 0.18 / 0.28 / 0.38 s).

   Además el carrusel se pausa al pasar el mouse o al entrar
   con el teclado (focusin), y se puede deslizar con el dedo.
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
          <button class="btn btn--primario" type="button" data-desbloquear="${s.titulo}" data-precio="${s.precio}">
            <svg class="btn__candado" viewBox="0 0 24 24" aria-hidden="true"><use href="#candado"></use></svg>
            Desbloquear · $ ${s.precio}
          </button>
          <a class="btn btn--terciario" href="juego.html?j=${s.slug}">${s.cta2}</a>
        </div>
      </div>
    </article>`).join('');

  /* Todos los juegos del carrusel grande son de pago: mismo bloque y mismo desbloqueo */
  marco.addEventListener('click', (e) => {
    const b = e.target.closest('[data-desbloquear]');
    if (!b) return;
    toast(`Desbloqueás ${b.dataset.desbloquear} por $ ${b.dataset.precio} · compra única`);
  });

  bullets.innerHTML = slides.map((s, i) =>
    `<button type="button" aria-current="${i === 0}" aria-label="Ir al destacado ${i + 1}: ${s.titulo}"></button>`).join('');

  const items = Array.from(marco.children);
  const puntos = Array.from(bullets.children);
  let actual = 0, timer = null;
  const DURACION = 6000;

  /* Cambio de slide: el JS solo saca y pone la clase .activo.
     El CSS resuelve el cruce de opacidad, el Ken Burns de la imagen y
     la entrada escalonada del texto (animations.css, bloque E).
     Se mantiene liviano a propósito: el hero ocupa toda la pantalla y
     cualquier efecto pesado acá se siente enseguida. */
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
  /* Reinicia la barra de progreso del autoplay.
     El "void progreso.offsetWidth" es el truco para REINICIAR
     una animación CSS: sacar la clase no alcanza, porque el
     navegador agrupa los cambios y no llega a notar que la
     animación se fue. Leer offsetWidth lo obliga a recalcular
     el estilo en ese instante (reflow forzado), así cuando se
     vuelve a poner la clase la animación arranca de cero. */
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

  /* Deslizar con el dedo en mobile: se guarda dónde empezó el
     toque y, si al soltar se movió más de 45px, se cambia de
     slide. El umbral evita que un toque común cuente como
     deslizamiento. passive: true le avisa al navegador que no
     voy a cancelar el scroll, y así no lo frena. */
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
   ---------------------------------------------------------
   Las filas no se escriben a mano en el HTML: se generan acá
   a partir del catálogo, así agregar un juego es tocar un
   solo archivo (data.js).

   El desplazamiento horizontal lo hace el propio navegador:
   la pista tiene overflow-x y scroll-snap (ver styles.css),
   y las flechas solo llaman a scrollBy. Por eso funciona
   igual con el dedo en mobile sin escribir nada más.
   --------------------------------------------------------- */
function pintarFila(cfg) {
  const cont = document.getElementById('filas');
  const juegos = cfg.juegos;
  const sec = document.createElement('section');
  sec.className = 'fila reveal' + (cfg.animada ? ' fila--animada' : '');
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
        ${juegos.map((j, i) => `<div role="listitem" style="--i:${i}">${cardHTML(j)}</div>`).join('')}
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

  /* Ola: en la fila animada las cards hacen una onda escalonada cada
     vez que se usa una flecha. Solo se anima transform, así que el
     navegador lo resuelve en la GPU y no recalcula el layout. */
  const ola = () => {
    if (!sec.classList.contains('fila--animada')) return;
    pista.classList.remove('ola');
    void pista.offsetWidth;                       // reinicia la animación
    pista.classList.add('ola');
    setTimeout(() => pista.classList.remove('ola'), 900);
  };
  izq.addEventListener('click', () => { pista.scrollBy({ left: -paso(), behavior: 'smooth' }); ola(); });
  der.addEventListener('click', () => { pista.scrollBy({ left:  paso(), behavior: 'smooth' }); ola(); });

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
      id: 'novedades', titulo: 'Novedades', animada: true,
      nota: `Datos en vivo desde la <b>API de la cátedra</b> · ${deAPI.length} juegos recibidos`,
      juegos: sel,
    });
  } else {
    pintarFila({
      id: 'novedades', titulo: 'Novedades', animada: true,
      nota: 'La <b>API de la cátedra</b> no respondió: mostramos el catálogo local de respaldo.',
      juegos: ['damas','hanoi','snake','tres-en-raya','backgammon'].map(s => porSlug[s]),
    });
  }
  initReveal();
}

document.addEventListener('frib:cargado', construirHome, { once: true });
