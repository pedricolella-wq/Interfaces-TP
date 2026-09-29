/* =========================================================
   frib · data.js
   Catálogo local (respaldo). Todos son juegos reales y clásicos,
   con títulos de distinta longitud y portadas propias de distintos colores.
   ========================================================= */
const JUEGOS = [
  { slug:'2048', titulo:'2048', categoria:'Puzzle', nota:4.9, resenias:1284,
    cucarda:'nuevo', img:'img/covers/2048.jpg',
    desc:'Deslizá las fichas y sumá potencias de dos hasta llegar a la de 2048. Fácil de aprender, imposible de soltar.' },
  { slug:'peg-solitaire', titulo:'Peg Solitaire', categoria:'Puzzle', nota:4.2, resenias:317,
    cucarda:null, img:'img/covers/peg-solitaire.jpg',
    desc:'Saltá una ficha por encima de otra hacia un hueco libre. Ganás si te queda una sola ficha en el centro.' },
  { slug:'ajedrez', titulo:'Ajedrez', categoria:'Estrategia', nota:4.6, resenias:2041,
    cucarda:'top', img:'img/covers/ajedrez.jpg',
    desc:'El clásico de los 64 casilleros, con tres niveles de dificultad y análisis de la partida al terminar.' },
  { slug:'mahjong', titulo:'Mahjong Solitaire', categoria:'Puzzle', nota:3.8, resenias:642,
    cucarda:null, img:'img/covers/mahjong.jpg',
    desc:'Emparejá fichas libres y desarmá la montaña antes de que se agoten los movimientos posibles.' },
  { slug:'buscaminas', titulo:'Buscaminas', categoria:'Lógica', nota:4.1, resenias:889,
    cucarda:null, img:'img/covers/buscaminas.jpg',
    desc:'Despejá el tablero sin pisar una mina. Los números te dicen cuántas hay alrededor de cada casillero.' },
  { slug:'sudoku', titulo:'Sudoku', categoria:'Lógica', nota:4.4, resenias:1520,
    cucarda:'gratis', img:'img/covers/sudoku.jpg',
    desc:'Completá la grilla de 9×9 sin repetir números en filas, columnas ni regiones. Cuatro dificultades.' },
  { slug:'klondike', titulo:'Solitario Klondike', categoria:'Cartas', nota:3.9, resenias:433,
    cucarda:null, img:'img/covers/klondike.jpg',
    desc:'El solitario de toda la vida: armá las cuatro pilas por palo, del as al rey, robando de a una o de a tres.' },
  { slug:'truco', titulo:'Truco Argentino', categoria:'Cartas', nota:4.7, resenias:3106,
    cucarda:'premium', img:'img/covers/truco.jpg',
    desc:'Truco, envido y flor con baraja española, mesa de 2 o 4 jugadores y cantos por voz. Incluye modo torneo.' },
  { slug:'snake', titulo:'Snake', categoria:'Arcade', nota:4.0, resenias:765,
    cucarda:null, img:'img/covers/snake.jpg',
    desc:'Comé, crecé y no te choques. Con modo clásico, modo sin paredes y tabla de récords semanal.' },
  { slug:'pinball', titulo:'Pinball', categoria:'Arcade', nota:4.3, resenias:512,
    cucarda:null, img:'img/covers/pinball.jpg',
    desc:'Mesa de flippers con rampas, multibola y récord global. Física de bola real con efecto de rebote.' },
  { slug:'tres-en-raya', titulo:'Tres en Raya', categoria:'Estrategia', nota:3.5, resenias:198,
    cucarda:null, img:'img/covers/tres-en-raya.jpg',
    desc:'Ta-te-ti contra la máquina o contra un amigo en la misma pantalla. Partidas de treinta segundos.' },
  { slug:'hanoi', titulo:'Torre de Hanói', categoria:'Puzzle', nota:3.7, resenias:276,
    cucarda:null, img:'img/covers/hanoi.jpg',
    desc:'Mové la torre de discos de una varilla a otra sin apoyar nunca un disco grande sobre uno chico.' },
  { slug:'damas', titulo:'Damas', categoria:'Estrategia', nota:4.0, resenias:604,
    cucarda:null, img:'img/covers/damas.jpg',
    desc:'Damas españolas con captura obligatoria, coronación y repetición de jugadas al final de la partida.' },
  { slug:'backgammon', titulo:'Backgammon', categoria:'Estrategia', nota:4.2, resenias:715,
    cucarda:'gratis', img:'img/covers/backgammon.jpg',
    desc:'Uno de los juegos de mesa más antiguos del mundo: dados, estrategia y un poco de suerte.' },
  { slug:'cuatro-en-linea', titulo:'Cuatro en Línea', categoria:'Estrategia', nota:4.1, resenias:958,
    cucarda:null, img:'img/covers/cuatro-en-linea.jpg',
    desc:'Soltá fichas y alineá cuatro en horizontal, vertical o diagonal antes que tu rival.' },
  { slug:'generala', titulo:'Generala', categoria:'Dados', nota:4.5, resenias:1387,
    cucarda:'top', img:'img/covers/generala.jpg',
    desc:'Cinco dados, tres tiros y la planilla clásica: escalera, full, póker y la generala servida.' },
];

/* Filas de la Home (cada juego aparece una sola vez por fila) */
const FILAS = [
  { id:'sugerencias', titulo:'Sugerencias para vos',
    slugs:['peg-solitaire','2048','ajedrez','mahjong','sudoku'] },
  { id:'mas-jugados', titulo:'Los más jugados',
    slugs:['truco','generala','klondike','buscaminas','cuatro-en-linea'] },
  { id:'arcade', titulo:'Arcade',
    slugs:['snake','pinball','tres-en-raya','hanoi','damas'] },
];

/* Slides del hero (respaldo si la API no responde) */
const HERO_LOCAL = [
  { etiqueta:'PREMIUM', titulo:'Truco Argentino', slug:'truco', precio:'4.99',
    bajada:'Mesa de 2 o 4, envido cantado y torneo semanal con premios. Se desbloquea con frib Premium.',
    img:'img/hero/truco.jpg', cta2:'Ver el reglamento' },
  { etiqueta:'PREMIUM', titulo:'Ajedrez', slug:'ajedrez', precio:'5.99',
    bajada:'Partidas clásicas o relámpago, análisis de jugadas y ranking Elo. Se desbloquea con frib Premium.',
    img:'img/hero/ajedrez.jpg', cta2:'Ver el reglamento' },
  { etiqueta:'PREMIUM', titulo:'Generala', slug:'generala', precio:'3.99',
    bajada:'Copa frib de Generala: 64 jugadores, llaves diarias y la tabla que se actualiza en vivo. Se desbloquea con frib Premium.',
    img:'img/hero/generala.jpg', cta2:'Ver el reglamento' },
];

/* Reseñas de la página de juego (para demostrar el paginado) */
const RESENIAS = [
  { quien:'Mica', cuando:'hace 2 días', nota:5, texto:'Lo jugaba con mi abuela, me encantó volver a encontrarlo. El tablero se ve impecable en el celular.' },
  { quien:'Juli',  cuando:'hace 5 días', nota:4, texto:'38 movimientos, ¿alguien baja de 35? Reto abierto para el que se anime.' },
  { quien:'Nico',  cuando:'hace 1 semana', nota:5, texto:'Me sirvió muchísimo que marque los destinos posibles cuando elegís una ficha. Antes me trababa siempre.' },
  { quien:'Sofía', cuando:'hace 1 semana', nota:3, texto:'Está bueno, pero me gustaría poder deshacer más de un movimiento seguido.' },
  { quien:'Tomás', cuando:'hace 2 semanas', nota:5, texto:'Gané dejando la última ficha en el centro después de como veinte intentos. Adictivo.' },
  { quien:'Rocío', cuando:'hace 3 semanas', nota:4, texto:'Perfecto para los viajes en colectivo. Carga rápido y no necesita conexión una vez abierto.' },
  { quien:'Ema',   cuando:'hace 1 mes', nota:4, texto:'El contador de movimientos me hizo competir conmigo misma. Muy bien pensado.' },
  { quien:'Lucas', cuando:'hace 1 mes', nota:5, texto:'Los colores del tablero se leen bárbaro, incluso de noche con poca luz.' },
  { quien:'Vale',  cuando:'hace 1 mes', nota:2, texto:'Me costó entender la regla del salto al principio; el tutorial podría ser más claro.' },
  { quien:'Fran',  cuando:'hace 2 meses', nota:5, texto:'Simple, elegante y sin publicidad. Así tienen que ser los juegos de navegador.' },
];
