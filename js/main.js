const API_BASE_URL = (window.EVENTHUB_API_URL || '').replace(/\/+$/, '');
const STORAGE = { accessibility: 'eventhub.accessibility' };

const MAX_ENTRADAS_POR_COMPRA = 10;
const formatoCOP = (value) => `$${Number(value).toLocaleString('es-CO')}`;
let cachedUser;
let userLoaded = false;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'No fue posible completar la solicitud.');
    error.status = response.status;
    throw error;
  }
  return result;
}

async function currentUser() {
  if (userLoaded) return cachedUser;
  try {
    const result = await apiRequest('/auth/me');
    cachedUser = result.user;
  } catch (error) {
    if (error.status !== 401) throw error;
    cachedUser = null;
  }
  userLoaded = true;
  return cachedUser;
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

function redirectAfterAuth(fallback) {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && /^[a-z0-9-]+\.html(?:\?[a-zA-Z0-9%=&_-]*)?$/i.test(next)) {
    window.location.href = next;
    return;
  }
  window.location.href = fallback;
}

async function initializeNavigation() {
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

  if (!mainNav) return;
  try {
    const user = await currentUser();
    if (!user) return;
    const loginLink = [...mainNav.querySelectorAll('a')].find((link) => link.textContent.trim() === 'Ingresar');
    const registerLink = [...mainNav.querySelectorAll('a')].find((link) => link.textContent.trim() === 'Regístrate');
    if (loginLink) {
      loginLink.href = 'perfil.html';
      loginLink.textContent = 'Mi perfil';
    }
    if (registerLink) {
      registerLink.href = '#';
      registerLink.textContent = 'Cerrar sesión';
      registerLink.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          await apiRequest('/auth/logout', { method: 'POST' });
          cachedUser = null;
          userLoaded = true;
          window.location.href = 'index.html';
        } catch (error) {
          showFeedback(document.getElementById('eventosConteo'), error.message, true);
        }
      });
    }
  } catch (error) {
    showFeedback(document.getElementById('eventosConteo'), `No se pudo conectar con el servidor: ${error.message}`, true);
  }
}

async function initializeEventSearch() {
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

  let events;
  let user;
  try {
    const result = await apiRequest('/events');
    events = result.events;
    user = await currentUser();
  } catch (error) {
    const feedback = document.getElementById('eventosConteo');
    if (feedback) showFeedback(feedback, `No se pudieron cargar los eventos: ${error.message}`, true);
    return;
  }

  const eventsById = new Map(events.map((item) => [item.id, item]));
  const cards = [...document.querySelectorAll('.evento-card[data-event-id]')];
  let visibles = 0;
  cards.forEach((card) => {
    const id = card.dataset.eventId;
    const event = eventsById.get(id);
    if (!event) {
      card.hidden = true;
      return;
    }
    card.dataset.ciudad = event.city;
    card.dataset.categoria = event.category;
    const heading = card.querySelector('h2, h3');
    const venue = card.querySelector('.evento-lugar');
    const price = card.querySelector('.evento-precio');
    if (heading) heading.textContent = event.name;
    if (venue) venue.textContent = `${event.venue} · ${event.city}`;
    if (price) price.textContent = `Desde ${formatoCOP(event.price)}`;

    if (eventosGrid && eventosGrid.contains(card)) {
      const texto = card.textContent.toLowerCase();
      const coincide =
        (!consulta || texto.includes(consulta)) &&
        (!ciudad || event.city.toLowerCase() === ciudad) &&
        (!categoria || event.category.toLowerCase() === categoria);
      card.hidden = !coincide;
      if (coincide) visibles += 1;
    }

    const stockLabel = card.querySelector(`[data-stock-for="${id}"]`);
    const buyButton = card.querySelector('a[href^="checkout.html"]');
    if (buyButton && !user) {
      buyButton.href = `login.html?next=${encodeURIComponent(`checkout.html?evento=${id}`)}`;
      buyButton.textContent = 'Inicia sesión para comprar';
      buyButton.setAttribute('aria-label', `Inicia sesión para comprar entradas de ${event.name}`);
    }
    if (stockLabel) {
      stockLabel.textContent = event.remaining === 0
        ? 'Agotado'
        : `Quedan ${event.remaining} ${event.remaining === 1 ? 'entrada' : 'entradas'}`;
      stockLabel.classList.toggle('is-sold-out', event.remaining === 0);
      stockLabel.setAttribute('aria-live', 'polite');
    }
    if (event.remaining === 0 && buyButton) {
      buyButton.textContent = 'Entradas agotadas';
      buyButton.classList.add('is-disabled');
      buyButton.setAttribute('aria-disabled', 'true');
      buyButton.removeAttribute('href');
    } else if (buyButton) {
      buyButton.classList.remove('is-disabled');
      buyButton.removeAttribute('aria-disabled');
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
      const { user } = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.elements.nombre.value.trim(),
          email: form.elements.email.value.trim(),
          password,
          role: form.elements.tipo.value
        })
      });
      cachedUser = user;
      userLoaded = true;
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
      const { user } = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.elements.email.value.trim(),
          password: form.elements.password.value
        })
      });
      cachedUser = user;
      userLoaded = true;
      redirectAfterAuth('perfil.html');
    } catch (error) {
      showFeedback(feedback, error.message || 'No se pudo iniciar sesión.', true);
    }
  });
}

async function requireUser() {
  const user = await currentUser();
  if (user) return user;
  const next = `${window.location.pathname.split('/').pop()}${window.location.search}`;
  window.location.href = `login.html?next=${encodeURIComponent(next)}`;
  return null;
}

async function renderProfile() {
  if (!document.getElementById('perfilForm')) return;
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    showFeedback(document.querySelector('#perfilForm .form-feedback'), `No se pudo cargar el perfil: ${error.message}`, true);
    return;
  }
  if (!user) return;

  const roleNames = { cliente: 'Cliente', agente: 'Agente', administrador: 'Administrador' };
  document.getElementById('perfilNombre').value = user.name;
  document.getElementById('perfilEmail').value = user.email;
  document.getElementById('perfilRol').textContent = roleNames[user.role] || user.role;
  document.getElementById('perfilSaludo').textContent = `Hola, ${user.name}`;
  document.getElementById('cerrarSesion').addEventListener('click', () => {
    apiRequest('/auth/logout', { method: 'POST' })
      .then(() => { window.location.href = 'index.html'; })
      .catch((error) => showFeedback(document.querySelector('#perfilForm .form-feedback'), error.message, true));
  });

  const form = document.getElementById('perfilForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const feedback = form.querySelector('.form-feedback');
    if (!form.reportValidity()) return;
    try {
      const { user: updated } = await apiRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.elements.nombre.value.trim(),
          email: form.elements.email.value.trim()
        })
      });
      cachedUser = updated;
      userLoaded = true;
      showFeedback(feedback, 'Perfil actualizado correctamente.');
      document.getElementById('perfilSaludo').textContent = `Hola, ${updated.name}`;
    } catch (error) {
      showFeedback(feedback, error.message || 'No se pudo actualizar el perfil.', true);
    }
  });

  const list = document.getElementById('reservasLista');
  try {
    const { reservations } = await apiRequest('/reservations');
    if (!reservations.length) {
      list.textContent = 'Todavía no tienes compras. Explora los eventos y encuentra tu próximo plan.';
    } else {
      reservations.forEach((reservation) => {
      const item = document.createElement('li');
      const details = document.createElement('p');
      details.textContent = `${reservation.eventName} · ${reservation.quantity} entrada(s) · ${formatoCOP(reservation.total)}`;
      const ticketLink = document.createElement('a');
      ticketLink.className = 'btn btn-ghost reservation-detail';
      ticketLink.href = `ticket.html?compra=${encodeURIComponent(reservation.id)}`;
      ticketLink.textContent = 'Ver detalle y ticket';
      item.append(details, ticketLink);
      list.append(item);
      });
    }
  } catch (error) {
    list.textContent = `No se pudieron cargar tus compras: ${error.message}`;
  }

  const adminPanel = document.getElementById('adminAforo');
  const agentPanel = document.getElementById('agentClients');
  const adminUsersPanel = document.getElementById('adminUsers');
  if (agentPanel) agentPanel.hidden = user.role !== 'agente';
  if (adminUsersPanel) adminUsersPanel.hidden = user.role !== 'administrador';
  if (adminPanel) adminPanel.hidden = user.role !== 'administrador';
  if (user.role === 'agente' && agentPanel) await renderAssignedClients(agentPanel);
  if (user.role === 'administrador') {
    if (adminUsersPanel) await renderAdminUsers(adminUsersPanel, user);
    if (adminPanel) await renderInventoryManager(adminPanel);
  }
}

async function renderAssignedClients(panel) {
  const list = panel.querySelector('#assignedClientsList');
  try {
    const { clients } = await apiRequest('/agent/clients');
    if (!clients.length) {
      list.textContent = 'Todavía no tienes clientes asignados. Pide al administrador que te asigne clientes.';
      return;
    }
    clients.forEach((client) => {
      const item = document.createElement('li');
      const details = document.createElement('p');
      details.textContent = `${client.name} · ${client.email}`;
      item.append(details);
      list.append(item);
    });
  } catch (error) {
    showFeedback(panel.querySelector('.form-feedback'), `No se pudieron cargar tus clientes: ${error.message}`, true);
  }
}

async function renderAdminUsers(panel, currentUser) {
  const adminsList = panel.querySelector('#adminsList');
  const agentsList = panel.querySelector('#agentsList');
  const assignments = panel.querySelector('#clientAssignments');
  const feedback = panel.querySelector('#assignmentFeedback');
  const adminFeedback = panel.querySelector('#adminManagementFeedback');
  const addAdminForm = panel.querySelector('#addAdminForm');
  adminsList.replaceChildren();
  agentsList.replaceChildren();
  assignments.replaceChildren();

  if (addAdminForm && addAdminForm.dataset.bound !== 'true') {
    addAdminForm.dataset.bound = 'true';
    addAdminForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!addAdminForm.reportValidity()) return;
      const button = addAdminForm.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        const { admin } = await apiRequest('/admin/admins', {
          method: 'POST',
          body: JSON.stringify({ email: addAdminForm.elements.email.value.trim() })
        });
        addAdminForm.reset();
        showFeedback(adminFeedback, `${admin.name} (${admin.email}) ahora es administrador. Debe cerrar sesión y volver a ingresar.`);
        await renderAdminUsers(panel, currentUser);
      } catch (error) {
        showFeedback(adminFeedback, error.message || 'No se pudo agregar el administrador.', true);
      } finally {
        button.disabled = false;
      }
    });
  }

  try {
    const { admins, agents, clients } = await apiRequest('/admin/users');
    admins.forEach((admin) => {
      const item = document.createElement('li');
      const details = document.createElement('p');
      details.textContent = `${admin.name} · ${admin.email}${admin.id === currentUser.id ? ' · Tu cuenta' : ''}`;
      item.append(details);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn btn-ghost';
      removeButton.textContent = 'Eliminar cuenta';
      removeButton.disabled = admin.id === currentUser.id;
      if (admin.id === currentUser.id) {
        removeButton.title = 'No puedes eliminar tu propia cuenta desde esta sesión.';
      }
      removeButton.addEventListener('click', async () => {
        const confirmed = window.confirm(
          `¿Eliminar por completo la cuenta de ${admin.name} (${admin.email})?\n\n` +
          'Se eliminarán también sus reservas de demostración, se liberarán esas entradas y se cerrará su sesión. Esta acción no se puede deshacer.'
        );
        if (!confirmed) return;
        removeButton.disabled = true;
        try {
          const result = await apiRequest(`/admin/admins/${encodeURIComponent(admin.id)}`, {
            method: 'DELETE'
          });
          showFeedback(adminFeedback, result.message);
          await renderAdminUsers(panel, currentUser);
        } catch (error) {
          showFeedback(adminFeedback, error.message || 'No se pudo eliminar la cuenta.', true);
        } finally {
          removeButton.disabled = admin.id === currentUser.id;
        }
      });
      item.append(removeButton);
      adminsList.append(item);
    });

    if (!agents.length) {
      agentsList.textContent = 'No hay agentes registrados. Pueden crear una cuenta seleccionando el tipo Agente.';
    } else {
      agents.forEach((agent) => {
        const item = document.createElement('li');
        const details = document.createElement('p');
        details.textContent = `${agent.name} · ${agent.email} · ${agent.clientCount} cliente(s) asignado(s)`;
        item.append(details);
        agentsList.append(item);
      });
    }

    if (!clients.length) {
      assignments.textContent = 'Todavía no hay clientes registrados.';
      return;
    }

    clients.forEach((client) => {
      const row = document.createElement('div');
      row.className = 'inventory-row';
      const label = document.createElement('label');
      label.textContent = `${client.name} · ${client.email}`;

      const select = document.createElement('select');
      select.setAttribute('aria-label', `Agente asignado a ${client.name}`);
      const unassigned = document.createElement('option');
      unassigned.value = '';
      unassigned.textContent = 'Sin agente asignado';
      select.append(unassigned);

      agents.forEach((agent) => {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = `${agent.name} · ${agent.email}`;
        select.append(option);
      });
      select.value = client.agentId || '';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-ghost';
      button.textContent = 'Guardar asignación';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await apiRequest(`/admin/clients/${encodeURIComponent(client.id)}/agent`, {
            method: 'PATCH',
            body: JSON.stringify({ agentId: select.value || null })
          });
          showFeedback(feedback, `Asignación actualizada para ${client.name}.`);
          await renderAdminUsers(panel, currentUser);
        } catch (error) {
          showFeedback(feedback, error.message || 'No se pudo asignar el cliente.', true);
        } finally {
          button.disabled = false;
        }
      });
      row.append(label, select, button);
      assignments.append(row);
    });
  } catch (error) {
    showFeedback(feedback, `No se pudieron cargar agentes y clientes: ${error.message}`, true);
  }
}

async function renderInventoryManager(panel) {
  const list = panel.querySelector('[data-inventory-list]');
  let events;
  try {
    ({ events } = await apiRequest('/events'));
  } catch (error) {
    showFeedback(panel.querySelector('.form-feedback'), `No se pudo cargar el aforo: ${error.message}`, true);
    return;
  }
  events.forEach((evento) => {
    const row = document.createElement('div');
    row.className = 'inventory-row';
    const label = document.createElement('label');
    label.textContent = `${evento.name} (vendidas: ${evento.sold})`;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(evento.sold);
    input.value = String(evento.capacity);
    input.required = true;
    input.setAttribute('aria-label', `Aforo máximo: ${evento.name}`);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-ghost';
    button.textContent = 'Guardar aforo';
    button.addEventListener('click', async () => {
      const feedback = panel.querySelector('.form-feedback');
      const capacity = Number(input.value);
      if (!Number.isInteger(capacity) || capacity < evento.sold) {
        showFeedback(feedback, 'El aforo debe ser un número entero igual o mayor a las entradas vendidas.', true);
        return;
      }
      try {
        await apiRequest(`/events/${encodeURIComponent(evento.id)}/capacity`, {
          method: 'PATCH',
          body: JSON.stringify({ capacity })
        });
        evento.capacity = capacity;
        input.min = String(evento.sold);
        showFeedback(feedback, `Aforo actualizado para ${evento.name}.`);
      } catch (error) {
        showFeedback(feedback, error.message || 'No se pudo guardar el aforo.', true);
      }
    });
    row.append(label, input, button);
    list.append(row);
  });
}

async function initializeCheckout() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  const eventId = new URLSearchParams(window.location.search).get('evento');
  const feedback = form.querySelector('.form-feedback');
  let user;
  let evento;
  try {
    user = await requireUser();
    if (!user) return;
    const { events } = await apiRequest('/events');
    evento = events.find((item) => item.id === eventId);
  } catch (error) {
    showFeedback(feedback, `No se pudo cargar la compra: ${error.message}`, true);
    return;
  }
  if (!evento) {
    showFeedback(feedback, 'No encontramos ese evento. Vuelve a la cartelera para elegir uno.', true);
    form.hidden = true;
    return;
  }

  document.getElementById('compraEvento').textContent = evento.name;
  document.getElementById('compraPrecio').textContent = `${formatoCOP(evento.price)} por entrada`;
  const quantity = form.elements.quantity;
  const total = document.getElementById('compraTotal');

  const refreshQuantity = () => {
    const remaining = evento.remaining;
    const maxAllowed = Math.min(remaining, MAX_ENTRADAS_POR_COMPRA);
    quantity.max = String(maxAllowed);
    quantity.disabled = remaining === 0;
    quantity.setCustomValidity(Number(quantity.value) > maxAllowed
      ? `Puedes comprar hasta ${maxAllowed} entradas en esta compra.`
      : '');
    total.textContent = formatoCOP(evento.price * Number(quantity.value || 0));
    const stock = document.getElementById('checkoutStock');
    stock.textContent = remaining === 0
      ? 'Evento agotado: ya no quedan entradas.'
      : `Quedan ${remaining} ${remaining === 1 ? 'entrada' : 'entradas'}. Puedes comprar hasta ${maxAllowed} por compra.`;
    form.querySelector('[type="submit"]').disabled = remaining === 0;
  };
  quantity.addEventListener('input', refreshQuantity);
  quantity.addEventListener('change', refreshQuantity);
  refreshQuantity();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    try {
      const count = Number(quantity.value);
      if (!Number.isInteger(count) || count < 1 || count > MAX_ENTRADAS_POR_COMPRA) {
        showFeedback(feedback, `Elige entre 1 y ${MAX_ENTRADAS_POR_COMPRA} entradas.`, true);
        refreshQuantity();
        return;
      }
      const { reservation } = await apiRequest('/reservations', {
        method: 'POST',
        body: JSON.stringify({ eventId, quantity: count })
      });
      form.hidden = true;
      document.getElementById('compraConfirmacion').hidden = false;
      document.getElementById('confirmacionTexto').textContent =
        `Tu reserva de demostración de ${count} ${count === 1 ? 'entrada' : 'entradas'} para ${evento.name} quedó registrada. Total: ${formatoCOP(reservation.total)}. No se realizó ningún cobro.`;
      const ticketLink = document.getElementById('ticketCompraLink');
      ticketLink.href = `ticket.html?compra=${encodeURIComponent(reservation.id)}`;
    } catch (error) {
      if (error.status === 409) {
        try {
          const { events } = await apiRequest('/events');
          evento = events.find((item) => item.id === eventId) || evento;
          refreshQuantity();
        } catch (refreshError) {
          showFeedback(feedback, `No se pudo actualizar el aforo: ${refreshError.message}`, true);
          return;
        }
      }
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

async function initializeTicket() {
  const page = document.getElementById('ticketPage');
  if (!page) return;

  let user;
  let reservation;
  const purchaseId = new URLSearchParams(window.location.search).get('compra');
  const errorFeedback = document.getElementById('ticketError');
  try {
    user = await requireUser();
    if (!user) return;
    if (!purchaseId) throw new Error('No encontramos esta compra en tu cuenta.');
    ({ reservation } = await apiRequest(`/reservations/${encodeURIComponent(purchaseId)}`));
  } catch (error) {
    page.hidden = true;
    showFeedback(errorFeedback, error.message || 'No se pudo cargar el ticket.', true);
    return;
  }

  const eventName = reservation.eventName || 'Evento EventHub';
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
      <text x="785" y="402" fill="#0c5f57" font-family="Arial,sans-serif" font-size="20" font-weight="700">RESERVA DEMO</text>
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
