/* NOTA sobre este archivo: es el "Plus" de la consigna, el
   consumo de la API de la cátedra. Dos decisiones a explicar:
     · AbortController + setTimeout: si la API no contesta en
       8 s se cancela el pedido, porque una promesa colgada
       dejaría la fila cargando para siempre.
     · normalizar(): la API devuelve los campos con otros
       nombres (name, background_image, rating…). Se traducen
       al formato del catálogo local para que las cards no
       sepan de dónde vinieron los datos.
   Si falla, home.js muestra el catálogo local de respaldo.
*/
/* =========================================================
   frib · api.js
   PLUS de la consigna: consumo de la API de la cátedra
   https://vj.interfaces.jima.com.ar/api/v2
   Si la API no responde, la fila se completa con el catálogo local.
   ========================================================= */
'use strict';

const API_URL = 'https://vj.interfaces.jima.com.ar/api/v2';

/** Trae los juegos de la API con timeout. Devuelve [] si falla. */
async function traerJuegosAPI(timeoutMs = 8000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const datos = await res.json();
    if (!Array.isArray(datos)) throw new Error('Formato inesperado');
    return datos.map(normalizar).filter(j => j.img);
  } catch (err) {
    console.warn('[frib] La API de la cátedra no respondió:', err.message);
    return [];
  } finally {
    clearTimeout(id);
  }
}

/** Lleva el objeto de la API al mismo formato que el catálogo local. */
function normalizar(g) {
  const generos = (g.genres || []).map(x => x.name);
  return {
    slug: 'api-' + g.id,
    titulo: g.name || 'Sin título',
    categoria: traducirGenero(generos[0]) || 'Destacado',
    nota: Number(g.rating || 0),
    resenias: null,
    cucarda: null,
    img: g.background_image_low_res || g.background_image || '',
    desc: (g.description || '').replace(/<[^>]*>/g, '').slice(0, 220),
    plataformas: (g.platforms || []).map(p => p.name),
    lanzamiento: g.released || '',
    esAPI: true,
  };
}

const GENEROS = {
  Action:'Acción', Adventure:'Aventura', RPG:'Rol', Strategy:'Estrategia', Shooter:'Disparos',
  Puzzle:'Puzzle', Racing:'Carreras', Sports:'Deportes', Indie:'Indie', Casual:'Casual',
  Simulation:'Simulación', Arcade:'Arcade', Platformer:'Plataformas', Fighting:'Peleas',
  Family:'Familia', 'Massively Multiplayer':'Multijugador', Board:'Mesa', Card:'Cartas', Educational:'Educativo'
};
function traducirGenero(g) { return GENEROS[g] || g; }
