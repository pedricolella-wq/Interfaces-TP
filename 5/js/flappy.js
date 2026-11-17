/* =========================================================
   frib · flappy.js — "Frib Vuela" (Ejercicio Entregable Nº5)
   ---------------------------------------------------------
   Un "horizontal scroller" tipo Flappy Bird hecho SIN canvas:
   todo lo que se ve son <div> y el movimiento visual lo hace
   CSS con @keyframes (css/flappy.css).

   ¿Qué hace entonces este archivo?

     1. La FÍSICA: gravedad, impulso y avance del mundo.
     2. Los CHOQUES: avatar contra columnas, piso y elementos.
     3. Las REGLAS: puntos, vidas y cuándo termina la partida.
     4. PRENDER y APAGAR clases para que CSS anime.
        Ej.: avatar.animar('avatar--aletea') -> corre @keyframes aletear

   Este archivo nunca dice CÓMO se ve una animación. Solo dice
   CUÁNDO empieza. El "cómo" está entero en flappy.css.

   Todo se calcula en un mundo de 960 x 540. La pantalla puede
   ser más grande o más chica: de eso se encarga CSS con un
   scale() (ver ajustarEscala).

   Orden del archivo:
     1. Constantes        2. Ayudantes
     3. class Avatar      4. class Columna
     5. class Elemento -> Murcielago y Gema
     6. class Juego       7. Arranque
   ========================================================= */
'use strict';


/* =========================================================
   1. CONSTANTES — los números que definen el juego
   ---------------------------------------------------------
   Están todos juntos y con nombre para que cambiar una regla
   sea cambiar UN número. Las distancias son píxeles del mundo
   de 960 x 540 y los tiempos son segundos.
   ========================================================= */
const ANCHO = 960;              // ancho del mundo
const ALTO  = 540;              // alto del mundo
const SUELO = 480;              // "y" donde empieza el piso

/* Velocidad del mundo: cuántos px por segundo avanza el avatar.
   Es CONSTANTE (consigna, punto 1). Tiene que coincidir con la
   capa del suelo en flappy.css: 1920 px en 8 s = 240 px/s. */
const VELOCIDAD = 240;

const GRAVEDAD     = 1500;      // cuánto aumenta la caída por segundo
const IMPULSO      = -430;      // velocidad que toma al aletear (negativo = sube)
const CAIDA_MAXIMA = 620;       // tope de velocidad al caer

const AVATAR_X        = 250;    // el avatar no se mueve en x: se mueve el mundo
const AVATAR_Y        = 220;    // altura a la que aparece
const RADIO_AVATAR    = 19;     // zona de choque del avatar (un círculo)
const ESCALA_HINCHADO = 1.45;   // cuánto crece al tocar un murciélago (igual que en el CSS)
const TIEMPO_HINCHADO = 5;      // segundos que dura hinchado (igual que la barra del CSS)

const ANCHO_COLUMNA    = 96;
const BORDE_COLUMNA    = 4;     // px que se le perdonan a cada lado de la columna
const HUECO_INICIAL    = 230;   // alto del primer hueco
const HUECO_MINIMO     = 150;   // el hueco nunca baja de acá
const ACHIQUE          = 4;     // px que se achica el hueco con cada columna (punto 5b)
const DISTANCIA_MINIMA = 300;   // separación horizontal entre columnas (punto 5a)
const DISTANCIA_MAXIMA = 460;
const MARGEN_HUECO     = 60;    // el hueco nunca queda pegado al techo ni al piso
const SALTO_MINIMO     = 40;    // cuánto cambia de altura un hueco respecto del anterior (punto 5c)
const SALTO_MAXIMO     = 170;

const META           = 50;      // puntos para ganar: el puntaje decide el final (punto 6)
const VIDAS          = 3;
const PUNTOS_COLUMNA = 1;
const PUNTOS_GEMA    = 5;

/* Clases de estado del avatar: cada una dispara un @keyframes
   distinto en flappy.css. El avatar lleva UNA sola por vez. */
const ESTADOS_AVATAR = ['avatar--planea', 'avatar--aletea', 'avatar--festeja',
                        'avatar--explota', 'avatar--gana'];

/* Imágenes que se precargan antes de dejar jugar, para que
   ninguna aparezca tarde en medio de la partida. */
const IMAGENES = ['cielo', 'capa-1-nubes', 'capa-2-montanias', 'capa-3-colinas',
  'capa-4-bosque', 'capa-5-suelo', 'columna-arriba', 'columna-abajo',
  'murcielago', 'gema', 'estallido'].map(n => `img/vuelo/${n}.webp`);


/* =========================================================
   2. AYUDANTES — funciones chicas que usa todo el archivo
   ========================================================= */

/* Número al azar entre min y max (con decimales). */
const azar = (min, max) => min + Math.random() * (max - min);

/* Devuelve "valor", pero sin dejarlo salir del rango [min, max]. */
const limitar = (valor, min, max) => Math.max(min, Math.min(max, valor));

/* Pasa segundos a texto "mm:ss" para el reloj. */
function mmss(segundos) {
  const s = Math.floor(segundos);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

/* Vuelve a correr desde cero la animación CSS que dispara una clase.
   Si la clase ya estaba puesta, volver a ponerla no hace nada: hay
   que sacarla, obligar al navegador a recalcular (leer offsetWidth
   lo fuerza) y recién ahí ponerla de nuevo. */
function reiniciarAnimacion(el, clase) {
  el.classList.remove(clase);
  void el.offsetWidth;
  el.classList.add(clase);
}

/* ¿Un círculo toca un rectángulo?
   Se busca el punto del rectángulo MÁS CERCANO al centro del círculo
   (es el centro "limitado" a los bordes del rectángulo). Si ese punto
   está a menos de un radio de distancia, se tocan. */
function circuloTocaRectangulo(cx, cy, radio, rx, ry, ancho, alto) {
  const px = limitar(cx, rx, rx + ancho);
  const py = limitar(cy, ry, ry + alto);
  return Math.hypot(cx - px, cy - py) < radio;
}

/* Espera a que estén cargadas todas las imágenes de la lista. */
function cargarImagenes(rutas) {
  return Promise.all(rutas.map(ruta => new Promise((listo, falla) => {
    const img = new Image();
    img.onload  = listo;
    img.onerror = () => falla(new Error('No se pudo cargar ' + ruta));
    img.src = ruta;
  })));
}


/* =========================================================
   3. CLASE Avatar — la mascota de frib
   ---------------------------------------------------------
   Guarda su posición (x, y), su velocidad vertical (vy) y cuánto
   tiempo le queda hinchado. La "x" no cambia nunca: el avatar se
   queda en su lugar y lo que se corre es el mundo.

   Las animaciones NO están acá: animar() solo le pone una clase
   al <div> y CSS hace el resto.
   ========================================================= */
class Avatar {
  /* Recibe el <div class="avatar"> que ya está en el HTML. */
  constructor(el) {
    this.el = el;
    this.x = AVATAR_X;
    this.colocar();

    /* Cuando termina el festejo se saca la clase, así el próximo
       impulso puede volver a mostrar el aleteo. */
    this.el.addEventListener('animationend', (e) => {
      if (e.animationName === 'festejar') this.el.classList.remove('avatar--festeja');
    });
  }

  /* Lo deja como al principio: en el medio, quieto y sin hinchar. */
  colocar() {
    this.y = AVATAR_Y;
    this.vy = 0;
    this.hinchado = 0;          // segundos que le quedan hinchado (0 = normal)
    this.el.classList.remove('avatar--hinchado', 'avatar--deshincha');
    this.dibujar();
  }

  /* Radio de la zona de choque: más grande mientras está hinchado. */
  get radio() {
    return this.hinchado > 0 ? RADIO_AVATAR * ESCALA_HINCHADO : RADIO_AVATAR;
  }

  /* Cambia la animación del avatar: saca el estado que tenía y pone
     el nuevo. El offsetWidth del medio es para que, si es el mismo
     estado (dos aleteos seguidos), la animación arranque de cero. */
  animar(estado) {
    this.el.classList.remove(...ESTADOS_AVATAR);
    void this.el.offsetWidth;
    this.el.classList.add(estado);
  }

  /* IMPULSO: la velocidad pasa a ser hacia arriba, sin importar
     cuánto venía cayendo. Y dispara la animación de aletear, salvo
     que esté festejando una gema (para no cortarle el festejo). */
  impulsar() {
    this.vy = IMPULSO;
    if (!this.el.classList.contains('avatar--festeja')) this.animar('avatar--aletea');
  }

  /* FÍSICA de un cuadro. dt = segundos desde el cuadro anterior.
       1) la gravedad le suma velocidad hacia abajo
       2) la velocidad le cambia la posición
     Multiplicar por dt hace que caiga igual en una pantalla de
     60 Hz que en una de 144 Hz. */
  mover(dt) {
    this.vy = Math.min(this.vy + GRAVEDAD * dt, CAIDA_MAXIMA);
    this.y += this.vy * dt;
    if (this.y < this.radio) {          // techo: no puede salirse por arriba
      this.y = this.radio;
      this.vy = 0;
    }
  }

  /* ¿Tocó el piso? */
  tocaElSuelo() {
    return this.y + this.radio >= SUELO;
  }

  /* Lo hincha (efecto del murciélago). Si ya estaba hinchado, el
     tiempo vuelve a empezar. */
  hinchar() {
    this.hinchado = TIEMPO_HINCHADO;
    this.el.classList.remove('avatar--deshincha');
    reiniciarAnimacion(this.el, 'avatar--hinchado');
  }

  /* Descuenta el tiempo de hinchado. Devuelve true en el cuadro
     exacto en que se le pasa, para que el Juego saque el aviso. */
  pasarTiempo(dt) {
    if (this.hinchado <= 0) return false;
    this.hinchado -= dt;
    if (this.hinchado > 0) return false;
    this.hinchado = 0;
    this.el.classList.remove('avatar--hinchado');
    reiniciarAnimacion(this.el, 'avatar--deshincha');
    return true;
  }

  /* Lleva la posición al <div>. La inclinación sale de la velocidad:
     si sube mira hacia arriba, si cae se va de punta. Se usa
     transform (y no left/top) porque no obliga al navegador a
     recalcular el resto de la página. */
  dibujar() {
    const angulo = limitar(this.vy / 9, -24, 62);
    this.el.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${angulo}deg)`;
  }
}


/* =========================================================
   4. CLASE Columna — un par de cristales con un hueco en el medio
   ---------------------------------------------------------
   Una columna queda definida por tres números:
     x       dónde está su borde izquierdo
     centro  a qué altura está el medio del hueco
     hueco   cuánto mide el hueco de alto

   El <div> se crea acá mismo y se agrega a la pista.
   ========================================================= */
class Columna {
  /* Guarda los tres números y arma el <div> con sus dos partes.
     El alto de cada parte sale del hueco: la de arriba llega hasta
     donde empieza el hueco y la de abajo arranca donde termina. */
  constructor(x, centro, hueco, pista) {
    this.x = x;
    this.centro = centro;
    this.hueco = hueco;
    this.contada = false;       // ¿ya sumó su punto?

    this.el = document.createElement('div');
    this.el.className = 'columna';

    const arriba = document.createElement('div');
    arriba.className = 'columna__parte columna__parte--arriba';
    arriba.style.height = this.huecoArriba + 'px';             // del techo al hueco

    const abajo = document.createElement('div');
    abajo.className = 'columna__parte columna__parte--abajo';
    abajo.style.height = (ALTO - this.huecoAbajo) + 'px';      // del hueco al fondo

    this.el.append(arriba, abajo);
    pista.appendChild(this.el);
    this.dibujar();
  }

  /* "y" donde empieza el hueco (termina el cristal de arriba). */
  get huecoArriba() { return this.centro - this.hueco / 2; }

  /* "y" donde termina el hueco (empieza el cristal de abajo). */
  get huecoAbajo()  { return this.centro + this.hueco / 2; }

  /* La corre hacia la izquierda a la velocidad del mundo. */
  avanzar(dt) {
    this.x -= VELOCIDAD * dt;
    this.dibujar();
  }

  /* ¿El avatar la toca? Son dos rectángulos: el de arriba y el de
     abajo. Si el círculo del avatar toca cualquiera, chocó. */
  choca(avatar) {
    const x = this.x + BORDE_COLUMNA;
    const ancho = ANCHO_COLUMNA - BORDE_COLUMNA * 2;
    return circuloTocaRectangulo(avatar.x, avatar.y, avatar.radio, x, 0, ancho, this.huecoArriba)
        || circuloTocaRectangulo(avatar.x, avatar.y, avatar.radio, x, this.huecoAbajo, ancho, SUELO - this.huecoAbajo);
  }

  /* ¿El avatar ya la dejó atrás? Solo dice que sí UNA vez, para
     que cada columna sume un único punto. */
  fuePasada(avatar) {
    if (this.contada) return false;
    if (this.x + ANCHO_COLUMNA > avatar.x - avatar.radio) return false;
    this.contada = true;
    return true;
  }

  /* ¿Ya salió entera por la izquierda? */
  salio() {
    return this.x < -ANCHO_COLUMNA;
  }

  /* Lleva la posición al <div>. */
  dibujar() {
    this.el.style.transform = `translateX(${this.x}px)`;
  }

  /* Saca el <div> de la página. */
  quitar() {
    this.el.remove();
  }
}


/* =========================================================
   5. CLASE Elemento — lo que flota entre columna y columna
   ---------------------------------------------------------
   Elemento es la clase "madre": tiene lo que comparten todos
   (posición, avanzar con el mundo, saber si tocó al avatar).

   De ella HEREDAN las dos clases de elemento que pide la consigna
   (punto 4), y cada una define qué pasa al tocarla:

     Murcielago.alTocar()  ->  HINCHA al avatar (no toca los puntos)
     Gema.alTocar()        ->  SUMA puntos      (no toca al avatar)

   Hacen cosas distintas (punto 6) y ninguna termina la partida.
   El Juego no pregunta de qué clase es cada uno: llama a
   alTocar() y cada elemento sabe qué le toca hacer.
   ========================================================= */
class Elemento {
  /* (x, y) es el CENTRO del elemento. "clase" es la clase CSS que
     le pone el spritesheet: 'murcielago' o 'gema'. */
  constructor(x, y, radio, clase, pista) {
    this.x = x;
    this.y = y;
    this.radio = radio;         // zona de choque (un círculo)
    this.tocado = false;        // ya lo tocó el avatar: no vuelve a contar

    this.el = document.createElement('div');
    this.el.className = 'elemento ' + clase;
    pista.appendChild(this.el);
    this.dibujar();
  }

  /* Se corre con el mundo, a la misma velocidad que las columnas. */
  avanzar(dt) {
    this.x -= VELOCIDAD * dt;
    this.dibujar();
  }

  /* ¿Toca al avatar? Son dos círculos: se tocan si la distancia
     entre los centros es menor que la suma de los radios. */
  toca(avatar) {
    return Math.hypot(this.x - avatar.x, this.y - avatar.y) < this.radio + avatar.radio;
  }

  /* Lo marca como tocado: CSS lo desvanece con una transición. */
  tocar() {
    this.tocado = true;
    this.el.classList.add('elemento--tocado');
  }

  /* Qué pasa cuando el avatar lo toca. Lo define cada hijo. */
  alTocar(juego) {}

  /* ¿Ya salió entero por la izquierda? */
  salio() {
    return this.x < -80;
  }

  /* Lleva la posición al <div>. */
  dibujar() {
    this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }

  /* Saca el <div> de la página. */
  quitar() {
    this.el.remove();
  }
}

/* ---- Elemento 1: el murciélago ---- */
class Murcielago extends Elemento {
  /* super() llama al constructor de Elemento: radio de choque 18
     y la clase CSS 'murcielago'. */
  constructor(x, y, pista) {
    super(x, y, 18, 'murcielago', pista);
    this.centro = y;                    // altura alrededor de la que sube y baja
    this.fase = azar(0, Math.PI * 2);   // para que no arranquen todos igual
  }

  /* Además de correrse con el mundo, sube y baja: el seno va de
     -1 a 1, así que se mueve 48 px para cada lado de su centro. */
  avanzar(dt) {
    this.fase += dt * 4.2;
    this.y = this.centro + Math.sin(this.fase) * 48;
    super.avanzar(dt);
  }

  /* Al tocarlo: hincha al avatar 5 segundos. No resta puntos ni
     vidas, pero hinchado es más difícil pasar por los huecos. */
  alTocar(juego) {
    juego.avatar.hinchar();
    juego.avisarHinchado();
    juego.cartelito('¡Te hinchó!', this.x, this.y - 34, 'cartelito--malo');
  }
}

/* ---- Elemento 2: la gema ---- */
class Gema extends Elemento {
  /* Radio 22: un poco más grande que el dibujo, para que agarrarla
     sea fácil. */
  constructor(x, y, pista) {
    super(x, y, 22, 'gema', pista);
  }

  /* Al tocarla: suma puntos y el avatar festeja. */
  alTocar(juego) {
    juego.sumar(PUNTOS_GEMA, this.x, this.y - 24, 'cartelito--oro');
    juego.avatar.animar('avatar--festeja');
  }
}


/* =========================================================
   6. CLASE Juego — las reglas y el bucle
   ---------------------------------------------------------
   La partida siempre está en UNO de estos estados:

     'inicio'    cartel de arranque, todavía no empezó
     'espera'    el avatar planea quieto, esperando un impulso
     'jugando'   el mundo avanza y corre el bucle
     'choque'    explotó: se frena todo casi un segundo
     'fin'       ganó (llegó a la meta) o perdió (sin vidas)

         inicio -> espera -> jugando -> fin (ganó)
                     ^          |
                     |          v
                     +------- choque -> fin (perdió)

   El mundo solo se mueve en 'jugando'. En cualquier otro estado
   el parallax está en pausa: el fondo se mueve "de acuerdo al
   movimiento del jugador" (consigna, punto 3).
   ========================================================= */
class Juego {
  /* Busca en el HTML las cajas que va a usar (los nombres con $
     son elementos de la página) y crea el avatar. Las columnas y
     los elementos son dos listas que arrancan vacías. */
  constructor() {
    this.$vuelo     = document.getElementById('vuelo');
    this.$mundo     = document.getElementById('mundo');
    this.$pista     = document.getElementById('pista');
    this.$estallido = document.getElementById('estallido');
    this.$hinchado  = document.getElementById('vuelo-hinchado');
    this.$arranque  = document.getElementById('vuelo-arranque');
    this.$fin       = document.getElementById('vuelo-fin');
    this.$btnComenzar  = document.getElementById('btn-comenzar');
    this.$btnReiniciar = document.getElementById('btn-reiniciar');

    this.avatar = new Avatar(document.getElementById('avatar'));
    this.columnas = [];
    this.elementos = [];
    this.estado = 'inicio';

    /* requestAnimationFrame llama a bucle() "suelto", sin el this.
       Con bind queda atado a este Juego. */
    this.bucle = this.bucle.bind(this);
  }

  /* Deja todo en cero y muestra el cartel de arranque. */
  preparar() {
    cancelAnimationFrame(this.idCuadro);
    clearTimeout(this.idChoque);

    this.puntos = 0;
    this.vidas = VIDAS;
    this.tiempo = 0;            // segundos de vuelo
    this.creadas = 0;           // columnas creadas: de esto depende el alto del hueco

    this.limpiarPista();
    this.avatar.colocar();
    this.avatar.animar('avatar--planea');
    this.estado = 'inicio';
    this.frenar();
    this.$vuelo.classList.remove('vuelo--espera');
    this.$estallido.classList.remove('estallido--activo');
    this.$hinchado.hidden = true;

    this.$fin.hidden = true;
    this.$fin.classList.remove('fin--gano', 'fin--perdido');
    this.$arranque.hidden = false;
    this.$btnComenzar.disabled = false;
    this.$btnReiniciar.disabled = true;
    this.pintarHud();
  }

  /* Saca el cartel de arranque y deja al avatar esperando. */
  comenzar() {
    if (this.estado !== 'inicio') return;
    this.$arranque.hidden = true;
    this.$btnComenzar.disabled = true;
    this.$btnReiniciar.disabled = false;
    /* Se le saca el foco al botón: si no, la barra espaciadora
       volvería a "apretarlo" en vez de dar impulso. */
    if (document.activeElement) document.activeElement.blur();
    this.esperar();
  }

  /* Partida nueva desde cero. */
  reiniciar() {
    this.preparar();
    this.comenzar();
  }

  /* ¿Hay una partida en curso? (para saber si atender el teclado) */
  enPartida() {
    return this.estado === 'espera' || this.estado === 'jugando' || this.estado === 'choque';
  }

  /* Frena el mundo: sin la clase, CSS pone en pausa el parallax
     y los spritesheets (animation-play-state). */
  frenar() {
    cancelAnimationFrame(this.idCuadro);
    this.$vuelo.classList.remove('vuelo--andando');
  }

  /* Estado 'espera': el avatar planea en su lugar hasta que el
     jugador dé un impulso. Se usa al empezar, después de perder
     una vida y cuando la pestaña queda en segundo plano. */
  esperar() {
    this.estado = 'espera';
    this.frenar();
    this.avatar.vy = 0;
    this.avatar.animar('avatar--planea');
    this.avatar.dibujar();
    this.$vuelo.classList.add('vuelo--espera');
  }

  /* Pausa: si estaba jugando, pasa a esperar. */
  pausar() {
    if (this.estado === 'jugando') this.esperar();
  }

  /* El jugador pidió un impulso (barra, flecha arriba o clic).
     Si el avatar estaba esperando, este impulso además arranca el
     mundo: prende el parallax y el bucle. */
  impulso() {
    if (this.estado === 'espera') {
      this.estado = 'jugando';
      this.$vuelo.classList.remove('vuelo--espera');
      this.$vuelo.classList.add('vuelo--andando');
      this.anterior = performance.now();
      this.idCuadro = requestAnimationFrame(this.bucle);
    }
    if (this.estado === 'jugando') this.avatar.impulsar();
  }

  /* EL BUCLE: se llama una vez por cuadro de pantalla.
     "ahora" es la hora en milisegundos. Restándole la del cuadro
     anterior sale dt: cuánto tiempo pasó. Con dt, todo se mueve
     según el TIEMPO y no según la cantidad de cuadros.
     El tope de 0.034 es por si la pestaña estuvo trabada: así
     nada pega un salto y atraviesa una columna. */
  bucle(ahora) {
    if (this.estado !== 'jugando') return;        // se apaga solo
    const dt = Math.min((ahora - this.anterior) / 1000, 0.034);
    this.anterior = ahora;
    this.actualizar(dt);
    if (this.estado === 'jugando') this.idCuadro = requestAnimationFrame(this.bucle);
  }

  /* Un cuadro de juego, en orden:
       1) el avatar cae o sube
       2) se crean columnas nuevas cuando toca
       3) avanzan las columnas -> ¿chocó? ¿pasó una?
       4) avanzan los elementos -> ¿tocó alguno?
       5) ¿tocó el piso? ¿llegó a la meta? */
  actualizar(dt) {
    this.tiempo += dt;

    this.avatar.mover(dt);
    if (this.avatar.pasarTiempo(dt)) this.$hinchado.hidden = true;

    /* La próxima columna aparece cuando el mundo avanzó la
       distancia que se sorteó para ella. */
    this.faltaParaColumna -= VELOCIDAD * dt;
    if (this.faltaParaColumna <= 0) this.crearColumna();

    for (const columna of this.columnas) {
      columna.avanzar(dt);
      if (columna.choca(this.avatar)) { this.chocar(columna); return; }
      if (columna.fuePasada(this.avatar)) {
        reiniciarAnimacion(columna.el, 'columna--superada');
        this.sumar(PUNTOS_COLUMNA, this.avatar.x + 46, columna.centro);
      }
    }

    for (const elemento of this.elementos) {
      elemento.avanzar(dt);
      if (!elemento.tocado && elemento.toca(this.avatar)) {
        elemento.tocar();
        elemento.alTocar(this);         // cada elemento sabe qué hace
      }
    }

    /* Lo que ya salió de la pantalla se borra: de la página y de la lista. */
    this.columnas  = this.columnas.filter(c => c.salio() ? (c.quitar(), false) : true);
    this.elementos = this.elementos.filter(e => e.salio() ? (e.quitar(), false) : true);

    if (this.avatar.tocaElSuelo()) { this.chocar(null); return; }

    this.avatar.dibujar();
    this.pintarHud();
    if (this.puntos >= META) this.terminar(true);
  }

  /* Crea una columna en el borde derecho y deja sorteada la que
     viene. Acá están las tres reglas del punto 5 de la consigna:

       a) la DISTANCIA a la próxima se sortea: no es siempre igual
       b) el HUECO se achica 4 px con cada columna, hasta un mínimo
       c) la ALTURA del hueco cambia respecto de la anterior

     Además, en el espacio libre entre esta columna y la próxima
     puede aparecer un elemento: una gema o un murciélago. */
  crearColumna() {
    const hueco  = Math.max(HUECO_MINIMO, HUECO_INICIAL - this.creadas * ACHIQUE);    // (b)
    const centro = this.proximoCentro;
    const columna = new Columna(ANCHO + 10, centro, hueco, this.$pista);
    this.columnas.push(columna);
    this.creadas++;

    const distancia = azar(DISTANCIA_MINIMA, DISTANCIA_MAXIMA);                       // (a)
    this.faltaParaColumna = distancia;

    /* Altura del hueco siguiente: se corre para arriba o para abajo
       entre 40 y 170 px, así nunca queda alineado con el anterior.
       Si de ese lado no entra (se pasa del techo o del piso), se
       corre para el otro; y si tampoco entra, va al borde más lejano. */
    const huecoSiguiente = Math.max(HUECO_MINIMO, HUECO_INICIAL - this.creadas * ACHIQUE);
    const minimo = MARGEN_HUECO + huecoSiguiente / 2;
    const maximo = SUELO - MARGEN_HUECO - huecoSiguiente / 2;
    const noEntra = (y) => y < minimo || y > maximo;
    const salto = azar(SALTO_MINIMO, SALTO_MAXIMO) * (Math.random() < 0.5 ? -1 : 1);  // (c)
    let proximo = centro + salto;
    if (noEntra(proximo)) proximo = centro - salto;
    if (noEntra(proximo)) proximo = (centro - minimo > maximo - centro) ? minimo : maximo;
    this.proximoCentro = proximo;

    /* Elemento en el medio del espacio libre, a una altura cercana
       al camino que va de un hueco al otro. */
    const x = columna.x + ANCHO_COLUMNA + (distancia - ANCHO_COLUMNA) / 2;
    const y = (centro + this.proximoCentro) / 2;
    const tirada = Math.random();
    if (tirada < 0.36) {
      this.elementos.push(new Gema(x, y + azar(-30, 30), this.$pista));
    } else if (tirada < 0.62 && this.creadas > 2 && distancia > 350) {
      const lado = Math.random() < 0.5 ? -1 : 1;
      const altura = limitar(y + lado * azar(30, 60), 90, SUELO - 90);
      this.elementos.push(new Murcielago(x, altura, this.$pista));
    }
  }

  /* Suma puntos, hace latir el marcador y muestra un cartelito
     con lo que se sumó en el lugar donde pasó. */
  sumar(cuanto, x, y, clase = '') {
    this.puntos += cuanto;
    reiniciarAnimacion(document.getElementById('vuelo-puntos'), 'vuelo__puntos--sube');
    this.cartelito('+' + cuanto, x, y, clase);
  }

  /* El avatar chocó contra una columna (o contra el piso, y ahí
     "columna" viene en null). Pierde una vida y se frena todo:
       - el avatar corre su animación de explotar
       - arranca el spritesheet del estallido en el mismo lugar
       - la columna se sacude
       - el parallax queda en pausa
     Casi un segundo después se decide cómo sigue. */
  chocar(columna) {
    this.estado = 'choque';
    this.frenar();
    this.vidas--;

    this.avatar.dibujar();
    this.avatar.animar('avatar--explota');
    this.$estallido.style.transform = `translate(${this.avatar.x}px, ${this.avatar.y}px)`;
    reiniciarAnimacion(this.$estallido, 'estallido--activo');
    if (columna) reiniciarAnimacion(columna.el, 'columna--chocada');

    this.cartelito('-1 vida', this.avatar.x, this.avatar.y - 44, 'cartelito--malo');
    this.pintarHud();
    this.idChoque = setTimeout(() => this.despuesDelChoque(), 950);
  }

  /* Pasado el choque: si no quedan vidas, se terminó. Si quedan,
     se despeja la pista y el avatar vuelve a esperar un impulso. */
  despuesDelChoque() {
    if (this.estado !== 'choque') return;
    if (this.vidas <= 0) { this.terminar(false); return; }
    this.limpiarPista();
    this.avatar.colocar();
    this.$hinchado.hidden = true;
    this.esperar();
  }

  /* Fin de la partida. gano = true si llegó a la meta. */
  terminar(gano) {
    this.estado = 'fin';
    this.frenar();
    this.pintarHud();
    if (gano) this.avatar.animar('avatar--gana');

    const titulo = document.getElementById('vuelo-fin-titulo');
    const texto  = document.getElementById('vuelo-fin-texto');
    if (gano) {
      titulo.textContent = '¡Llegaste a la meta!';
      texto.textContent = `Juntaste ${this.puntos} puntos en ${mmss(this.tiempo)} y te ` +
        (this.vidas === 1 ? 'quedó 1 vida.' : `quedaron ${this.vidas} vidas.`);
    } else {
      titulo.textContent = 'Te quedaste sin vidas';
      texto.textContent = `Llegaste a ${this.puntos} de ${META} puntos en ${mmss(this.tiempo)}. ` +
        'Probá con impulsos cortos y seguidos.';
    }
    this.$fin.classList.add(gano ? 'fin--gano' : 'fin--perdido');
    this.$fin.hidden = false;
  }

  /* Borra todas las columnas y elementos, y deja lista la primera
     columna que va a aparecer. */
  limpiarPista() {
    this.columnas.forEach(c => c.quitar());
    this.elementos.forEach(e => e.quitar());
    this.columnas = [];
    this.elementos = [];
    this.faltaParaColumna = 0;          // 0 = que salga una apenas arranque
    this.proximoCentro = AVATAR_Y + 20; // la primera, a la altura del avatar
  }

  /* Muestra un texto flotante en (x, y). La animación es de CSS;
     cuando termina (animationend) el cartelito se borra solo. */
  cartelito(texto, x, y, clase = '') {
    const el = document.createElement('b');
    el.className = 'cartelito ' + clase;
    el.textContent = texto;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.addEventListener('animationend', () => el.remove());
    this.$mundo.appendChild(el);
  }

  /* Muestra el aviso de "hinchado" y arranca su barra de tiempo. */
  avisarHinchado() {
    this.$hinchado.hidden = false;
    reiniciarAnimacion(this.$hinchado.querySelector('.vuelo__hinchado-barra'), 'vuelo__hinchado-barra');
  }

  /* Pasa los números a la pantalla: la barra de arriba (HUD de la
     plantilla) y el marcador de adentro del escenario. */
  pintarHud() {
    document.getElementById('hud-puntos').textContent = `${this.puntos} / ${META}`;
    document.getElementById('hud-vidas').textContent = '♥'.repeat(this.vidas) + '♡'.repeat(VIDAS - this.vidas);
    document.getElementById('hud-reloj').textContent = mmss(this.tiempo);
    document.getElementById('vuelo-puntos').textContent = this.puntos;
    this.$vuelo.querySelectorAll('.vuelo__vida').forEach((corazon, i) => {
      corazon.classList.toggle('vuelo__vida--perdida', i >= this.vidas);
    });
  }

  /* El mundo mide siempre 960 px de ancho. Si en pantalla la caja
     mide otra cosa, se calcula por cuánto hay que multiplicar y
     se le pasa a CSS en la variable --escala. */
  ajustarEscala() {
    this.$vuelo.style.setProperty('--escala', this.$vuelo.clientWidth / ANCHO);
  }
}


/* =========================================================
   7. ARRANQUE
   ========================================================= */
const juegoActual = JUEGOS.find(j => j.slug === 'frib-vuela');

document.addEventListener('DOMContentLoaded', async () => {
  /* Datos del juego en la cabecera, igual que en las páginas de
     BLOCKA y Peg Solitaire: es la misma plantilla. */
  document.getElementById('juego-titulo').textContent = juegoActual.titulo;
  document.getElementById('miga-cat').textContent = juegoActual.categoria;
  document.getElementById('miga-juego').textContent = juegoActual.titulo;
  document.getElementById('juego-estrellas').innerHTML = estrellas(juegoActual.nota);
  document.getElementById('juego-nota').textContent =
    `${juegoActual.nota.toFixed(1)} (${juegoActual.resenias} reseñas)`;
  document.getElementById('juego-desc').textContent = juegoActual.desc;

  initResenias();        // el hilo de comentarios, que es de la plantilla

  document.getElementById('copiar-link').addEventListener('click', async () => {
    const txt = `Jugué a ${juegoActual.titulo} en frib. ${location.href}`;
    try { await navigator.clipboard.writeText(txt); toast('¡Link copiado!'); }
    catch { toast('Copiá el link desde la barra del navegador'); }
  });

  const juego = new Juego();
  juego.preparar();

  /* ResizeObserver avisa cada vez que cambia el tamaño de la caja
     del escenario (al cargar, al achicar la ventana, al girar la
     pantalla). Ahí se recalcula la escala del mundo. */
  new ResizeObserver(() => juego.ajustarEscala()).observe(juego.$vuelo);

  /* Hasta que no estén las imágenes no se puede empezar. */
  try {
    await cargarImagenes(IMAGENES);
  } catch (e) {
    toast('No se pudieron cargar las imágenes del juego');
    return;
  }

  /* Botones: los dos "Comenzar" hacen lo mismo. */
  document.getElementById('btn-arrancar').addEventListener('click', () => juego.comenzar());
  juego.$btnComenzar.addEventListener('click', () => juego.comenzar());
  juego.$btnReiniciar.addEventListener('click', () => juego.reiniciar());
  document.getElementById('btn-otra').addEventListener('click', () => juego.reiniciar());

  /* IMPULSO con el teclado: barra espaciadora o flecha arriba.
     - Si está escribiendo una reseña, la barra tiene que escribir
       un espacio: no se toca.
     - preventDefault evita que la barra baje la página.
     - e.repeat es true cuando la tecla queda apretada: se ignora,
       cada impulso tiene que ser una pulsación nueva. */
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (!juego.enPartida()) return;
    e.preventDefault();
    if (!e.repeat) juego.impulso();
  });

  /* IMPULSO con el mouse: botón izquierdo sobre el escenario. */
  juego.$vuelo.addEventListener('mousedown', (e) => {
    if (e.button === 0) juego.impulso();
  });

  /* Si la pestaña queda en segundo plano, la partida se pausa. */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) juego.pausar();
  });

  window.vuelo = juego;  // queda a mano para probar desde la consola
});
