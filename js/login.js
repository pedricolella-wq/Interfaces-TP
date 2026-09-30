/* =========================================================
   frib · login.js — tabs, validación y animación de registro correcto
   ========================================================= */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Tabs con indicador que se desliza ----------
     El indicador es un solo elemento; no se mueve cambiando
     su "left" (que obliga al navegador a recalcular layout)
     sino con un transform, que es lo barato de animar.
     El JS solo escribe la variable CSS --x y el CSS hace
     translateX(var(--x)) con una transition: el deslizamiento
     sale gratis y la lógica queda en una sola línea.
     --------------------------------------------------------- */
  const tabs    = document.querySelectorAll('.tabs button');
  const ind     = document.querySelector('.tabs__ind');
  const paneles = { login: document.getElementById('form-login'), registro: document.getElementById('form-registro') };
  const titulo  = document.getElementById('auth-titulo');

  function mostrar(cual, foco = true) {
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === cual)));
    ind.style.setProperty('--x', cual === 'registro' ? '100%' : '0%');
    Object.entries(paneles).forEach(([k, p]) => { p.hidden = (k !== cual); });
    titulo.textContent = cual === 'registro' ? 'Creá tu cuenta en frib' : 'Entrá a tu cuenta';
    history.replaceState(null, '', cual === 'registro' ? '#registro' : '#login');
    if (foco) paneles[cual].querySelector('input')?.focus({ preventScroll: true });
  }
  tabs.forEach(t => t.addEventListener('click', () => mostrar(t.dataset.tab)));
  document.querySelectorAll('[data-ir]').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.ir)));
  mostrar(location.hash === '#registro' ? 'registro' : 'login', false);

  /* ---------- Validación ---------- */
  const reglas = {
    nombre:   v => v.trim().length >= 2         || 'Ingresá tu nombre.',
    apellido: v => v.trim().length >= 2         || 'Ingresá tu apellido.',
    edad:     v => (+v >= 13 && +v <= 120)      || 'Tenés que tener 13 años o más.',
    mail:     v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) || 'Revisá el correo: falta el @ o el dominio.',
    pass:     v => (v.length >= 8 && /[A-Z]/.test(v) && /\d/.test(v)) || 'Mínimo 8 caracteres, una mayúscula y un número.',
  };

  function validarCampo(input) {
    const tipo = input.dataset.regla;
    if (!tipo) return true;
    const r = reglas[tipo](input.value);
    const caja = input.closest('.campo');
    const err = caja.querySelector('.error');
    const ok = r === true;
    input.setAttribute('aria-invalid', String(!ok));
    err.textContent = ok ? '' : r;
    /* Si está mal, el campo tiembla. Mismo truco de reinicio
       que en el hero: sacar la clase, forzar el reflow leyendo
       offsetWidth y volver a ponerla, para que la animación se
       vuelva a ejecutar aunque ya se hubiera ejecutado antes. */
    if (!ok) { input.classList.remove('sacudir'); void input.offsetWidth; input.classList.add('sacudir'); }
    return ok;
  }
  document.querySelectorAll('[data-regla]').forEach(i => {
    i.addEventListener('blur', () => { if (i.value) validarCampo(i); });
    i.addEventListener('input', () => {
      if (i.getAttribute('aria-invalid') === 'true') {
        const caja = i.closest('.campo');
        if (reglas[i.dataset.regla](i.value) === true) { i.setAttribute('aria-invalid','false'); caja.querySelector('.error').textContent=''; }
      }
    });
  });

  /* ---------- Fuerza de la contraseña ---------- */
  const pass = document.getElementById('r-pass'), fuerza = document.getElementById('fuerza');
  if (pass && fuerza) {
    pass.addEventListener('input', () => {
      const v = pass.value;
      let n = 0;
      if (v.length >= 8) n++; if (/[A-Z]/.test(v)) n++; if (/\d/.test(v)) n++; if (/[^A-Za-z0-9]/.test(v)) n++;
      const txt = ['Muy débil','Débil','Aceptable','Buena','Muy buena'][n];
      const col = ['#EF4444','#EF4444','#FACC15','#22C55E','#15803D'][n];
      fuerza.innerHTML = `<i style="width:${n*25}%;background:${col}"></i>`;
      fuerza.nextElementSibling.textContent = v ? txt : '';
    });
  }

  /* ---------- Envío: LOGIN ---------- */
  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const campos = Array.from(e.target.querySelectorAll('[data-regla]'));
    if (!campos.map(validarCampo).every(Boolean)) return;
    if (!e.target.querySelector('.robot input').checked) { toast('Confirmá que no sos un robot'); return; }
    const b = e.target.querySelector('button[type=submit]');
    b.disabled = true; b.textContent = 'Entrando…';
    setTimeout(() => { location.href = 'index.html'; }, 900);
  });

  /* ---------- Envío: REGISTRO + animación de éxito ---------- */
  document.getElementById('form-registro').addEventListener('submit', (e) => {
    e.preventDefault();
    const campos = Array.from(e.target.querySelectorAll('[data-regla]'));
    if (!campos.map(validarCampo).every(Boolean)) {
      e.target.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (!e.target.querySelector('.robot input').checked) { toast('Confirmá que no sos un robot'); return; }
    const nombre = document.getElementById('r-nombre').value.trim();
    festejar(nombre);
  });

  /* ---------- Animación de registro correcto ----------
     Es la animación que pide la consigna al registrarse bien.
     Se compone de tres partes, todas CSS:
       · el tilde SVG que se dibuja solo (stroke-dashoffset),
       · el título, el texto y el botón entrando en cascada,
       · 70 papelitos de confeti cayendo.
     El JS únicamente agrega la clase .visible y crea los
     papelitos; los keyframes están en animations.css (bloque H).
     --------------------------------------------------------- */
  function festejar(nombre) {
    const caja = document.getElementById('exito');
    document.getElementById('exito-nombre').textContent = nombre ? `¡Bienvenido, ${nombre}!` : '¡Cuenta creada!';
    caja.classList.add('visible');
    caja.setAttribute('aria-hidden', 'false');
    lanzarConfeti();
    setTimeout(() => document.getElementById('exito-cta').focus(), 900);
  }

  /* Confeti: se crean 70 <i> y a cada uno se le da al azar
     posición horizontal, color, duración y retraso. Esa
     variación es lo que hace que parezca confeti de verdad y
     no 70 cuadraditos cayendo sincronizados. La animación en
     sí (caer y girar 720°) es un @keyframes.
     A los 4,2 s se vacía la capa para no dejar 70 nodos
     animándose de fondo. */
  function lanzarConfeti() {
    const capa = document.getElementById('confeti');
    capa.innerHTML = '';
    const colores = ['#A3E635','#22C55E','#FACC15','#3D52C9','#FAF6E3','#EF4444'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colores[i % colores.length];
      c.style.animationDuration = (1.7 + Math.random() * 1.6) + 's';
      c.style.animationDelay = (Math.random() * .6) + 's';
      c.style.transform = `rotate(${Math.random()*360}deg)`;
      capa.appendChild(c);
    }
    setTimeout(() => { capa.innerHTML = ''; }, 4200);
  }

  /* ---------- Mostrar / ocultar contraseña ---------- */
  document.querySelectorAll('[data-ojo]').forEach(b => b.addEventListener('click', () => {
    const inp = document.getElementById(b.dataset.ojo);
    const ver = inp.type === 'password';
    inp.type = ver ? 'text' : 'password';
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.textContent = ver ? '🙈' : '👁';
  }));
});
