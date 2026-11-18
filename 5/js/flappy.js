/* =========================================================
   frib · flappy.js — Frib Vuela (Entregable Nº5)
   ---------------------------------------------------------
   Juego tipo Flappy Bird hecho sin canvas: todo son <div>.

   Este archivo hace tres cosas:
     - la física (gravedad e impulso)
     - los choques
     - las reglas (puntos, vidas, cuándo termina)

   Las animaciones NO están acá. Están en css/flappy.css con
   @keyframes. Desde acá solo se ponen y se sacan clases.
   ========================================================= */
'use strict';


/* ---------- 1. Los números del juego ---------- */
const ANCHO = 960;             // el escenario mide 960 x 540
const ALTO = 540;
const SUELO = 480;             // "y" donde empieza el piso

const VELOCIDAD = 240;         // px por segundo que avanza el mundo (igual que la capa del suelo: 1920 px en 8 s)
const GRAVEDAD = 1500;         // cuánto aumenta la caída por segundo
const IMPULSO = -430;          // velocidad al aletear (negativa = sube)

const AVATAR_X = 220;          // el avatar no se mueve de costado: se mueve el mundo
const TAM_NORMAL = 56;         // tamaño del avatar
const TAM_HINCHADO = 84;       // tamaño después de tocar un murciélago
const TIEMPO_HINCHADO = 5;     // segundos que queda hinchado

const ANCHO_COLUMNA = 96;
const HUECO_INICIAL = 230;     // alto del primer hueco
const HUECO_MINIMO = 170;      // el hueco nunca baja de acá
const ACHIQUE = 4;             // px que se achica el hueco con cada columna
const DISTANCIA_MINIMA = 300;  // separación entre una columna y la siguiente
const DISTANCIA_MAXIMA = 460;

const META = 50;               // puntos para ganar
const VIDAS = 3;
const PUNTOS_COLUMNA = 1;
const PUNTOS_GEMA = 5;


/* ---------- 2. Las cajas de la página ---------- */
const escenario = document.getElementById('vuelo');
const avatar = document.getElementById('avatar');
const avatarImg = document.getElementById('avatar-img');
const cartelInicio = document.getElementById('vuelo-arranque');
const cartelFin = document.getElementById('vuelo-fin');
const btnComenzar = document.getElementById('btn-comenzar');
const btnReiniciar = document.getElementById('btn-reiniciar');


/* ---------- 3. Las variables de la partida ---------- */
let estado = 'parado';      // 'parado', 'espera', 'jugando' o 'choque'
let avatarY = 220;          // altura del avatar
let velocidadY = 0;         // velocidad con la que sube o baja
let hinchado = 0;           // segundos que le quedan hinchado (0 = normal)
let puntos = 0;
let vidas = VIDAS;
let tiempo = 0;             // segundos de vuelo
let columnas = [];          // cada una: { x, desde, hasta, contada, caja }
let elementos = [];         // cada uno: { tipo, x, y, ancho, alto, tocado, caja }
let creadas = 0;            // cuántas columnas se crearon (para achicar el hueco)
let falta = 0;              // px que faltan para que aparezca la próxima columna
let centroAnterior = 240;   // altura del hueco de la columna anterior
let anterior = 0;           // hora del cuadro anterior
let espera = 0;             // el setTimeout de después del choque


/* ---------- 4. Funciones de ayuda ---------- */

/* Devuelve un número al azar entre min y max. */
function azar(min, max) {
  return min + Math.random() * (max - min);
}

/* Pasa segundos a texto "mm:ss" para el reloj. */
function mmss(segundos) {
  const s = Math.floor(segundos);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

/* ¿Se pisan dos rectángulos? Cada uno es { x, y, ancho, alto }.
   Se pisan si ninguno queda del todo a un costado, arriba o abajo del otro. */
function seTocan(a, b) {
  return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
         a.y < b.y + b.alto  && a.y + a.alto  > b.y;
}

/* Tamaño del avatar: más grande mientras está hinchado. */
function tamanio() {
  return hinchado > 0 ? TAM_HINCHADO : TAM_NORMAL;
}

/* Rectángulo de choque del avatar. Se le sacan 8 px de cada lado
   para que el choque sea un poco más justo que el dibujo. */
function cajaAvatar() {
  const t = tamanio();
  return { x: AVATAR_X + 8, y: avatarY + 8, ancho: t - 16, alto: t - 16 };
}

/* Cambia la animación del avatar: 'planea', 'aletea', 'festeja' o 'explota'.
   Primero se saca la clase y se lee offsetWidth: eso obliga al navegador
   a recalcular, y así la animación arranca de cero aunque sea la misma. */
function animar(clase) {
  avatarImg.className = '';
  void avatarImg.offsetWidth;
  avatarImg.className = clase;
}

/* Lleva la posición y el tamaño del avatar a la pantalla. */
function dibujarAvatar() {
  avatar.style.left = AVATAR_X + 'px';
  avatar.style.top = avatarY + 'px';
  avatar.classList.toggle('avatar--hinchado', hinchado > 0);
}

/* Escribe los puntos, las vidas y el tiempo en la barra de arriba. */
function pintarMarcador() {
  document.getElementById('hud-puntos').textContent = puntos + ' / ' + META;
  document.getElementById('hud-vidas').textContent = '♥'.repeat(vidas) + '♡'.repeat(VIDAS - vidas);
  document.getElementById('hud-reloj').textContent = mmss(tiempo);
}


/* ---------- 5. La partida ---------- */

/* Empieza una partida desde cero. */
function comenzar() {
  clearTimeout(espera);
  puntos = 0;
  vidas = VIDAS;
  tiempo = 0;
  creadas = 0;
  cartelInicio.hidden = true;
  cartelFin.hidden = true;
  btnComenzar.disabled = true;
  btnReiniciar.disabled = false;
  document.activeElement.blur();   // si no, la barra espaciadora volvería a apretar el botón
  esperar();
}

/* El avatar queda planeando en su lugar hasta que el jugador dé un impulso.
   Se usa al empezar y después de cada choque. */
function esperar() {
  limpiar();
  estado = 'espera';
  avatarY = 220;
  velocidadY = 0;
  hinchado = 0;
  escenario.classList.remove('vuelo--andando');   // el parallax queda en pausa
  escenario.classList.add('vuelo--espera');       // se ve el cartel de ayuda
  animar('planea');
  dibujarAvatar();
  pintarMarcador();
}

/* El jugador pidió un impulso (barra, flecha arriba o clic). */
function impulso() {
  if (estado === 'espera') {       // el primer impulso pone el mundo en marcha
    estado = 'jugando';
    escenario.classList.remove('vuelo--espera');
    escenario.classList.add('vuelo--andando');
    anterior = performance.now();
    requestAnimationFrame(bucle);
  }
  if (estado === 'jugando') {
    velocidadY = IMPULSO;          // sale para arriba, venga como venga
    animar('aletea');
  }
}

/* El bucle del juego: se repite en cada cuadro de pantalla mientras se juega.
   dt son los segundos que pasaron desde el cuadro anterior. Todo se mueve
   multiplicando por dt, así va igual de rápido en cualquier pantalla. */
function bucle(ahora) {
  if (estado !== 'jugando') return;
  let dt = (ahora - anterior) / 1000;
  if (dt > 0.034) dt = 0.034;      // por si la pestaña estuvo trabada
  anterior = ahora;
  tiempo += dt;

  moverAvatar(dt);
  moverColumnas(dt);
  moverElementos(dt);
  pintarMarcador();

  if (estado !== 'jugando') return;        // chocó en este cuadro: el bucle se apaga
  if (puntos >= META) {
    terminar(true);
  } else {
    requestAnimationFrame(bucle);            // pide el cuadro que sigue
  }
}

/* Física del avatar: la gravedad le suma velocidad y la velocidad lo mueve. */
function moverAvatar(dt) {
  velocidadY += GRAVEDAD * dt;
  avatarY += velocidadY * dt;
  if (avatarY < 0) {               // el techo: no puede salirse por arriba
    avatarY = 0;
    velocidadY = 0;
  }
  if (hinchado > 0) hinchado -= dt;
  dibujarAvatar();
  if (avatarY + tamanio() > SUELO) chocar(null);   // tocó el piso
}

/* Corre las columnas hacia la izquierda y se fija si el avatar chocó o pasó alguna. */
function moverColumnas(dt) {
  falta -= VELOCIDAD * dt;         // lo que avanzó el mundo
  if (falta <= 0) crearColumna();

  const yo = cajaAvatar();
  for (const c of columnas) {
    c.x -= VELOCIDAD * dt;
    c.caja.style.left = c.x + 'px';

    /* Cada columna son dos rectángulos: el de arriba y el de abajo. */
    const arriba = { x: c.x, y: 0, ancho: ANCHO_COLUMNA, alto: c.desde };
    const abajo  = { x: c.x, y: c.hasta, ancho: ANCHO_COLUMNA, alto: SUELO - c.hasta };
    if (seTocan(yo, arriba) || seTocan(yo, abajo)) chocar(c);

    /* Si ya quedó atrás del avatar, suma un punto (una sola vez). */
    if (!c.contada && c.x + ANCHO_COLUMNA < AVATAR_X) {
      c.contada = true;
      puntos += PUNTOS_COLUMNA;
      c.caja.classList.add('columna--pasada');
    }
  }

  /* La que ya salió entera por la izquierda se borra. */
  if (columnas.length > 0 && columnas[0].x < -ANCHO_COLUMNA) {
    columnas[0].caja.remove();
    columnas.shift();
  }
}

/* Corre las gemas y los murciélagos y se fija si el avatar tocó alguno. */
function moverElementos(dt) {
  const yo = cajaAvatar();
  for (const e of elementos) {
    e.x -= VELOCIDAD * dt;
    e.caja.style.left = e.x + 'px';

    /* Al murciélago se le achica más la zona de choque: las alas no cuentan. */
    const margen = e.tipo === 'gema' ? 6 : 20;
    const suCaja = { x: e.x + margen, y: e.y + margen, ancho: e.ancho - margen * 2, alto: e.alto - margen * 2 };

    if (!e.tocado && seTocan(yo, suCaja)) {
      e.tocado = true;
      e.caja.classList.add('tocado');     // CSS lo desvanece
      if (e.tipo === 'gema') {
        puntos += PUNTOS_GEMA;            // la gema suma puntos
        animar('festeja');
      } else {
        hinchado = TIEMPO_HINCHADO;       // el murciélago lo hincha
      }
    }
  }

  if (elementos.length > 0 && elementos[0].x < -100) {
    elementos[0].caja.remove();
    elementos.shift();
  }
}

/* Crea una columna en el borde derecho del escenario.
   Acá están las tres reglas del punto 5 de la consigna. */
function crearColumna() {
  /* (b) El hueco se achica con cada columna, hasta un mínimo. */
  let hueco = HUECO_INICIAL - creadas * ACHIQUE;
  if (hueco < HUECO_MINIMO) hueco = HUECO_MINIMO;

  /* (c) La altura del hueco se sortea. Si queda parecida a la
     anterior se sortea de nuevo: nunca quedan alineados. */
  let centro = azar(60 + hueco / 2, SUELO - 60 - hueco / 2);
  while (Math.abs(centro - centroAnterior) < 40) {
    centro = azar(60 + hueco / 2, SUELO - 60 - hueco / 2);
  }
  centroAnterior = centro;
  const desde = centro - hueco / 2;     // donde empieza el hueco
  const hasta = centro + hueco / 2;     // donde termina

  /* La columna es una caja con dos partes adentro. */
  const caja = document.createElement('div');
  caja.className = 'columna';
  caja.innerHTML = '<div class="columna__arriba"></div><div class="columna__abajo"></div>';
  caja.children[0].style.height = desde + 'px';
  caja.children[1].style.height = (ALTO - hasta) + 'px';
  caja.style.left = ANCHO + 'px';
  escenario.appendChild(caja);
  columnas.push({ x: ANCHO, desde: desde, hasta: hasta, contada: false, caja: caja });
  creadas++;

  /* (a) La distancia hasta la próxima columna también se sortea. */
  const distancia = azar(DISTANCIA_MINIMA, DISTANCIA_MAXIMA);
  falta = distancia;

  /* A veces aparece una gema o un murciélago en el espacio libre. */
  const medio = ANCHO + ANCHO_COLUMNA + (distancia - ANCHO_COLUMNA) / 2;
  const suerte = Math.random();
  if (suerte < 0.35) {
    crearElemento('gema', medio - 28, centro - 28 + azar(-50, 50));
  } else if (suerte < 0.6 && creadas > 2) {
    crearElemento('murcielago', medio - 48, centro - 36 + azar(-70, 70));
  }
}

/* Crea una gema o un murciélago. El tipo es también su clase de CSS,
   que es la que le pone el spritesheet. */
function crearElemento(tipo, x, y) {
  const caja = document.createElement('div');
  caja.className = tipo;
  caja.style.left = x + 'px';
  caja.style.top = y + 'px';
  escenario.appendChild(caja);

  const ancho = tipo === 'gema' ? 56 : 96;
  const alto = tipo === 'gema' ? 56 : 72;
  elementos.push({ tipo: tipo, x: x, y: y, ancho: ancho, alto: alto, tocado: false, caja: caja });
}

/* El avatar chocó contra una columna o contra el piso (ahí "columna" es null).
   Pierde una vida, explota y se frena todo durante un segundo. */
function chocar(columna) {
  if (estado !== 'jugando') return;
  estado = 'choque';
  vidas--;
  escenario.classList.remove('vuelo--andando');   // el parallax se pausa
  animar('explota');
  if (columna) columna.caja.classList.add('columna--chocada');
  pintarMarcador();
  espera = setTimeout(despuesDelChoque, 1000);
}

/* Un segundo después del choque: si no quedan vidas termina, si quedan sigue. */
function despuesDelChoque() {
  if (vidas === 0) {
    terminar(false);
  } else {
    esperar();
  }
}

/* Fin de la partida. gano es true si llegó a la meta. */
function terminar(gano) {
  estado = 'parado';
  escenario.classList.remove('vuelo--andando');
  document.getElementById('vuelo-fin-titulo').textContent = gano ? '¡Llegaste a la meta!' : 'Te quedaste sin vidas';
  document.getElementById('vuelo-fin-texto').textContent =
    'Hiciste ' + puntos + ' puntos en ' + mmss(tiempo) + '.';
  cartelFin.classList.toggle('fin--gano', gano);
  cartelFin.classList.toggle('fin--perdido', !gano);
  cartelFin.hidden = false;
}

/* Borra todas las columnas y los elementos de la pantalla. */
function limpiar() {
  for (const c of columnas) c.caja.remove();
  for (const e of elementos) e.caja.remove();
  columnas = [];
  elementos = [];
  falta = 0;               // 0 = que salga una columna apenas arranque
  centroAnterior = 240;
}


/* ---------- 6. Los controles ---------- */

/* Los botones: todos empiezan una partida nueva. */
btnComenzar.addEventListener('click', comenzar);
btnReiniciar.addEventListener('click', comenzar);
document.getElementById('btn-arrancar').addEventListener('click', comenzar);
document.getElementById('btn-otra').addEventListener('click', comenzar);

/* Impulso con el mouse: clic sobre el escenario. */
escenario.addEventListener('mousedown', impulso);

/* Impulso con el teclado: barra espaciadora o flecha arriba. */
document.addEventListener('keydown', function (e) {
  if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;   // está escribiendo una reseña
  if (estado === 'parado') return;
  e.preventDefault();              // que la barra no baje la página
  if (!e.repeat) impulso();        // con la tecla mantenida apretada no cuenta
});


/* ---------- 7. Datos de la página (igual que en BLOCKA y Peg Solitaire) ---------- */
const juegoActual = JUEGOS.find(j => j.slug === 'frib-vuela');

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('juego-titulo').textContent = juegoActual.titulo;
  document.getElementById('miga-cat').textContent = juegoActual.categoria;
  document.getElementById('miga-juego').textContent = juegoActual.titulo;
  document.getElementById('juego-estrellas').innerHTML = estrellas(juegoActual.nota);
  document.getElementById('juego-nota').textContent = juegoActual.nota.toFixed(1) + ' (' + juegoActual.resenias + ' reseñas)';
  document.getElementById('juego-desc').textContent = juegoActual.desc;

  initResenias();     // el hilo de comentarios, que es de la plantilla

  document.getElementById('copiar-link').addEventListener('click', function () {
    if (navigator.clipboard) navigator.clipboard.writeText('Jugué a ' + juegoActual.titulo + ' en frib. ' + location.href);
    toast('¡Link copiado!');
  });

  dibujarAvatar();
  pintarMarcador();
});
