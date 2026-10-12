/* =========================================================
   frib · blocka.js — Ejercicio Entregable Nº3
   ---------------------------------------------------------
   TODO EL JUEGO ESTÁ HECHO CON LO DEL TEMA 3:
   canvas + degradé + matriz. Nada de CSS filter, nada de
   librerías, nada de transform de CSS.

     · DEGRADÉ    el fondo del tablero se pinta píxel a píxel
                  recorriendo el ESPACIO: t = (x+y)/(ancho+alto-2)
                  y color = a + (b - a) * t
     · MATRIZ (1) la imagen vive en un arreglo plano:
                  index = (x + y * width) * 4. Los tres filtros
                  recorren ese arreglo con un doble for.
     · MATRIZ (2) cada pieza se gira con la matriz de
                  transformación del contexto: translate al
                  centro, rotate, dibujar, restore.
     · CANVAS     drawImage con recorte saca un cuarto de la
                  imagen; getImageData / putImageData leen y
                  escriben los píxeles.

   TRES LIENZOS (dos de ellos no están en el HTML: se crean
   en memoria y nunca se muestran)
     #blocka      el que ve el jugador
     lienzoFondo  el degradé, pintado UNA sola vez
     lienzoFiltro la imagen del nivel ya filtrada, de donde
                  drawImage recorta los cuartos
   ========================================================= */
'use strict';

/* =========================================================
   0. DATOS DEL JUEGO
   ========================================================= */

/* Banco de imágenes (punto 2 de la consigna). Todas son
   asimétricas a propósito: con una simétrica, una pieza girada
   180° se vería igual que bien puesta y habría más de una
   solución. */
const BANCO = [
  { archivo: 'img/blocka/nave.webp',      nombre: 'Nave' },
  { archivo: 'img/blocka/atardecer.webp', nombre: 'Atardecer' },
  { archivo: 'img/blocka/ciudad.webp',    nombre: 'Ciudad' },
  { archivo: 'img/blocka/dado.webp',      nombre: 'Dado' },
  { archivo: 'img/blocka/rayo.webp',      nombre: 'Rayo' },
  { archivo: 'img/blocka/faro.webp',      nombre: 'Faro' },
];

/* Los tres niveles con su filtro (puntos 1 y 4).
   "limite" en segundos; 0 = sin tiempo máximo. */
const NIVELES = [
  { n: 1, filtro: 'grises',   nombre: 'Escala de grises', limite: 0   },
  { n: 2, filtro: 'brillo',   nombre: 'Brillo +30%',      limite: 120 },
  { n: 3, filtro: 'negativo', nombre: 'Negativo',         limite: 90  },
];

const LADO  = 2;                 // 2 × 2 = 4 piezas
const SEP   = 18;                // separación entre piezas, en píxeles del canvas
const PENAL = 5;                 // segundos que cuesta cada ayudita

/* Colores del degradé, en RGB porque se interpola número a número */
const DEG_A = [46, 16, 101];     // violeta de la marca
const DEG_B = [6, 15, 71];       // azul profundo


/* =========================================================
   1. LIENZOS
   ========================================================= */
const canvas = document.getElementById('blocka');
const ctx    = canvas.getContext('2d');
const TAM    = canvas.width;            // 800 (el CSS lo muestra más chico)
const CUARTO = TAM / LADO;              // 400: lado del recorte en la imagen
const PIEZA  = (TAM - SEP * (LADO + 1)) / LADO;   // lado de la pieza dibujada

/* Lienzos auxiliares: se crean en memoria, no están en el HTML
   y nunca se muestran. Sirven para no recalcular en cada cuadro. */
const lienzoFondo  = document.createElement('canvas');
const lienzoFiltro = document.createElement('canvas');
lienzoFondo.width  = lienzoFondo.height  = TAM;
lienzoFiltro.width = lienzoFiltro.height = TAM;
const ctxFondo  = lienzoFondo.getContext('2d');
const ctxFiltro = lienzoFiltro.getContext('2d');


/* =========================================================
   2. DEGRADÉ — el fondo del tablero, píxel a píxel
   ---------------------------------------------------------
   No se recorre el color sino el ESPACIO, que es la corrección
   del Tema 3: con un for de 0 a 255 el degradé mide siempre 256
   píxeles. Acá t sale de la posición, así que el degradé se
   adapta a cualquier tamaño de canvas.

       t = (x + y) / (ancho + alto - 2)     → va de 0 a 1
       color = a + (b - a) * t

   El -2 es por lo mismo que el -1 de la clase: el último píxel
   es (ancho-1, alto-1), y ahí t tiene que valer exactamente 1.

   Se pinta con createImageData + putImageData en vez de 640.000
   fillRect: una sola escritura al canvas en lugar de una por
   píxel. Y se hace UNA vez al cargar la página, no por cuadro.
   ========================================================= */
function pintarDegrade() {
  const imageData = ctxFondo.createImageData(TAM, TAM);
  const divisor = TAM + TAM - 2;

  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const t = (x + y) / divisor;                    // 0 … 1 en diagonal
      const r = DEG_A[0] + (DEG_B[0] - DEG_A[0]) * t;
      const g = DEG_A[1] + (DEG_B[1] - DEG_A[1]) * t;
      const b = DEG_A[2] + (DEG_B[2] - DEG_A[2]) * t;
      ponerPixel(imageData, x, y, r, g, b, 255);
    }
  }
  ctxFondo.putImageData(imageData, 0, 0);
}

/* Escribe un píxel en el arreglo plano del ImageData.
   Acá se ve que la "matriz" en realidad es una tira de bytes:
   cuatro lugares por píxel, fila por fila. */
function ponerPixel(imageData, x, y, r, g, b, a) {
  const index = (x + y * imageData.width) * 4;
  imageData.data[index + 0] = r;
  imageData.data[index + 1] = g;
  imageData.data[index + 2] = b;
  imageData.data[index + 3] = a;   // acá el alfa va de 0 a 255, no de 0 a 1
}


/* =========================================================
   3. FILTROS — recorrer la matriz de píxeles (punto 1)
   ---------------------------------------------------------
   Se aplican UNA vez, en el setup del nivel, sobre el lienzo
   auxiliar. Después el juego dibuja siempre desde ese lienzo
   ya filtrado, así que girar una pieza no vuelve a filtrar nada.

   No se usa el filter de CSS a propósito: la consigna del Tema 3
   es trabajar la imagen píxel a píxel.
   ========================================================= */
function aplicarFiltro(tipo) {
  const imageData = ctxFiltro.getImageData(0, 0, TAM, TAM);
  const data = imageData.data;        // Uint8ClampedArray: recorta solo a 0–255

  for (let y = 0; y < TAM; y++) {
    for (let x = 0; x < TAM; x++) {
      const i = (x + y * TAM) * 4;    // el índice de la clase

      if (tipo === 'negativo') {
        /* Cada canal se da vuelta: lo que era 0 pasa a 255. */
        data[i]     = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];

      } else if (tipo === 'grises') {
        /* BT.601 y no el promedio: el ojo es mucho más sensible
           al verde que al azul, así que promediar deja grises
           que no se corresponden con el brillo que uno ve. */
        const gris = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gris;

      } else if (tipo === 'brillo') {
        /* +30% es multiplicar por 1,3. Un 220 da 286, que no
           entra en un byte: el Uint8ClampedArray lo recorta a 255
           solo. Con un Uint8Array común daría la vuelta a 30 y la
           imagen se llenaría de manchas. */
        data[i]     = data[i]     * 1.3;
        data[i + 1] = data[i + 1] * 1.3;
        data[i + 2] = data[i + 2] * 1.3;
      }
      /* El canal alfa (i + 3) no se toca: la imagen sigue opaca. */
    }
  }
  ctxFiltro.putImageData(imageData, 0, 0);   // recién acá cambia el lienzo
}


/* =========================================================
   4. CLASE Pieza — un cuarto de la imagen
   ---------------------------------------------------------
   Sabe dos cosas: qué pedazo de la imagen le toca y cuánto está
   girada. Y sabe dibujarse, que es donde aparece la matriz de
   transformación del canvas.
   ========================================================= */
class Pieza {
  constructor(indice) {
    this.indice = indice;
    this.col = indice % LADO;                 // 0 izquierda, 1 derecha
    this.fil = Math.floor(indice / LADO);     // 0 arriba,    1 abajo

    /* De dónde se recorta en la imagen */
    this.sx = this.col * CUARTO;
    this.sy = this.fil * CUARTO;

    /* Dónde se dibuja en el canvas, y el centro de ese lugar */
    this.dx = SEP + this.col * (PIEZA + SEP);
    this.dy = SEP + this.fil * (PIEZA + SEP);
    this.cx = this.dx + PIEZA / 2;
    this.cy = this.dy + PIEZA / 2;

    this.objetivo = 0;   // el ángulo "de verdad", el que decide si ganó
    this.giro     = 0;   // el ángulo que se está dibujando (va alcanzando al objetivo)
    this.fija     = false;
  }

  /* El ángulo se acumula (puede ser -180 o 450), así la pieza
     gira siempre para el lado que corresponde. Para saber si está
     derecha hay que normalizarlo a 0–359. */
  get derecha() {
    return ((this.objetivo % 360) + 360) % 360 === 0;
  }

  mezclar() {
    this.objetivo = this.giro = Math.floor(Math.random() * 4) * 90;
    this.fija = false;
  }

  /* ---------------------------------------------------------
     LA MATRIZ DE TRANSFORMACIÓN
     ---------------------------------------------------------
     rotate() gira el sistema de coordenadas alrededor del (0,0)
     del canvas, que está arriba a la izquierda. Si se girara así
     nomás, la pieza saldría despedida del tablero. Por eso:

       1. save()       guarda la matriz como está
       2. translate()  corre el (0,0) al centro de la pieza
       3. rotate()     ahora sí gira, y gira alrededor de ese centro
       4. drawImage()  se dibuja en -PIEZA/2, -PIEZA/2, o sea
                       centrada en el nuevo origen
       5. restore()    devuelve la matriz para la pieza siguiente

     Sin el restore, cada pieza heredaría el giro de la anterior.
     --------------------------------------------------------- */
  dibujar(ctx, fuente) {
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.giro * Math.PI / 180);      // rotate pide radianes
    ctx.drawImage(
      fuente,
      this.sx, this.sy, CUARTO, CUARTO,          // qué recorto de la imagen
      -PIEZA / 2, -PIEZA / 2, PIEZA, PIEZA       // dónde lo pongo (ya centrado)
    );
    ctx.restore();

    /* El borde se dibuja SIN girar: tiene que quedar derecho
       aunque la pieza esté de costado. */
    if (this.fija) {
      ctx.strokeStyle = '#A3E635';
      ctx.lineWidth = 6;
      ctx.strokeRect(this.dx + 3, this.dy + 3, PIEZA - 6, PIEZA - 6);
    }
  }

  /* Acerca el ángulo dibujado al objetivo. Devuelve true si
     todavía le falta, para que el bucle de animación siga. */
  animar() {
    const falta = this.objetivo - this.giro;
    if (Math.abs(falta) < 0.5) { this.giro = this.objetivo; return false; }
    this.giro += falta * 0.22;      // se acerca un 22% por cuadro: frena sola
    return true;
  }
}


/* =========================================================
   5. CLASE Juego — las reglas y el estado de la partida
   ========================================================= */
class Juego {
  constructor() {
    this.piezas   = [];
    this.nivel    = 0;        // índice dentro de NIVELES
    this.imagen   = null;     // la del banco que salió sorteada
    this.giros    = 0;
    this.inicio   = 0;        // marca de tiempo del arranque
    this.cron     = null;     // id del setInterval del reloj
    this.espera   = null;     // id del setTimeout del cartel de victoria
    this.jugando  = false;
    this.animando = false;
    this.fuente   = lienzoFiltro;   // de dónde se recortan las piezas
    this.records  = {};             // mejor tiempo por nivel, en memoria
    for (let i = 0; i < LADO * LADO; i++) this.piezas.push(new Pieza(i));
  }

  get datos() { return NIVELES[this.nivel]; }

  /* -------------------------------------------------------
     SETUP DEL NIVEL
     Acá pasa todo lo que la consigna pide "en tiempo de carga":
     sortear la imagen, cargarla, aplicarle el filtro y mezclar
     los ángulos. Lo único que queda afuera es el reloj, que
     arranca recién con el botón Comenzar.
     ------------------------------------------------------- */
  preparar() {
    const nivel = this.datos;
    this.imagen = BANCO[Math.floor(Math.random() * BANCO.length)];
    this.giros = 0;
    this.jugando = false;
    this.fuente = lienzoFiltro;

    /* Mezclar. El while evita que salga resuelta de entrada. */
    do { this.piezas.forEach(p => p.mezclar()); } while (this.resuelto);

    /* Cargar la imagen es ASINCRÓNICO: src dispara la carga y el
       script sigue. El filtro y el primer dibujo tienen que ir
       adentro de onload, cuando la imagen ya está en memoria. */
    const img = new Image();
    img.onload = () => {
      ctxFiltro.clearRect(0, 0, TAM, TAM);
      ctxFiltro.drawImage(img, 0, 0, TAM, TAM);   // la imagen al lienzo auxiliar
      aplicarFiltro(nivel.filtro);                // y acá se filtra, una sola vez
      this.original = img;                        // se guarda para mostrarla al ganar
      this.dibujar();
    };
    img.src = this.imagen.archivo;

    /* Mientras la imagen viaja, el tablero muestra el degradé */
    ctx.drawImage(lienzoFondo, 0, 0);

    /* preparar() deja la pantalla lista por su cuenta: el cartel de
       arranque visible, el de fin escondido y los botones como
       corresponde. Así cualquiera que llame a preparar() no se tiene
       que acordar de resetear nada. */
    clearTimeout(this.espera);
    clearInterval(this.cron);
    $fin.hidden = true;
    $fin.classList.remove('fin--gano', 'fin--perdido');
    canvas.classList.remove('blocka--activa', 'blocka--resuelta');
    $arranque.hidden = false;
    $arranque.querySelector('.fin__titulo').textContent = `Nivel ${nivel.n}`;
    $btnComen.disabled = false;
    $btnAyuda.disabled = true;
    $btnReini.disabled = true;
    this.pintarHud();
  }

  get resuelto() { return this.piezas.every(p => p.derecha); }

  /* Un cuadro completo: primero el degradé, después las piezas */
  dibujar() {
    ctx.drawImage(lienzoFondo, 0, 0);
    this.piezas.forEach(p => p.dibujar(ctx, this.fuente));
  }

  /* Bucle de animación. Solo corre mientras alguna pieza se está
     moviendo; cuando todas llegaron, se apaga solo. */
  animar() {
    if (this.animando) return;
    this.animando = true;
    const paso = () => {
      let falta = false;
      this.piezas.forEach(p => { if (p.animar()) falta = true; });
      this.dibujar();
      if (falta) requestAnimationFrame(paso);
      else this.animando = false;
    };
    requestAnimationFrame(paso);
  }

  comenzar() {
    this.jugando = true;
    this.inicio = Date.now();
    this.cron = setInterval(() => this.tic(), 200);
    $arranque.hidden = true;
    canvas.classList.add('blocka--activa');
    $btnAyuda.disabled = false;
    $btnReini.disabled = false;
    $btnComen.disabled = true;
  }

  /* El reloj no cuenta ticks: cada vez mide cuánto pasó de verdad
     desde el arranque, así no se atrasa si el navegador se traba. */
  tic() {
    const seg = Math.floor((Date.now() - this.inicio) / 1000);
    $reloj.textContent = mmss(seg);
    if (this.datos.limite && seg >= this.datos.limite) this.perder();
  }

  girar(i, grados) {
    if (!this.jugando) return;
    const p = this.piezas[i];
    if (!p || p.fija) return;
    p.objetivo += grados;
    this.giros++;
    $hudGiros.textContent = this.giros;
    this.animar();
    if (this.resuelto) this.ganar();
  }

  /* EXTRA 3 · Ayudita: endereza y fija la primera pieza torcida.
     Los 5 segundos se cobran corriendo la marca de arranque hacia
     atrás: el reloj sigue siendo una sola resta. */
  ayudita() {
    if (!this.jugando) return;
    const p = this.piezas.find(x => !x.derecha && !x.fija);
    if (!p) return;
    p.objetivo = 0;
    p.fija = true;
    this.inicio -= PENAL * 1000;
    this.tic();
    this.animar();
    toast(`Pieza ${p.indice + 1} acomodada · +${PENAL} s`);
    if (this.resuelto) this.ganar();
  }

  detener() {
    clearInterval(this.cron);
    this.cron = null;
    this.jugando = false;
    $btnAyuda.disabled = true;
    $btnReini.disabled = true;
  }

  ganar() {
    this.detener();
    const seg = Math.floor((Date.now() - this.inicio) / 1000);
    const nivel = this.datos;

    /* Se quitan los filtros: ahora se dibuja desde la imagen
       original, sin pasar por el lienzo filtrado. */
    this.fuente = this.original;
    this.piezas.forEach(p => { p.fija = false; });
    this.dibujar();
    canvas.classList.remove('blocka--activa');
    canvas.classList.add('blocka--resuelta');

    const previo = this.records[nivel.n];
    const esRecord = !previo || seg < previo;
    if (esRecord) this.records[nivel.n] = seg;

    $finTitulo.textContent = esRecord ? '¡Nuevo récord!' : '¡Blocka armada!';
    $finTexto.innerHTML =
      `Nivel ${nivel.n} resuelto en <b>${mmss(seg)}</b> con ${this.giros} giros.` +
      (esRecord ? ' Es tu mejor marca para este nivel.' : ` Tu récord sigue siendo ${mmss(previo)}.`) +
      `<br>La imagen era <b>${this.imagen.nombre}</b>, ahora en RGB.`;
    $btnSeguir.textContent = this.nivel < NIVELES.length - 1 ? 'Siguiente nivel' : 'Jugar de nuevo';
    pintarNiveles(this.records);

    /* El cartel se apoya abajo y espera 900 ms: el premio del
       nivel es ver la imagen sin filtro, no taparla. */
    $fin.classList.add('fin--gano');
    this.espera = setTimeout(mostrarFin, 900);
  }

  perder() {
    this.detener();
    $finTitulo.textContent = 'Se acabó el tiempo';
    $finTexto.innerHTML = `No llegaste a armar la blocka en ${mmss(this.datos.limite)}.<br>` +
                          `La imagen era <b>${this.imagen.nombre}</b>.`;
    $btnSeguir.textContent = 'Reintentar';
    $fin.classList.add('fin--perdido');
    mostrarFin();
  }

  /* "Siguiente nivel" / "Reintentar" / "Jugar de nuevo" */
  seguir() {
    /* Si perdió se repite el mismo nivel; si ganó, pasa al siguiente
       (y del último vuelve al primero). */
    const perdio = $fin.classList.contains('fin--perdido');
    if (!perdio) this.nivel = (this.nivel + 1) % NIVELES.length;
    this.preparar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reiniciar() {
    this.detener();
    this.preparar();   // mismo nivel, imagen nueva y ángulos nuevos
  }

  pintarHud() {
    const nivel = this.datos;
    $hudNivel.textContent = nivel.n;
    $hudGiros.textContent = '0';
    $reloj.textContent = '00:00';
    $hudTip.textContent = `Filtro: ${nivel.nombre}` +
                          (nivel.limite ? ` · máximo ${mmss(nivel.limite)}` : '');
  }
}


/* =========================================================
   6. ATAJOS Y AYUDANTES
   ========================================================= */
const $arranque  = document.getElementById('arranque');
const $fin       = document.getElementById('fin');
const $finTitulo = document.getElementById('fin-titulo');
const $finTexto  = document.getElementById('fin-texto');
const $btnSeguir = document.getElementById('btn-seguir');
const $reloj     = document.getElementById('hud-reloj');
const $hudNivel  = document.getElementById('hud-nivel');
const $hudGiros  = document.getElementById('hud-giros');
const $hudTip    = document.getElementById('hud-tip');
const $btnAyuda  = document.getElementById('btn-ayudita');
const $btnReini  = document.getElementById('btn-reiniciar');
const $btnComen  = document.getElementById('btn-comenzar');

function mmss(seg) {
  const m = Math.floor(seg / 60), s = seg % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
function mostrarFin() { $fin.hidden = false; $btnSeguir.focus(); }

/* De dónde se hizo clic a qué pieza se tocó.
   El canvas mide 800 px por dentro pero el CSS lo muestra más
   chico, así que la coordenada del mouse hay que escalarla:
   si no, los clics caen corridos. */
function piezaEn(evento) {
  const caja = canvas.getBoundingClientRect();
  const x = (evento.clientX - caja.left) * (TAM / caja.width);
  const y = (evento.clientY - caja.top)  * (TAM / caja.height);
  const col = Math.floor(x / CUARTO);
  const fil = Math.floor(y / CUARTO);
  if (col < 0 || fil < 0 || col >= LADO || fil >= LADO) return -1;
  return fil * LADO + col;
}

/* Llena el panel "Datos rapidos" de la plantilla: los tres
   niveles con su filtro, su tiempo maximo y el record. */
function pintarNiveles(records = {}) {
  const filas = NIVELES.map(n => {
    const r = records[n.n];
    return `<li>Nivel ${n.n} · ${n.nombre}` +
           (n.limite ? ` · máx ${mmss(n.limite)}` : '') +
           (r ? ` <b class="record">récord ${mmss(r)}</b>` : '') + '</li>';
  });
  filas.push('<li>Dificultad: media</li>', '<li>Jugadores: 1</li>');
  document.getElementById('lista-niveles').innerHTML = filas.join('');
}

function pintarBanco() {
  document.getElementById('banco').innerHTML = BANCO.map(img => `
    <li class="banco__item">
      <img src="${img.archivo}" alt="${img.nombre}" width="800" height="800" loading="lazy">
      <span>${img.nombre}</span>
    </li>`).join('');
}


/* =========================================================
   7. ARRANQUE
   ========================================================= */
/* El juego dentro del catalogo, igual que en juego.js */
const juegoActual = JUEGOS.find(j => j.slug === 'blocka');

document.addEventListener('DOMContentLoaded', () => {
  /* Datos del juego en la cabecera: lo mismo que hace la pagina
     de Peg Solitaire, porque es la misma plantilla. */
  document.getElementById('juego-titulo').textContent = juegoActual.titulo;
  document.getElementById('miga-cat').textContent = juegoActual.categoria;
  document.getElementById('miga-juego').textContent = juegoActual.titulo;
  document.getElementById('juego-estrellas').innerHTML = estrellas(juegoActual.nota);
  document.getElementById('juego-nota').textContent = `${juegoActual.nota.toFixed(1)} (${juegoActual.resenias} reseñas)`;
  document.getElementById('juego-desc').textContent = juegoActual.desc;
  document.title = `${juegoActual.titulo} · frib`;

  pintarBanco();
  pintarNiveles();

  pintarDegrade();                 // el fondo se pinta una sola vez
  const juego = new Juego();
  juego.preparar();

  /* Clic izquierdo gira a la izquierda, clic derecho a la derecha. */
  canvas.addEventListener('click', (e) => juego.girar(piezaEn(e), -90));
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();            // sin esto aparece el menú del navegador
    juego.girar(piezaEn(e), 90);
  });

  document.getElementById('btn-arrancar').addEventListener('click', () => juego.comenzar());
  $btnComen.addEventListener('click', () => juego.comenzar());
  $btnAyuda.addEventListener('click', () => juego.ayudita());
  $btnReini.addEventListener('click', () => juego.reiniciar());
  $btnSeguir.addEventListener('click', () => juego.seguir());

  document.getElementById('copiar-link').addEventListener('click', async () => {
    const txt = `Jugué a ${juegoActual.titulo} en frib. ${location.href}`;
    try { await navigator.clipboard.writeText(txt); toast('¡Link copiado!'); }
    catch { toast('Copiá el link desde la barra del navegador'); }
  });

  /* El hilo de resenias es de la plantilla: vive en resenias.js
     y lo comparten todas las paginas de juego. */
  initResenias();

  /* Queda a mano para probar desde la consola del navegador */
  window.juego = juego;
});
