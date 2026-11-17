/* =========================================================
   frib · peg.js — Ejercicio Entregable Nº4
   ---------------------------------------------------------
   Peg Solitaire sobre canvas, con el esquema que da el Tema 4:

     · POO        una clase Ficha y una clase Tablero. Cada ficha
                  sabe dibujarse y sabe si un punto cae adentro.
     · FORMAS     el tablero es una imagen de fondo y las fichas
                  son imágenes (nunca color sólido).
     · EVENTOS    mousedown / mousemove / mouseup sobre el canvas.
                  No se usa la API de drag & drop del HTML porque
                  las fichas no son elementos del DOM: viven
                  dibujadas adentro del canvas.
     · CURSOR     la posición se saca de clientX/clientY menos
                  getBoundingClientRect(), NO de offsetX/offsetY,
                  que están en camino a deprecarse.

   EL CICLO DE CADA CUADRO ES SIEMPRE EL MISMO
     1. fondo (la imagen del tablero)
     2. los hints animados, si hay una ficha levantada
     3. las fichas apoyadas
     4. la ficha que se está arrastrando, última para que quede
        por encima de todas
   ========================================================= */
'use strict';

/* =========================================================
   0. DATOS Y MEDIDAS
   ========================================================= */

/* El tablero inglés: una cruz de 7×7 con 33 casillas.
   true = hay casilla, false = está fuera del tablero. */
const LADO  = 7;
const CELDA = 100;                 // lado de una casilla, en píxeles del canvas
const TAM   = LADO * CELDA;        // 700 × 700, entra completo en Full HD
const RADIO = 38;                  // radio de la ficha dibujada
const LIMITE = 300;                // segundos máximos de la partida

/* Las tres clases de ficha del punto 9. Son imágenes, no colores. */
const TIPOS = [
  { archivo: 'img/peg/gema-violeta.webp', nombre: 'Amatista' },
  { archivo: 'img/peg/gema-lima.webp',    nombre: 'Peridoto' },
  { archivo: 'img/peg/gema-cian.webp',    nombre: 'Aguamarina' },
];
const FONDO = 'img/peg/tablero.webp';

/* Las cuatro direcciones del salto: arriba, abajo, izquierda, derecha.
   Nunca en diagonal, que es la regla del juego. */
const DIRECCIONES = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/* ¿La casilla (fil, col) existe dentro de la cruz? */
function hayCasilla(fil, col) {
  if (fil < 0 || col < 0 || fil >= LADO || col >= LADO) return false;
  return (fil >= 2 && fil <= 4) || (col >= 2 && col <= 4);
}


/* =========================================================
   1. LIENZO E IMÁGENES
   ========================================================= */
const canvas = document.getElementById('peg');
const ctx    = canvas.getContext('2d');

/* Las imágenes se cargan una sola vez antes de empezar. Cargarlas es
   asincrónico, así que el juego no arranca hasta que están todas. */
const imagenes = {};

function cargarImagenes(rutas) {
  return Promise.all(rutas.map(ruta => new Promise((listo, falla) => {
    const img = new Image();
    img.onload  = () => { imagenes[ruta] = img; listo(); };
    img.onerror = () => falla(new Error('No se pudo cargar ' + ruta));
    img.src = ruta;
  })));
}


/* =========================================================
   2. CLASE Ficha — una gema del tablero
   ---------------------------------------------------------
   Guarda DOS posiciones distintas, y esa es la clave del
   arrastre:
     fil / col  →  dónde está en la lógica del juego
     x / y      →  dónde se está dibujando ahora mismo
   Mientras se arrastra, x e y siguen al mouse y fil/col no se
   tocan. Recién al soltar, si el movimiento es válido, fil/col
   cambian y x/y vuelven a quedar alineados.
   ========================================================= */
class Ficha {
  constructor(fil, col, tipo) {
    this.fil = fil;
    this.col = col;
    this.tipo = tipo;              // índice dentro de TIPOS
    this.arrastrando = false;
    this.volviendo = false;        // está animando la vuelta a su casilla
    this.acomodar();               // x / y arrancan en el centro de su casilla
  }

  /* El centro de la casilla que le toca, en píxeles del canvas. */
  get centroX() { return (this.col + 0.5) * CELDA; }
  get centroY() { return (this.fil + 0.5) * CELDA; }

  /* Deja la ficha calzada en su casilla. */
  acomodar() {
    this.x = this.centroX;
    this.y = this.centroY;
  }

  /* ¿El punto (px, py) cae adentro de la ficha?
     Se compara la distancia al centro con el radio, sin sacar la
     raíz cuadrada: comparar los cuadrados da lo mismo y es más barato. */
  contiene(px, py) {
    const dx = px - this.x, dy = py - this.y;
    return dx * dx + dy * dy <= RADIO * RADIO;
  }

  /* Acerca la ficha a su casilla un 25% por cuadro. Devuelve true
     mientras todavía le falte, igual que la animación de BLOCKA. */
  animarVuelta() {
    const fx = this.centroX - this.x, fy = this.centroY - this.y;
    if (Math.abs(fx) < 0.5 && Math.abs(fy) < 0.5) {
      this.acomodar();
      this.volviendo = false;
      return false;
    }
    this.x += fx * 0.25;
    this.y += fy * 0.25;
    return true;
  }

  /* Se dibuja a sí misma. La ficha levantada va un poco más grande
     y con una sombra, para que se note cuál tenés agarrada. */
  dibujar(ctx) {
    const img = imagenes[TIPOS[this.tipo].archivo];
    const r = this.arrastrando ? RADIO * 1.16 : RADIO;

    if (this.arrastrando) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.55)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
    }
    ctx.drawImage(img, this.x - r, this.y - r, r * 2, r * 2);
    if (this.arrastrando) ctx.restore();
  }
}


/* =========================================================
   3. CLASE Tablero — las casillas, las fichas y las reglas
   ========================================================= */
class Tablero {
  constructor() {
    this.fichas = [];
    this.armar();
  }

  /* Posición inicial: todas las casillas con ficha menos el centro.
     El tipo de gema sale de (fil + col) % 3, así el patrón queda
     parejo y no librado al azar. */
  armar() {
    this.fichas = [];
    for (let fil = 0; fil < LADO; fil++) {
      for (let col = 0; col < LADO; col++) {
        if (!hayCasilla(fil, col)) continue;
        if (fil === 3 && col === 3) continue;          // el hueco del centro
        this.fichas.push(new Ficha(fil, col, (fil + col) % TIPOS.length));
      }
    }
  }

  /* La ficha que ocupa esa casilla, o undefined si está libre. */
  fichaEn(fil, col) {
    return this.fichas.find(f => f.fil === fil && f.col === col);
  }

  /* Los saltos válidos de una ficha. La regla del Peg Solitaire:
     saltar por encima de una ficha vecina y caer en el hueco de
     atrás, en línea recta. Devuelve a dónde cae y a quién se come. */
  saltos(ficha) {
    const validos = [];
    for (const [df, dc] of DIRECCIONES) {
      const comeF = ficha.fil + df,     comeC = ficha.col + dc;       // la vecina
      const destF = ficha.fil + df * 2, destC = ficha.col + dc * 2;   // el hueco

      if (!hayCasilla(destF, destC)) continue;        // cae fuera de la cruz
      if (!this.fichaEn(comeF, comeC)) continue;      // no hay a quién saltar
      if (this.fichaEn(destF, destC)) continue;       // el destino está ocupado

      validos.push({ fil: destF, col: destC, comeF, comeC });
    }
    return validos;
  }

  /* ¿Queda algún movimiento posible en todo el tablero?
     Se revisa después de CADA movimiento, como pide el punto 5. */
  hayMovimientos() {
    return this.fichas.some(f => this.saltos(f).length > 0);
  }

  /* Ejecuta el salto: la ficha cambia de casilla y la saltada se va. */
  mover(ficha, salto) {
    const comida = this.fichaEn(salto.comeF, salto.comeC);
    this.fichas = this.fichas.filter(f => f !== comida);
    ficha.fil = salto.fil;
    ficha.col = salto.col;
    ficha.acomodar();
    return comida;
  }
}


/* =========================================================
   4. CLASE Juego — estado, eventos, reloj y dibujo
   ========================================================= */
class Juego {
  constructor() {
    this.tablero   = new Tablero();
    this.agarrada  = null;     // la ficha que se está arrastrando
    this.hints     = [];       // los destinos válidos de esa ficha
    this.dx = this.dy = 0;     // dónde la agarró el mouse, respecto del centro
    this.movimientos = 0;
    this.inicio = 0;
    this.cron = null;
    this.jugando = false;
    this.animando = false;
    this.volviendo = [];       // fichas animando la vuelta a su casilla
  }

  /* ---------- arranque y reinicio (punto 7) ---------- */

  preparar() {
    clearInterval(this.cron);
    this.tablero.armar();
    this.agarrada = null;
    this.hints = [];
    this.volviendo = [];
    this.movimientos = 0;
    this.jugando = false;
    $fin.hidden = true;
    $fin.classList.remove('fin--gano', 'fin--perdido');
    canvas.classList.remove('peg--activo');
    $arranque.hidden = false;
    $btnComenzar.disabled = false;
    $btnReiniciar.disabled = true;
    this.pintarHud();
    this.dibujar();
  }

  comenzar() {
    this.jugando = true;
    this.inicio = Date.now();
    this.cron = setInterval(() => this.tic(), 200);
    $arranque.hidden = true;
    canvas.classList.add('peg--activo');
    $btnComenzar.disabled = true;
    $btnReiniciar.disabled = false;
  }

  reiniciar() { this.preparar(); }

  /* El reloj mide el tiempo real transcurrido en vez de contar ticks,
     así no se atrasa si el navegador se traba. */
  tic() {
    const seg = Math.floor((Date.now() - this.inicio) / 1000);
    $reloj.textContent = mmss(seg);
    if (seg >= LIMITE) this.terminar(false, 'Se acabó el tiempo');
  }

  /* ---------- eventos del mouse (Tema 4) ---------- */

  /* Pasa la posición del puntero a coordenadas del canvas. El canvas
     mide 700 por dentro pero el CSS puede mostrarlo más chico, así que
     hay que escalar: si no, los clics caen corridos. */
  posicion(evento) {
    const caja = canvas.getBoundingClientRect();
    return {
      x: (evento.clientX - caja.left) * (canvas.width  / caja.width),
      y: (evento.clientY - caja.top)  * (canvas.height / caja.height),
    };
  }

  /* MOUSEDOWN · encontrar la figura, darle feedback y calcular los hints */
  alApretar(evento) {
    if (!this.jugando) return;
    const { x, y } = this.posicion(evento);

    /* De atrás para adelante: si dos se superpusieran, gana la de arriba. */
    for (let i = this.tablero.fichas.length - 1; i >= 0; i--) {
      const f = this.tablero.fichas[i];
      if (!f.contiene(x, y)) continue;

      this.agarrada = f;
      f.arrastrando = true;
      f.volviendo = false;
      this.dx = x - f.x;          // para que no salte al centro del cursor
      this.dy = y - f.y;
      this.hints = this.tablero.saltos(f);
      this.encenderBucle();
      return;
    }
  }

  /* MOUSEMOVE · la ficha sigue al mouse; sin ficha agarrada solo
     cambia el cursor cuando pasa por encima de una. */
  alMover(evento) {
    const { x, y } = this.posicion(evento);

    if (!this.agarrada) {
      if (!this.jugando) return;
      const encima = this.tablero.fichas.some(f => f.contiene(x, y));
      canvas.style.cursor = encima ? 'grab' : 'default';
      return;
    }
    canvas.style.cursor = 'grabbing';
    this.agarrada.x = x - this.dx;
    this.agarrada.y = y - this.dy;
  }

  /* MOUSEUP · decidir. Se busca el hint más cercano al centro de la
     ficha; si lo soltaste lejos de todos, vuelve sola a su casilla. */
  alSoltar() {
    const f = this.agarrada;
    if (!f) return;

    f.arrastrando = false;
    this.agarrada = null;
    canvas.style.cursor = 'grab';

    let elegido = null, mejor = CELDA * 0.62;      // tolerancia del soltado
    for (const h of this.hints) {
      const cx = (h.col + 0.5) * CELDA, cy = (h.fil + 0.5) * CELDA;
      const d = Math.hypot(f.x - cx, f.y - cy);
      if (d < mejor) { mejor = d; elegido = h; }
    }
    this.hints = [];

    if (!elegido) {                 // movimiento inválido: la ficha vuelve
      f.volviendo = true;
      this.volviendo.push(f);
      this.encenderBucle();
      toast('Ahí no se puede: hay que saltar por encima de una ficha');
      return;
    }

    const comida = this.tablero.mover(f, elegido);
    this.movimientos++;
    this.pintarHud();
    toast(`${TIPOS[comida.tipo].nombre} fuera · quedan ${this.tablero.fichas.length}`);
    this.dibujar();
    this.revisarFinal();            // punto 5: se revisa tras CADA movimiento
  }

  /* ---------- final de la partida (punto 5) ---------- */

  revisarFinal() {
    if (this.tablero.hayMovimientos()) return;

    const quedan = this.tablero.fichas.length;
    if (quedan === 1) {
      const ultima = this.tablero.fichas[0];
      const enElCentro = ultima.fil === 3 && ultima.col === 3;
      this.terminar(true, enElCentro ? '¡Perfecta!' : '¡Resuelto!');
    } else {
      this.terminar(false, 'No quedan movimientos');
    }
  }

  terminar(gano, titulo) {
    clearInterval(this.cron);
    this.jugando = false;
    this.agarrada = null;
    this.hints = [];
    canvas.classList.remove('peg--activo');
    $btnReiniciar.disabled = false;

    const seg = Math.floor((Date.now() - this.inicio) / 1000);
    const quedan = this.tablero.fichas.length;

    $finTitulo.textContent = titulo;
    $finTexto.innerHTML =
      `Terminaste con <b>${quedan} ${quedan === 1 ? 'gema' : 'gemas'}</b> ` +
      `en ${this.movimientos} movimientos y ${mmss(seg)}.<br>` +
      (gano ? 'Dejar una sola es el objetivo del juego.'
            : 'Ninguna gema puede saltar sobre otra. Probá de nuevo.');
    $fin.classList.add(gano ? 'fin--gano' : 'fin--perdido');
    $fin.hidden = false;
    $btnOtra.focus();
    this.dibujar();
  }

  /* ---------- dibujo ---------- */

  /* Un cuadro completo, siempre en el mismo orden. */
  dibujar() {
    ctx.clearRect(0, 0, TAM, TAM);
    ctx.drawImage(imagenes[FONDO], 0, 0, TAM, TAM);

    /* Los anillos van DEBAJO de las fichas (uno marca un hueco vacío y
       el otro rodea a la gema que se come), pero las flechas van ENCIMA:
       si no, la gema saltada las tapa justo en el medio del recorrido. */
    if (this.hints.length) this.dibujarHints();

    for (const f of this.tablero.fichas) if (!f.arrastrando) f.dibujar(ctx);

    if (this.hints.length) this.dibujarFlechas();
    if (this.agarrada) this.agarrada.dibujar(ctx);   // la levantada, arriba de todo
  }

  /* HINTS ANIMADOS (punto 3, obligatorio).
     En cada destino válido late un anillo lima, y una flecha punteada
     sale desde la ficha levantada hacia ese destino pasando por encima
     de la gema que se va a comer, que queda marcada en rojo. */
  dibujarHints() {
    const f = this.agarrada;
    if (!f) return;

    /* El latido sale del reloj, no de un contador: así late al mismo
       ritmo aunque se pierda algún cuadro. */
    const latido = (Math.sin(Date.now() / 260) + 1) / 2;   // 0 … 1

    for (const h of this.hints) {
      const dxc = (h.col + 0.5) * CELDA, dyc = (h.fil + 0.5) * CELDA;
      const cxc = (h.comeC + 0.5) * CELDA, cyc = (h.comeF + 0.5) * CELDA;

      /* la gema que se come, marcada */
      ctx.save();
      ctx.strokeStyle = 'rgba(244,63,94,.85)';
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(cxc, cyc, RADIO + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      /* anillo que late sobre el hueco destino */
      ctx.save();
      ctx.strokeStyle = `rgba(163,230,53,${0.45 + latido * 0.55})`;
      ctx.lineWidth = 3 + latido * 3;
      ctx.beginPath();
      ctx.arc(dxc, dyc, RADIO * (0.72 + latido * 0.30), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(163,230,53,${0.10 + latido * 0.12})`;
      ctx.fill();
      ctx.restore();
    }
  }

  /* La flecha de cada hint, desde la casilla de origen hasta el hueco
     destino. Se dibuja aparte y después de las fichas para que se vea
     por encima de la gema que queda en el camino. */
  dibujarFlechas() {
    const f = this.agarrada;
    if (!f) return;
    for (const h of this.hints) {
      flecha(ctx, f.centroX, f.centroY,
             (h.col + 0.5) * CELDA, (h.fil + 0.5) * CELDA);
    }
  }

  /* El bucle solo corre mientras algo se mueve: mientras arrastrás
     (los hints laten) o mientras una ficha vuelve a su lugar. Cuando
     no queda nada moviéndose, se apaga solo. */
  encenderBucle() {
    if (this.animando) return;
    this.animando = true;

    const paso = () => {
      this.volviendo = this.volviendo.filter(f => f.animarVuelta());
      this.dibujar();

      if (this.agarrada || this.volviendo.length) requestAnimationFrame(paso);
      else this.animando = false;
    };
    requestAnimationFrame(paso);
  }

  pintarHud() {
    $hudFichas.textContent = this.tablero.fichas.length;
    $hudMov.textContent = this.movimientos;
    if (!this.jugando) $reloj.textContent = '00:00';
  }
}


/* =========================================================
   5. ATAJOS Y AYUDANTES
   ========================================================= */
const $arranque     = document.getElementById('peg-arranque');
const $fin          = document.getElementById('peg-fin');
const $finTitulo    = document.getElementById('peg-fin-titulo');
const $finTexto     = document.getElementById('peg-fin-texto');
const $btnOtra      = document.getElementById('btn-otra');
const $btnComenzar  = document.getElementById('btn-comenzar');
const $btnReiniciar = document.getElementById('btn-reiniciar');
const $btnArrancar  = document.getElementById('btn-arrancar');
const $reloj        = document.getElementById('hud-reloj');
const $hudFichas    = document.getElementById('hud-fichas');
const $hudMov       = document.getElementById('hud-movimientos');

function mmss(seg) {
  const m = Math.floor(seg / 60), s = seg % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/* Flecha punteada de (x1,y1) a (x2,y2), cortada antes de llegar para
   que la punta no se meta adentro del anillo del destino. */
function flecha(ctx, x1, y1, x2, y2) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const desde = { x: x1 + Math.cos(ang) * (RADIO + 6), y: y1 + Math.sin(ang) * (RADIO + 6) };
  const hasta = { x: x2 - Math.cos(ang) * (RADIO + 2), y: y2 - Math.sin(ang) * (RADIO + 2) };

  ctx.save();
  ctx.strokeStyle = '#A3E635';
  ctx.fillStyle = '#A3E635';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  /* un halo oscuro atrás para que la flecha se lea sobre cualquier gema */
  ctx.shadowColor = 'rgba(6,15,71,.95)';
  ctx.shadowBlur = 6;

  ctx.setLineDash([9, 8]);
  ctx.beginPath();
  ctx.moveTo(desde.x, desde.y);
  ctx.lineTo(hasta.x, hasta.y);
  ctx.stroke();

  ctx.setLineDash([]);
  const p = 13;
  ctx.beginPath();
  ctx.moveTo(hasta.x, hasta.y);
  ctx.lineTo(hasta.x - Math.cos(ang - 0.4) * p, hasta.y - Math.sin(ang - 0.4) * p);
  ctx.lineTo(hasta.x - Math.cos(ang + 0.4) * p, hasta.y - Math.sin(ang + 0.4) * p);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* Las tres clases de gema, para la sección "Sobre el juego" (punto 8). */
function pintarTipos() {
  const ul = document.getElementById('tipos-ficha');
  if (!ul) return;
  ul.innerHTML = TIPOS.map(t => `
    <li class="banco__item">
      <img src="${t.archivo}" alt="Gema ${t.nombre}" width="120" height="120" loading="lazy">
      <span>${t.nombre}</span>
    </li>`).join('');
}


/* =========================================================
   6. ARRANQUE
   ========================================================= */
const juegoActual = JUEGOS.find(j => j.slug === 'peg-solitaire');

document.addEventListener('DOMContentLoaded', async () => {
  /* Datos del juego en la cabecera, igual que en la página de BLOCKA:
     es la misma plantilla. */
  document.getElementById('juego-titulo').textContent = juegoActual.titulo;
  document.getElementById('miga-cat').textContent = juegoActual.categoria;
  document.getElementById('miga-juego').textContent = juegoActual.titulo;
  document.getElementById('juego-estrellas').innerHTML = estrellas(juegoActual.nota);
  document.getElementById('juego-nota').textContent =
    `${juegoActual.nota.toFixed(1)} (${juegoActual.resenias} reseñas)`;
  document.getElementById('juego-desc').textContent = juegoActual.desc;

  pintarTipos();
  initResenias();        // el hilo de comentarios, que es de la plantilla

  document.getElementById('copiar-link').addEventListener('click', async () => {
    const txt = `Jugué a ${juegoActual.titulo} en frib. ${location.href}`;
    try { await navigator.clipboard.writeText(txt); toast('¡Link copiado!'); }
    catch { toast('Copiá el link desde la barra del navegador'); }
  });

  /* Hasta que no estén las imágenes no hay nada que dibujar. */
  try {
    await cargarImagenes([FONDO, ...TIPOS.map(t => t.archivo)]);
  } catch (e) {
    toast('No se pudieron cargar las imágenes del tablero');
    return;
  }

  const juego = new Juego();
  juego.preparar();

  /* Los tres eventos del Tema 4. El mouseleave se trata como un
     mouseup: si sacás el mouse del canvas con una ficha agarrada,
     la ficha se suelta en vez de quedar pegada al puntero. */
  canvas.addEventListener('mousedown', (e) => juego.alApretar(e));
  canvas.addEventListener('mousemove', (e) => juego.alMover(e));
  canvas.addEventListener('mouseup',   () => juego.alSoltar());
  canvas.addEventListener('mouseleave',() => juego.alSoltar());

  $btnArrancar.addEventListener('click',  () => juego.comenzar());
  $btnComenzar.addEventListener('click',  () => juego.comenzar());
  $btnReiniciar.addEventListener('click', () => juego.reiniciar());
  $btnOtra.addEventListener('click',      () => { juego.preparar(); juego.comenzar(); });

  window.peg = juego;    // queda a mano para probar desde la consola
});
