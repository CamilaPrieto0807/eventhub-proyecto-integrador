const EVENTOS = {
  'festival-sonoro': { nombre: 'Festival Sonoro 2026', precio: 85000, aforo: 30 },
  'ultimo-acto': { nombre: 'Obra: El Último Acto', precio: 45000, aforo: 24 },
  comedia: { nombre: 'Noche de Comedia Stand-Up', precio: 30000, aforo: 20 },
  'copa-regional': { nombre: 'Copa Regional de Fútbol', precio: 20000, aforo: 40 },
  'jazz-parque': { nombre: 'Jazz en el Parque', precio: 40000, aforo: 25 },
  'tarde-cuentos': { nombre: 'Tarde de Cuentos', precio: 15000, aforo: 18 },
  'festival-cafe': { nombre: 'Festival Café y Montaña', precio: 65000, aforo: 26 },
  'teatro-familiar': { nombre: 'El Bosque de los Sueños', precio: 22000, aforo: 35 },
  'salsa-cali': { nombre: 'Cali Baila: Noche de Salsa', precio: 55000, aforo: 32 },
  'diseno-cali': { nombre: 'Mercado Creativo del Valle', precio: 18000, aforo: 50 },
  'rock-bogota': { nombre: 'Bogotá Rock Fest', precio: 72000, aforo: 60 },
  'planetario-bogota': { nombre: 'Misterios del Universo', precio: 26000, aforo: 40 },
  'electro-medellin': { nombre: 'Ritmo Electrónico', precio: 68000, aforo: 42 },
  'danza-medellin': { nombre: 'Cuerpos en Escena', precio: 35000, aforo: 28 }
};

const STORAGE = {
  users: 'eventhub.users',
  currentUser: 'eventhub.currentUser',
  inventory: 'eventhub.inventory',
  reservations: 'eventhub.reservations',
  accessibility: 'eventhub.accessibility'
};

const MAX_ENTRADAS_POR_COMPRA = 10;
const formatoCOP = (value) => `$${Number(value).toLocaleString('es-CO')}`;

function readStore(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw);
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getInventory() {
  const inventory = readStore(STORAGE.inventory, {});
  Object.entries(EVENTOS).forEach(([id, evento]) => {
    if (!inventory[id]) inventory[id] = { aforo: evento.aforo, vendidos: 0 };
  });
  return inventory;
}

function currentUser() {
  const email = localStorage.getItem(STORAGE.currentUser);
  if (!email) return null;
  return readStore(STORAGE.users, []).find((user) => user.email === email) || null;
}

function showFeedback(element, message, isError = false) {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
}

function initializeAccessibility() {
  const settings = {
    fontScale: 1,
    boldText: false,
    darkMode: false,
    highContrast: false,
    underlineLinks: false,
    reduceMotion: false
  };
  const root = document.documentElement;
  const widget = document.createElement('aside');
  widget.className = 'accessibility-widget';
  widget.innerHTML = `
    <button class="accessibility-trigger" type="button" aria-expanded="false" aria-controls="accessibilityPanel" aria-label="Abrir opciones de accesibilidad">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="4.5" r="2"></circle>
        <path d="M4 8.5h16M12 8.5v5m0 0-4 7m4-7 4 7M7 10l2 5m8-5-2 5"></path>
      </svg>
      <span>Accesibilidad</span>
    </button>
    <section class="accessibility-panel" id="accessibilityPanel" aria-labelledby="accessibilityTitle" hidden>
      <div class="accessibility-panel-heading">
        <div>
          <p class="eyebrow">Personaliza tu experiencia</p>
          <h2 id="accessibilityTitle">Accesibilidad</h2>
        </div>
        <button class="accessibility-close" type="button" aria-label="Cerrar opciones de accesibilidad">×</button>
      </div>
      <div class="accessibility-font-controls" aria-labelledby="fontSizeLabel">
        <span id="fontSizeLabel">Tamaño del texto</span>
        <div class="font-size-buttons">
          <button type="button" data-font-step="-1" aria-label="Reducir tamaño del texto">A−</button>
          <output data-font-size aria-live="polite">100%</output>
          <button type="button" data-font-step="1" aria-label="Aumentar tamaño del texto">A+</button>
        </div>
      </div>
      <fieldset class="accessibility-options">
        <legend>Preferencias visuales</legend>
        <label class="accessibility-option">
          <span><strong>Texto en negrita</strong><small>Mejora la definición de las letras</small></span>
          <input type="checkbox" data-accessibility="boldText">
        </label>
        <label class="accessibility-option">
          <span><strong>Modo oscuro</strong><small>Reduce la luminosidad de la pantalla</small></span>
          <input type="checkbox" data-accessibility="darkMode">
        </label>
        <label class="accessibility-option">
          <span><strong>Alto contraste</strong><small>Resalta textos y elementos</small></span>
          <input type="checkbox" data-accessibility="highContrast">
        </label>
        <label class="accessibility-option">
          <span><strong>Subrayar enlaces</strong><small>Facilita identificar dónde hacer clic</small></span>
          <input type="checkbox" data-accessibility="underlineLinks">
        </label>
        <label class="accessibility-option">
          <span><strong>Reducir movimiento</strong><small>Minimiza animaciones y desplazamientos</small></span>
          <input type="checkbox" data-accessibility="reduceMotion">
        </label>
      </fieldset>
      <button class="accessibility-reset" type="button">Restablecer preferencias</button>
      <p class="accessibility-status" role="status" aria-live="polite"></p>
    </section>
  `;
  document.body.append(widget);

  const trigger = widget.querySelector('.accessibility-trigger');
  const panel = widget.querySelector('.accessibility-panel');
  const closeButton = widget.querySelector('.accessibility-close');
  const status = widget.querySelector('.accessibility-status');
  const fontSize = widget.querySelector('[data-font-size]');
  const inputs = [...widget.querySelectorAll('[data-accessibility]')];

  const setOpen = (open) => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Cerrar opciones de accesibilidad' : 'Abrir opciones de accesibilidad');
    if (open) closeButton.focus();
    else trigger.focus();
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE.accessibility, JSON.stringify(settings));
      status.textContent = 'Preferencias guardadas en este navegador.';
    } catch (error) {
      status.textContent = 'No fue posible guardar las preferencias en este navegador.';
    }
  };

  const applySettings = () => {
    root.style.fontSize = `${settings.fontScale * 100}%`;
    document.body.classList.toggle('accessibility-bold', settings.boldText);
    document.body.classList.toggle('accessibility-dark', settings.darkMode);
    document.body.classList.toggle('accessibility-contrast', settings.highContrast);
    document.body.classList.toggle('accessibility-underline', settings.underlineLinks);
    document.body.classList.toggle('accessibility-reduced-motion', settings.reduceMotion);
    root.classList.toggle('accessibility-reduced-motion', settings.reduceMotion);
    fontSize.value = `${Math.round(settings.fontScale * 100)}%`;
    inputs.forEach((input) => {
      input.checked = settings[input.dataset.accessibility];
    });
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.accessibility) || '{}');
    if (saved && typeof saved === 'object') {
      if (Number.isFinite(saved.fontScale)) settings.fontScale = Math.min(1.5, Math.max(0.8, saved.fontScale));
      ['boldText', 'darkMode', 'highContrast', 'underlineLinks', 'reduceMotion'].forEach((key) => {
        if (typeof saved[key] === 'boolean') settings[key] = saved[key];
      });
    }
  } catch (error) {
    status.textContent = 'No fue posible cargar las preferencias guardadas.';
  }
  applySettings();

  trigger.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => setOpen(false));
  widget.querySelectorAll('[data-font-step]').forEach((button) => {
    button.addEventListener('click', () => {
      settings.fontScale = Math.min(1.5, Math.max(0.8, settings.fontScale + Number(button.dataset.fontStep) * 0.1));
      applySettings();
      saveSettings();
    });
  });
  inputs.forEach((input) => {
    input.addEventListener('change', () => {
      settings[input.dataset.accessibility] = input.checked;
      applySettings();
      saveSettings();
    });
  });
  widget.querySelector('.accessibility-reset').addEventListener('click', () => {
    settings.fontScale = 1;
    settings.boldText = false;
    settings.darkMode = false;
    settings.highContrast = false;
    settings.underlineLinks = false;
    settings.reduceMotion = false;
    applySettings();
    saveSettings();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });
}

function getAuthFeedback(form) {
  return form.querySelector('.form-feedback');
}

async function hashPassword(password) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Este navegador no permite proteger la contraseña en esta ubicación. Abre el sitio desde localhost o HTTPS.');
  }
  const bytes = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function redirectAfterAuth(fallback) {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && /^[a-z0-9-]+\.html(?:\?[a-zA-Z0-9%=&_-]*)?$/i.test(next)) {
    window.location.href = next;
    return;
  }
  window.location.href = fallback;
}

function initializeNavigation() {
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  if (navToggle && mainNav) {
    const setMenu = (isOpen) => {
      mainNav.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    };

    navToggle.addEventListener('click', () => setMenu(!mainNav.classList.contains('is-open')));
    mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });
  }

  const user = currentUser();
  if (!user || !mainNav) return;
  const loginLink = [...mainNav.querySelectorAll('a')].find((link) => link.textContent.trim() === 'Ingresar');
  const registerLink = [...mainNav.querySelectorAll('a')].find((link) => link.textContent.trim() === 'Regístrate');
  if (loginLink) {
    loginLink.href = 'perfil.html';
    loginLink.textContent = 'Mi perfil';
  }
  if (registerLink) {
    registerLink.href = '#';
    registerLink.textContent = 'Cerrar sesión';
    registerLink.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem(STORAGE.currentUser);
      window.location.href = 'index.html';
    });
  }
}

function initializeEventSearch() {
  const eventosGrid = document.getElementById('eventosGrid');
  const params = new URLSearchParams(window.location.search);
  const consulta = (params.get('q') || '').trim().toLowerCase();
  const ciudad = (params.get('ciudad') || '').trim().toLowerCase();
  const categoria = (params.get('categoria') || '').trim().toLowerCase();
  const buscar = document.getElementById('buscarEvento');
  const ciudadSelect = document.getElementById('ciudadEvento');
  const categoriaActual = document.getElementById('categoriaActual');

  if (buscar && eventosGrid) buscar.value = params.get('q') || '';
  if (ciudadSelect && eventosGrid && params.get('ciudad')) ciudadSelect.value = params.get('ciudad');
  if (categoriaActual && eventosGrid) categoriaActual.value = params.get('categoria') || '';

  if (eventosGrid) document.querySelectorAll('[data-chip]').forEach((chip) => {
    const value = chip.dataset.chip || '';
    const next = new URLSearchParams(params);
    if (value) next.set('categoria', value);
    else next.delete('categoria');
    const query = next.toString();
    chip.href = query ? `eventos.html?${query}` : 'eventos.html';
    chip.classList.toggle('is-active', value.toLowerCase() === categoria);
  });

  let inventory;
  try {
    inventory = getInventory();
    writeStore(STORAGE.inventory, inventory);
  } catch (error) {
    inventory = {};
    const feedback = document.getElementById('eventosConteo');
    if (feedback) showFeedback(feedback, 'No se pudo cargar el aforo del navegador.', true);
  }

  const cards = [...document.querySelectorAll('.evento-card[data-event-id]')];
  let visibles = 0;
  const canPurchase = Boolean(currentUser());
  cards.forEach((card) => {
    if (eventosGrid && eventosGrid.contains(card)) {
      const texto = card.textContent.toLowerCase();
      const coincide =
        (!consulta || texto.includes(consulta)) &&
        (!ciudad || (card.dataset.ciudad || '').toLowerCase() === ciudad) &&
        (!categoria || (card.dataset.categoria || '').toLowerCase() === categoria);
      card.hidden = !coincide;
      if (coincide) visibles += 1;
    }

    const id = card.dataset.eventId;
    const stock = id && inventory[id];
    const stockLabel = card.querySelector(`[data-stock-for="${id}"]`);
    const buyButton = card.querySelector('a[href^="checkout.html"]');
    if (buyButton && !canPurchase) {
      buyButton.href = `login.html?next=${encodeURIComponent(`checkout.html?evento=${id}`)}`;
      buyButton.textContent = 'Inicia sesión para comprar';
      buyButton.setAttribute('aria-label', `Inicia sesión para comprar entradas de ${EVENTOS[id]?.nombre || 'este evento'}`);
    }
    if (stock && stockLabel) {
      const remaining = Math.max(0, stock.aforo - stock.vendidos);
      stockLabel.textContent = remaining === 0
        ? 'Agotado'
        : `Quedan ${remaining} ${remaining === 1 ? 'entrada' : 'entradas'}`;
      stockLabel.classList.toggle('is-sold-out', remaining === 0);
      stockLabel.setAttribute('aria-live', 'polite');
    }
    if (stock && stock.aforo <= stock.vendidos && buyButton) {
      buyButton.textContent = 'Entradas agotadas';
      buyButton.classList.add('is-disabled');
      buyButton.setAttribute('aria-disabled', 'true');
      buyButton.removeAttribute('href');
    }
  });

  if (eventosGrid) {
    const conteo = document.getElementById('eventosConteo');
    const vacio = document.getElementById('eventosVacio');
    if (conteo) conteo.textContent = visibles === 1 ? '1 evento' : `${visibles} eventos`;
    if (vacio) vacio.hidden = visibles !== 0;
  }
}

function initializeRegistration() {
  const form = document.getElementById('registroForm');
  if (!form) return;

  const next = new URLSearchParams(window.location.search).get('next');
  const loginLink = form.querySelector('.auth-switch a');
  if (next && loginLink) loginLink.href = `login.html?next=${encodeURIComponent(next)}`;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = getAuthFeedback(form);
    const password = form.elements.password.value;
    const confirm = form.elements.password2;
    confirm.setCustomValidity(password === confirm.value ? '' : 'Las contraseñas no coinciden.');
    if (!form.reportValidity()) return;

    try {
      const users = readStore(STORAGE.users, []);
      const email = form.elements.email.value.trim().toLowerCase();
      if (users.some((user) => user.email === email)) {
        showFeedback(feedback, 'Ya existe una cuenta registrada con ese correo.', true);
        return;
      }
      const account = {
        name: form.elements.nombre.value.trim(),
        email,
        role: form.elements.tipo.value,
        passwordHash: await hashPassword(password)
      };
      users.push(account);
      writeStore(STORAGE.users, users);
      localStorage.setItem(STORAGE.currentUser, account.email);
      redirectAfterAuth('perfil.html');
    } catch (error) {
      showFeedback(feedback, error.message || 'No se pudo completar el registro.', true);
    }
  });
}

function initializeLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  const next = new URLSearchParams(window.location.search).get('next');
  const registerLink = form.querySelector('.auth-switch a');
  if (next && registerLink) registerLink.href = `registro.html?next=${encodeURIComponent(next)}`;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = getAuthFeedback(form);
    if (!form.reportValidity()) return;

    try {
      const email = form.elements.email.value.trim().toLowerCase();
      const passwordHash = await hashPassword(form.elements.password.value);
      const user = readStore(STORAGE.users, []).find((account) => account.email === email);
      if (!user || user.passwordHash !== passwordHash) {
        showFeedback(feedback, 'Correo o contraseña incorrectos.', true);
        return;
      }
      localStorage.setItem(STORAGE.currentUser, user.email);
      redirectAfterAuth('perfil.html');
    } catch (error) {
      showFeedback(feedback, error.message || 'No se pudo iniciar sesión.', true);
    }
  });
}

function requireUser() {
  const user = currentUser();
  if (user) return user;
  const next = `${window.location.pathname.split('/').pop()}${window.location.search}`;
  window.location.href = `login.html?next=${encodeURIComponent(next)}`;
  return null;
}

function renderProfile() {
  if (!document.getElementById('perfilForm')) return;
  const user = requireUser();
  if (!user) return;

  const roleNames = { cliente: 'Cliente', agente: 'Agente', administrador: 'Administrador' };
  document.getElementById('perfilNombre').value = user.name;
  document.getElementById('perfilEmail').value = user.email;
  document.getElementById('perfilRol').textContent = roleNames[user.role] || user.role;
  document.getElementById('perfilSaludo').textContent = `Hola, ${user.name}`;
  document.getElementById('cerrarSesion').addEventListener('click', () => {
    localStorage.removeItem(STORAGE.currentUser);
    window.location.href = 'index.html';
  });

  const form = document.getElementById('perfilForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const feedback = form.querySelector('.form-feedback');
    if (!form.reportValidity()) return;
    try {
      const users = readStore(STORAGE.users, []);
      const email = form.elements.email.value.trim().toLowerCase();
      if (users.some((account) => account.email === email && account.email !== user.email)) {
        showFeedback(feedback, 'Ese correo ya está asociado a otra cuenta.', true);
        return;
      }
      const updated = { ...user, name: form.elements.nombre.value.trim(), email };
      writeStore(STORAGE.users, users.map((account) => account.email === user.email ? updated : account));
      localStorage.setItem(STORAGE.currentUser, email);
      showFeedback(feedback, 'Perfil actualizado correctamente.');
      document.getElementById('perfilSaludo').textContent = `Hola, ${updated.name}`;
    } catch (error) {
      showFeedback(feedback, error.message || 'No se pudo actualizar el perfil.', true);
    }
  });

  const reservations = readStore(STORAGE.reservations, []).filter((item) => item.email === user.email);
  const list = document.getElementById('reservasLista');
  if (!reservations.length) {
    list.textContent = 'Todavía no tienes compras. Explora los eventos y encuentra tu próximo plan.';
  } else {
    reservations.forEach((reservation) => {
      const item = document.createElement('li');
      const eventName = EVENTOS[reservation.eventId]?.nombre || reservation.eventId;
      const details = document.createElement('p');
      details.textContent = `${eventName} · ${reservation.quantity} entrada(s) · ${formatoCOP(reservation.total)}`;
      const ticketLink = document.createElement('a');
      ticketLink.className = 'btn btn-ghost reservation-detail';
      ticketLink.href = `ticket.html?compra=${encodeURIComponent(reservation.id)}`;
      ticketLink.textContent = 'Ver detalle y ticket';
      item.append(details, ticketLink);
      list.append(item);
    });
  }

  const adminPanel = document.getElementById('adminAforo');
  if (adminPanel && user.role === 'administrador') renderInventoryManager(adminPanel);
  if (adminPanel && user.role !== 'administrador') adminPanel.hidden = true;
}

function renderInventoryManager(panel) {
  const inventory = getInventory();
  const list = panel.querySelector('[data-inventory-list]');
  Object.entries(EVENTOS).forEach(([id, evento]) => {
    const row = document.createElement('div');
    row.className = 'inventory-row';
    const label = document.createElement('label');
    label.textContent = `${evento.nombre} (vendidas: ${inventory[id].vendidos})`;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(inventory[id].vendidos);
    input.value = String(inventory[id].aforo);
    input.required = true;
    input.setAttribute('aria-label', `Aforo máximo: ${evento.nombre}`);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-ghost';
    button.textContent = 'Guardar aforo';
    button.addEventListener('click', () => {
      const feedback = panel.querySelector('.form-feedback');
      const capacity = Number(input.value);
      if (!Number.isInteger(capacity) || capacity < inventory[id].vendidos) {
        showFeedback(feedback, 'El aforo debe ser un número entero igual o mayor a las entradas vendidas.', true);
        return;
      }
      try {
        const current = getInventory();
        current[id].aforo = capacity;
        writeStore(STORAGE.inventory, current);
        inventory[id].aforo = capacity;
        input.min = String(inventory[id].vendidos);
        showFeedback(feedback, `Aforo actualizado para ${evento.nombre}.`);
      } catch (error) {
        showFeedback(feedback, error.message || 'No se pudo guardar el aforo.', true);
      }
    });
    row.append(label, input, button);
    list.append(row);
  });
}

function initializeCheckout() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const eventId = new URLSearchParams(window.location.search).get('evento');
  const evento = EVENTOS[eventId];
  const feedback = form.querySelector('.form-feedback');
  if (!evento) {
    showFeedback(feedback, 'No encontramos ese evento. Vuelve a la cartelera para elegir uno.', true);
    form.hidden = true;
    return;
  }
  const user = requireUser();
  if (!user) return;

  document.getElementById('compraEvento').textContent = evento.nombre;
  document.getElementById('compraPrecio').textContent = `${formatoCOP(evento.precio)} por entrada`;
  const quantity = form.elements.quantity;
  const total = document.getElementById('compraTotal');

  const refreshQuantity = () => {
    const inventory = getInventory();
    const remaining = Math.max(0, inventory[eventId].aforo - inventory[eventId].vendidos);
    const maxAllowed = Math.min(remaining, MAX_ENTRADAS_POR_COMPRA);
    quantity.max = String(maxAllowed);
    quantity.disabled = remaining === 0;
    quantity.setCustomValidity(Number(quantity.value) > maxAllowed
      ? `Puedes comprar hasta ${maxAllowed} entradas en esta compra.`
      : '');
    total.textContent = formatoCOP(evento.precio * Number(quantity.value || 0));
    const stock = document.getElementById('checkoutStock');
    stock.textContent = remaining === 0
      ? 'Evento agotado: ya no quedan entradas.'
      : `Quedan ${remaining} ${remaining === 1 ? 'entrada' : 'entradas'}. Puedes comprar hasta ${maxAllowed} por compra.`;
    form.querySelector('[type="submit"]').disabled = remaining === 0;
  };
  quantity.addEventListener('input', () => {
    refreshQuantity();
  });
  quantity.addEventListener('change', refreshQuantity);
  refreshQuantity();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const currentInventory = getInventory();
      const remaining = currentInventory[eventId].aforo - currentInventory[eventId].vendidos;
      const count = Number(quantity.value);
      if (!Number.isInteger(count) || count < 1 || count > MAX_ENTRADAS_POR_COMPRA || count > remaining) {
        showFeedback(feedback, count > MAX_ENTRADAS_POR_COMPRA
          ? `El máximo permitido es ${MAX_ENTRADAS_POR_COMPRA} entradas por compra.`
          : 'La cantidad supera el aforo disponible. Actualiza la página y vuelve a intentarlo.', true);
        refreshQuantity();
        return;
      }
      const reservations = readStore(STORAGE.reservations, []);
      const reservation = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: user.email,
        eventId,
        quantity: count,
        total: evento.precio * count,
        date: new Date().toISOString()
      };
      currentInventory[eventId].vendidos += count;
      reservations.push(reservation);
      writeStore(STORAGE.inventory, currentInventory);
      writeStore(STORAGE.reservations, reservations);
      form.hidden = true;
      document.getElementById('compraConfirmacion').hidden = false;
      document.getElementById('confirmacionTexto').textContent =
        `Tu compra de ${count} ${count === 1 ? 'entrada' : 'entradas'} para ${evento.nombre} quedó confirmada. Total: ${formatoCOP(reservation.total)}.`;
      const ticketLink = document.getElementById('ticketCompraLink');
      ticketLink.href = `ticket.html?compra=${encodeURIComponent(reservation.id)}`;
    } catch (error) {
      showFeedback(feedback, error.message || 'No se pudo completar la compra.', true);
    }
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function initializeTicket() {
  const page = document.getElementById('ticketPage');
  if (!page) return;

  const user = requireUser();
  if (!user) return;
  const purchaseId = new URLSearchParams(window.location.search).get('compra');
  const reservation = readStore(STORAGE.reservations, [])
    .find((item) => item.id === purchaseId && item.email === user.email);
  if (!reservation) {
    page.hidden = true;
    showFeedback(document.getElementById('ticketError'), 'No encontramos esta compra en tu cuenta.');
    return;
  }

  const eventName = EVENTOS[reservation.eventId]?.nombre || 'Evento EventHub';
  const date = new Date(reservation.date);
  const dateLabel = Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : date.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
  const shortId = reservation.id.slice(-6).toUpperCase();

  document.getElementById('ticketEvento').textContent = eventName;
  document.getElementById('ticketNombre').textContent = user.name;
  document.getElementById('ticketCantidad').textContent =
    `${reservation.quantity} ${reservation.quantity === 1 ? 'entrada' : 'entradas'}`;
  document.getElementById('ticketTotal').textContent = formatoCOP(reservation.total);
  document.getElementById('ticketFecha').textContent = dateLabel;
  document.getElementById('ticketReferencia').textContent = `EH-${shortId}`;

  document.getElementById('descargarTicket').addEventListener('click', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560">
      <rect width="1000" height="560" rx="32" fill="#f6f3ec"/>
      <rect x="26" y="26" width="948" height="508" rx="28" fill="#ffffff" stroke="#0c5f57" stroke-width="4"/>
      <path d="M26 150h948" stroke="#d5cec2" stroke-width="2"/>
      <path d="M740 150v384" stroke="#d5cec2" stroke-width="3" stroke-dasharray="10 12"/>
      <text x="70" y="105" fill="#1b1724" font-family="Arial,sans-serif" font-size="44" font-weight="700">EventHub</text>
      <text x="70" y="225" fill="#0c5f57" font-family="Arial,sans-serif" font-size="20" font-weight="700">TICKET DE COMPRA · EVENTHUB</text>
      <text x="70" y="292" fill="#1b1724" font-family="Arial,sans-serif" font-size="38" font-weight="700">${escapeXml(eventName)}</text>
      <text x="70" y="354" fill="#3e3850" font-family="Arial,sans-serif" font-size="24">A nombre de: ${escapeXml(user.name)}</text>
      <text x="70" y="402" fill="#3e3850" font-family="Arial,sans-serif" font-size="24">Entradas: ${escapeXml(reservation.quantity)}</text>
      <text x="70" y="450" fill="#3e3850" font-family="Arial,sans-serif" font-size="24">Compra: ${escapeXml(dateLabel)}</text>
      <text x="70" y="500" fill="#3e3850" font-family="Arial,sans-serif" font-size="20">Referencia: ${escapeXml(`EH-${shortId}`)}</text>
      <text x="785" y="235" fill="#3e3850" font-family="Arial,sans-serif" font-size="20">TOTAL</text>
      <text x="785" y="285" fill="#0c5f57" font-family="Arial,sans-serif" font-size="30" font-weight="700">${escapeXml(formatoCOP(reservation.total))}</text>
      <text x="785" y="365" fill="#3e3850" font-family="Arial,sans-serif" font-size="18">ESTADO</text>
      <text x="785" y="402" fill="#0c5f57" font-family="Arial,sans-serif" font-size="20" font-weight="700">CONFIRMADA</text>
    </svg>`;
    const file = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `eventhub-ticket-${shortId.toLowerCase()}.svg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  });

  document.getElementById('imprimirTicket').addEventListener('click', () => window.print());
}

initializeNavigation();
initializeAccessibility();
initializeEventSearch();
initializeRegistration();
initializeLogin();
renderProfile();
initializeCheckout();
initializeTicket();
