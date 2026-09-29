# frib · Ejercicio Entregable Nº2 — Interfaces de Usuario e Interacción (TUDAI)

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
- **Galería de la página de juego**: transición **flip 3D con desenfoque**
  (`@keyframes flip-entrada` / `flip-salida`), miniaturas, flechas y reproducción automática.
- **Filas de la Home**: carruseles horizontales con flechas, bullets y *scroll-snap*.

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
12. **Un solo Guardar**, dentro de la barra del juego (se eliminó el de arriba a la derecha y el corazón duplicado).
13. **“Compartí tu récord” va dentro del juego** y se eliminó “Puntuá el juego” (el puntaje se carga desde la reseña).
14. **El logo y la miga “Inicio” siempre vuelven a la Home**, en las tres páginas.

---

## Estructura

```
index.html          Home (mobile + desktop)
login.html          Login / Registro
juego.html          Página del juego (Peg Solitaire jugable)
css/styles.css      Reset, tokens del design system, layout y componentes
css/animations.css  Todos los @keyframes, hovers, loader y transiciones
js/data.js          Catálogo local de juegos, filas y reseñas
js/ui.js            Header, menú, buscador, cards, cucardas, toasts, reveal
js/api.js           Consumo de la API de la cátedra (+ fallback)
js/loader.js        Carga simulada de 5 s con porcentaje
js/home.js          Hero, filas y fila de Novedades
js/login.js         Tabs, validación y animación de registro correcto
js/juego.js         Peg Solitaire, galería animada y reseñas
img/covers          16 portadas originales (una por juego)
img/hero            3 banners del destacado
img/galeria         4 capturas del juego
```

## Accesibilidad
HTML semántico, `aria-*` en tabs, carruseles y estados, foco visible, textos alternativos,
enlace “Saltar al contenido” y soporte de `prefers-reduced-motion`.

## Créditos de imágenes
Todo el arte (`img/`) fue **generado para este trabajo** con un script propio de Python + Pillow:
son composiciones geométricas originales, no reproducen material de terceros.
Las imágenes de la fila “Novedades” provienen de la API de la cátedra.
