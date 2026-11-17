# frib · Ejercicio Entregable Nº5 — "Frib Vuela"

**Interfaces de Usuario e Interacción (TUDAI).** Un *horizontal scroller* tipo Flappy Bird hecho con
**HTML + CSS3 (animaciones) + JavaScript**, sin `<canvas>`, sin frameworks y sin librerías.
Se juega en **`flappy.html`** y se llega desde la Home (filas *Sugerencias para vos* y *Arcade*).

| Archivo | Qué tiene |
|---|---|
| `flappy.html` | La página del juego (la misma plantilla que BLOCKA y Peg Solitaire) y el escenario: un `<div>` por capa |
| `css/flappy.css` | **Todas las animaciones**: parallax, spritesheets y reacciones del avatar, en sintaxis larga (`animation-name`, `animation-duration`…) |
| `js/flappy.js` | Física, choques, puntaje y vidas. No anima nada: **prende y apaga clases** y CSS hace el resto |
| `img/vuelo/` | Las 6 capas del paisaje, los 3 spritesheets y las columnas |

## Checklist de la consigna Nº5

| # | Qué pide | Cómo está resuelto | Dónde mirar |
|---|---|---|---|
| 1 | Avanza a velocidad constante; el usuario da impulso hacia arriba | El mundo se corre siempre a `VELOCIDAD = 240` px/s. Cada impulso deja la velocidad vertical en `IMPULSO = -430`; después la gravedad la baja | `flappy.js` → `Avatar.impulsar()`, `Avatar.mover(dt)` |
| 2 | Al menos 3 animaciones keyframe según la acción | Son 7: `planear` (espera), `aletear` + `batir-ala` (impulso), `festejar` (gema), `explotar` (choque), `celebrar` (gana), `hincharse` y `deshincharse` (murciélago) | `flappy.css` sección **D** · `Avatar.animar()` |
| 3 | Parallax de 4 capas o más, con la velocidad correcta | 6 capas: el cielo quieto y 5 que se mueven con **el mismo** `@keyframes desplazar`. Solo cambia la duración: 128 / 64 / 32 / 16 / 8 s, o sea 15 / 30 / 60 / 120 / 240 px/s. El suelo va a 240 px/s, igual que las columnas. Las capas solo corren mientras el avatar avanza (`animation-play-state`) | `flappy.css` sección **B** |
| 4 | 2 elementos animados distintos con spritesheet, que no terminen el juego | **Murciélago** (6 cuadros, `steps(6)`) y **gema** (8 cuadros, `steps(8)`). El estallido del avatar es un tercer spritesheet (8 cuadros) | `flappy.css` sección **C** · `class Murcielago`, `class Gema` |
| 5 | El avatar interactúa con las tuberías con una animación acorde | Al pasar una columna, la columna brilla (`brillar`) y suma. Al chocarla, el avatar explota y la columna se sacude (`sacudir`) | `flappy.css` sección **E** · `Juego.chocar()` |
| 5a | La distancia horizontal no es siempre la misma | Se sortea entre 300 y 460 px para cada columna | `Juego.crearColumna()` |
| 5b | El hueco se achica a medida que avanza | Empieza en 230 px y baja 4 px por columna hasta 150 px | `Juego.crearColumna()` |
| 5c | Los huecos no están alineados | Cada hueco se corre entre 40 y 170 px para arriba o para abajo respecto del anterior | `Juego.crearColumna()` |
| 6 | Puntaje o tiempo para determinar el final; los dos elementos no hacen lo mismo | Se gana al llegar a **50 puntos**; se pierde al quedarse sin las 3 vidas. La **gema suma 5 puntos**. El **murciélago no toca el puntaje**: hincha al avatar 5 segundos | `Gema.alTocar()`, `Murcielago.alTocar()`, `Juego.terminar()` |
| 7 | Integrado en la web, con ayudas, descripción e imágenes | Card en la Home, página con la plantilla de juego, "Cómo se juega", controles, "Qué hay en el camino" con los sprites animados y una captura | `flappy.html` · `js/data.js` |

### Cómo se reparte el trabajo

```
        JS (flappy.js)                         CSS (flappy.css)
  ----------------------------          ------------------------------
  calcula posiciones y choques   --->   translate() en cada <div>
  decide QUÉ pasó                --->   una clase: avatar--aletea,
  (impulso, gema, choque...)            columna--chocada, vuelo--andando
                                        y el @keyframes de esa clase
                                        dice CÓMO se ve
```

El arte de `img/vuelo/` se generó para este trabajo: cada pieza se escribió como SVG con un script de
Python y se rasterizó a WebP. Las capas están hechas para empalmar consigo mismas (1920 px de ancho).

---

# Entregas anteriores (la misma web)

Lo que sigue es la documentación del portal, que viene de las entregas anteriores y sigue vigente.

## Portal frib · Ejercicio Entregable Nº2 — Interfaces de Usuario e Interacción (TUDAI)

Implementación en **HTML5 + CSS3 + JavaScript puro** del portal de juegos *frib* diseñado en el TPE #1.
**Sin frameworks**: no se usa Angular, React, Vue, Bootstrap ni ninguna librería externa.

## Cómo verlo

Abrir `index.html` o entrar a la publicación de GitHub Pages (branch `gh-pages`).
Conviene servirlo por HTTP (`python3 -m http.server`) para que el `fetch` a la API funcione sin restricciones de origen.

## Páginas

| Archivo | Pantalla | Responsive |
|---|---|---|
| `index.html` | Home | **mobile y desktop** |
| `login.html` | Login / Registro (un solo card con tabs) | desktop |
| `juego.html?j=peg-solitaire` | Página de ejecución del juego | desktop |

---

## Checklist de la consigna

### 1. Interacción con las 3 páginas
- La Home permite **buscar** juegos (buscador con resultados en vivo), **recorrer los carruseles**,
  marcar **favoritos**, abrir el **menú hamburguesa** y entrar a la página de un juego desde cualquier card.
- `juego.html` tiene el **Peg Solitaire realmente jugable**: selección de ficha, marcado de destinos válidos,
  salto con animación, contador de movimientos y fichas, reloj, deshacer, reiniciar y detección de victoria
  (incluye la “partida perfecta” cuando la última ficha queda en el centro).
- `login.html` valida los campos en vivo y alterna entre login y registro sin cambiar de pantalla.

### 2. Animaciones *hover* en botones — **4 distintas**
Están todas documentadas en `css/animations.css`, sección **C**:

| Botón | Clase | Animación |
|---|---|---|
| **JUGAR** (primario) | `.btn--primario` | se eleva y escala + **glow pulsante** (`@keyframes latido`) + aparece el borde azul; al presionar, sombra interior |
| **Guardar partida / Publicar** (secundario) | `.btn--secundario` | **barrido de relleno** de izquierda a derecha con `::before` y `scaleX` |
| **Ver más / Cancelar** (terciario) | `.btn--terciario` | la **flecha se desliza** hacia la derecha y el texto abre el `letter-spacing` |
| **Flechas de carrusel** (ícono) | `.btn-icono` | **giro de 360°** + **onda expansiva** (`@keyframes onda`) |

Extra: las **cards** combinan elevación + zoom del arte + aparición del botón JUGAR; los íconos de redes
del footer rotan; la cucarda PREMIUM late sola.

### 3. Loading simulado de 5 segundos
`js/loader.js` + `css/animations.css` (sección **B**).
Dura exactamente **5000 ms** medidos con `requestAnimationFrame`, muestra el **porcentaje real 0 → 100 %**,
una barra de progreso y mensajes de estado. La animación es **100 % CSS** (`conic-gradient` girando,
anillo punteado en sentido contrario y un **cuadrado que orbita**): **no se usa ningún GIF ni spritesheet**.

### 4. Galería/carrusel con transición animada
- **Hero de la Home**: cruce de opacidad + **Ken Burns** (`@keyframes ken-burns`) sobre la imagen +
  entrada escalonada del texto + barra de progreso del autoplay. Flechas, bullets y *swipe* táctil.
- **Filas de la Home**: cuatro carruseles horizontales con flechas, bullets y *scroll-snap*,
  con entrada escalonada de las cards al aparecer en pantalla.

### 5. Datos reales, no genéricos
16 juegos reales y clásicos, con **títulos de distinta longitud** (`2048`, `Snake`, `Buscaminas`,
`Mahjong Solitaire`, `Solitario Klondike`, `Truco Argentino`, `Cuatro en Línea`…), **categorías**,
**puntajes** y descripciones propias. Cada juego tiene una **portada distinta**, generada para este
trabajo, con **paletas y motivos diferentes** (ámbar, turquesa, púrpura, verde, vino, marrón…) para ver
cómo se acomoda el diseño con imágenes variadas. Las reseñas también son textos reales, no *lorem ipsum*.

### 6. Plus: API de la cátedra
`js/api.js` consume **`https://vj.interfaces.jima.com.ar/api/v2`** con `fetch`, `AbortController` y
timeout de 8 s. Con esos datos se arma la fila **“Novedades”** (título, imagen, puntaje y género
traducido al español). Mientras carga se muestran *skeletons* animados y, **si la API no responde,
la fila cae automáticamente al catálogo local** y lo aclara en pantalla.

### 7. Mobile First
El CSS está escrito **mobile primero**: las reglas base son las del celular y los `@media (min-width: …)`
van sumando (560 / 760 / 900 / 1024 / 1500 px). En mobile la Home usa carruseles deslizables con bullets
y una sola columna; en desktop aparecen las flechas de los carruseles y hasta 5 columnas por fila.

El **header es el mismo organismo del design system en todos los tamaños**:
`hamburguesa + logo + buscador + perfil`. El **menú hamburguesa está siempre presente**, también en
desktop, y despliega el panel lateral con las categorías (la activa marcada con la píldora lima) y la
sección “Tu cuenta”, igual que el organismo *menú hamburguesa desplegado* del TPE #1. Se cierra con la
X animada, con clic en el fondo o con `Escape`.

---

## Correcciones del TPE #1 aplicadas

1. **Paleta**: 1 primario con luces y sombras, 1 secundario con luces y sombras, 1 acento y 2 neutros (`:root` de `styles.css`).
2. **JUGAR vs JUGAR hover**: tres estados claramente distintos (normal / hover con borde azul y glow / pressed con sombra interior). *Guardar partida* usa el estilo **secundario** porque es una acción de apoyo, nunca compite con el primario.
3. **Patrón de registro/login**: un único card con **tabs (segmented control)**; los campos obligatorios llevan `*` y está la referencia “* Campos obligatorios”.
4. **Desde registro se llega a login** por el tab y también por el link del pie (y al revés).
5. **Login social con los logos originales** de Google y Facebook, en SVG.
6. **Tres carruseles de juegos** (más el de Novedades de la API), todos con **portadas distintas entre sí**.
7. **Fat footer** con columna de marca, 5 columnas de enlaces, newsletter, divisor y barra inferior alineada a los márgenes.
8. **Cucardas diferenciadas**: NUEVO (lima), TOP 10 (contorno + flecha), GRATIS (verde con corte diagonal) y PREMIUM (degradado con corona y latido).
9. **El banner tiene flechas** como los demás carruseles.
10. **Espaciado parejo** entre carrusel y bullets, y entre todas las filas.
11. **Reseñas paginadas**: patrón *load more* con “Ver más reseñas” y contador “Mostrando N de 317”.
    El hilo sigue el estándar de las tiendas de apps y de los comentarios de video: resumen con el
    promedio y la **distribución de estrellas**, selector de orden (relevantes / recientes / mejores /
    peores), avatar con inicial, antigüedad, horas jugadas, **me gusta / no me gusta** y **Responder**.
12. **Un solo Guardar**, dentro de la barra del juego (se eliminó el de arriba a la derecha y el corazón duplicado).
13. **“Compartí tu récord” va dentro del juego** y se eliminó “Puntuá el juego” (el puntaje se carga desde la reseña).
14. **El logo y la miga “Inicio” siempre vuelven a la Home**, en las tres páginas.

---

## Estructura

```
index.html          Home (mobile + desktop)
login.html          Login / Registro
juego.html          Página del juego (Peg Solitaire jugable)
blocka.html         BLOCKA (Entregable Nº3)
flappy.html         Frib Vuela (Entregable Nº5)
css/styles.css      Reset, tokens del design system, layout y componentes
css/animations.css  Todos los @keyframes, hovers, loader y transiciones
js/data.js          Catálogo local de juegos, filas y reseñas
js/ui.js            Header, menú, buscador, cards, cucardas, toasts, reveal
js/api.js           Consumo de la API de la cátedra (+ fallback)
js/loader.js        Carga simulada de 5 s con porcentaje
js/home.js          Hero, filas y fila de Novedades
js/login.js         Tabs, validación y animación de registro correcto
js/blocka.js        BLOCKA (Entregable Nº3): canvas, filtros pixel a pixel y giro de piezas
js/flappy.js        Frib Vuela (Entregable Nº5): clases Avatar, Columna, Elemento,
                    Murcielago, Gema y Juego. Física, choques y reglas
css/flappy.css      Frib Vuela: parallax, spritesheets y animaciones del avatar
js/peg.js           Peg Solitaire (Entregable Nº4): clases Ficha y Tablero,
                    drag & drop sobre canvas con mousedown/mousemove/mouseup,
                    hints animados, validación de saltos, reloj y fin de partida
img/vuelo           Frib Vuela: capas de parallax, spritesheets y columnas
img/covers          18 portadas originales (una por juego)
img/hero            3 banners del destacado
```

## Accesibilidad
HTML semántico, `aria-*` en tabs, carruseles y estados, foco visible, textos alternativos,
enlace “Saltar al contenido” y soporte de `prefers-reduced-motion`.

## Créditos de imágenes
Todo el arte (`img/`) fue **generado para este trabajo** con un script propio de Python + Pillow:
son composiciones geométricas originales, no reproducen material de terceros.
Las imágenes de la fila “Novedades” provienen de la API de la cátedra.
