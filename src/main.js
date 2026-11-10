import './style.css';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix de iconos por defecto de Leaflet bajo Vite (las rutas relativas se rompen).
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

/* ---------- Config ---------- */
const API_KEY = import.meta.env.VITE_IPIFY_API_KEY;
const API_BASE = 'https://geo.ipify.org/api/v2/country,city';

/* ---------- DOM refs ---------- */
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const searchButton = form.querySelector('.search__button');
const clearButton = form.querySelector('.search__clear');
const errorEl = document.getElementById('search-error');
const card = document.getElementById('result-card');
const ipEl = document.getElementById('ip-value');
const locationEl = document.getElementById('location-value');
const timezoneEl = document.getElementById('timezone-value');
const ispEl = document.getElementById('isp-value');
const mapEl = document.getElementById('map');

/* ---------- Estado ---------- */
let map = null;
let marker = null;
let abortController = null;
let debounceTimer = null;

/* ---------- Validación ---------- */
// IPv4 simple. TODO: añadir IPv6 si quieres soportarlo.
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

function isIP(value) {
  return IPV4_REGEX.test(value.trim());
}

/* ---------- Utilidades ---------- */
function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- API ---------- */
async function fetchLocation(query, signal) {
  const params = new URLSearchParams({ apiKey: API_KEY });
  const q = query.trim();

  // Sin consulta → IP del visitante (IPify devuelve la del requester).
  if (q) {
    if (isIP(q)) params.set('ipAddress', q);
    else params.set('domain', q);
  }

  const res = await fetch(`${API_BASE}?${params.toString()}`, { signal });

  // IPify devuelve 4xx con un body JSON que incluye 'messages'.
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.messages?.[0] || detail;
    } catch {
      /* body no era JSON; nos quedamos con statusText */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  return res.json();
}

/* ---------- Render ---------- */
function renderResult(data) {
  const { ip, location, isp } = data;

  ipEl.textContent = ip ?? '—';
  locationEl.textContent = location
    ? [location.city, location.region, location.country].filter(Boolean).join(', ')
    : '—';
  timezoneEl.textContent = location?.timezone
    ? `UTC ${location.timezone}`
    : '—';
  ispEl.textContent = isp ?? '—';
}

/* ---------- Mapa ---------- */
function initOrUpdateMap(lat, lng) {
  if (!map) {
    map = L.map(mapEl).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
  } else {
    map.setView([lat, lng], 13);
  }

  if (marker) marker.remove();
  marker = L.marker([lat, lng]).addTo(map);

  // Leaflet necesita recalcular tamaño si el contenedor cambió (ej. responsive).
  setTimeout(() => map.invalidateSize(), 0);
}

/* ---------- Orquestación ---------- */
function setLoading(isLoading) {
  card.setAttribute('aria-busy', String(isLoading));
  card.classList.toggle('is-loading', isLoading);
  searchButton?.classList.toggle('is-loading', isLoading);
}

function showError(message) {
  errorEl.textContent = message || '';
  card.classList.add('has-error');
}

function clearError() {
  errorEl.textContent = '';
  card.classList.remove('has-error');
}

async function handleSearch(query) {
  // Cancela cualquier petición en vuelo antes de lanzar una nueva.
  if (abortController) abortController.abort();
  abortController = new AbortController();
  const { signal } = abortController;

  clearError();
  setLoading(true);

  try {
    const data = await fetchLocation(query, signal);
    // Si se abortó mientras esperábamos, no tocamos el DOM.
    if (signal.aborted) return;

    renderResult(data);

    const { lat, lng } = data.location ?? {};
    if (typeof lat === 'number' && typeof lng === 'number') {
      initOrUpdateMap(lat, lng);
    } else {
      showError('No se pudo obtener la ubicación.');
    }
  } catch (err) {
    // AbortError es esperado (nueva búsqueda o submit): no mostrar error.
    if (err.name === 'AbortError') return;

    // Fallo de red (offline o CORS) → fetch lanza TypeError.
    if (err instanceof TypeError || !navigator.onLine) {
      showError('Sin conexión. Verifica tu red e inténtalo de nuevo.');
      return;
    }

    showError(err.message || 'Algo salió mal. Inténtalo de nuevo.');
  } finally {
    if (!signal.aborted) setLoading(false);
  }
}

/* ---------- Eventos ---------- */
const debouncedSearch = debounce((value) => {
  const q = value.trim();
  // Evita búsquedas con 1-2 caracteres; vacío sí busca (IP del visitante).
  if (q.length > 0 && q.length < 3) return;
  handleSearch(value);
}, 400);

input.addEventListener('input', (e) => {
  const hasValue = e.target.value.trim().length > 0;
  clearButton.hidden = !hasValue;
  debouncedSearch(e.target.value);
});

clearButton.addEventListener('click', () => {
  input.value = '';
  clearButton.hidden = true;
  if (abortController) abortController.abort();
  clearError();
  card.classList.remove('is-loading');
  searchButton?.classList.remove('is-loading');
  input.focus();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  // Cancela el debounce pendiente y busca ya.
  clearTimeout(debounceTimer);
  handleSearch(input.value);
});

// TODO: añadir debounce si quieres buscar mientras se escribe.
// TODO: manejar Enter en móvil (virtual keyboard) si el submit no se dispara.

/* ---------- Carga inicial ---------- */
// TODO: considerar mostrar un skeleton/placeholder mientras carga.
handleSearch('');
