/* ───── State ───── */
let unit = 'C';
let lastData = null;

/* ───── Unit Toggle ───── */
function setUnit(u) {
  unit = u;
  document.getElementById('btnC').classList.toggle('active', u === 'C');
  document.getElementById('btnF').classList.toggle('active', u === 'F');
  if (lastData) renderData(lastData);
}

function toF(c) {
  return (c * 9 / 5 + 32).toFixed(1);
}

function display(c) {
  return unit === 'C' ? parseFloat(c).toFixed(1) : toF(c);
}

/* ───── WMO Weather Codes ───── */
const WMO = {
  0:  { label: 'Clear sky',           icon: '☀️',  bg: 'sunny' },
  1:  { label: 'Mainly clear',        icon: '🌤',  bg: 'sunny' },
  2:  { label: 'Partly cloudy',       icon: '⛅',  bg: 'cloudy' },
  3:  { label: 'Overcast',            icon: '☁️',  bg: 'cloudy' },
  45: { label: 'Foggy',               icon: '🌫',  bg: 'fog' },
  48: { label: 'Icy fog',             icon: '🌫',  bg: 'fog' },
  51: { label: 'Light drizzle',       icon: '🌦',  bg: 'rain' },
  53: { label: 'Moderate drizzle',    icon: '🌦',  bg: 'rain' },
  55: { label: 'Dense drizzle',       icon: '🌧',  bg: 'rain' },
  61: { label: 'Slight rain',         icon: '🌧',  bg: 'rain' },
  63: { label: 'Moderate rain',       icon: '🌧',  bg: 'rain' },
  65: { label: 'Heavy rain',          icon: '🌧',  bg: 'rain' },
  71: { label: 'Slight snow',         icon: '🌨',  bg: 'snow' },
  73: { label: 'Moderate snow',       icon: '❄️',  bg: 'snow' },
  75: { label: 'Heavy snow',          icon: '❄️',  bg: 'snow' },
  77: { label: 'Snow grains',         icon: '🌨',  bg: 'snow' },
  80: { label: 'Slight showers',      icon: '🌦',  bg: 'rain' },
  81: { label: 'Moderate showers',    icon: '🌧',  bg: 'rain' },
  82: { label: 'Violent showers',     icon: '⛈',  bg: 'storm' },
  85: { label: 'Slight snow showers', icon: '🌨',  bg: 'snow' },
  86: { label: 'Heavy snow showers',  icon: '❄️',  bg: 'snow' },
  95: { label: 'Thunderstorm',        icon: '⛈',  bg: 'storm' },
  96: { label: 'Thunderstorm w/ hail',icon: '⛈',  bg: 'storm' },
  99: { label: 'Severe thunderstorm', icon: '🌩',  bg: 'storm' },
};

function getWMO(code) {
  return WMO[code] || { label: 'Unknown', icon: '🌡', bg: 'cloudy' };
}

/* ───── Background Themes ───── */
const themes = {
  sunny:  { orb1: '#4a2800', orb2: '#7a3d00', accent: '#ffb74d', accent2: '#ffd54f', bg: '#0e0800' },
  cloudy: { orb1: '#1a2a3a', orb2: '#0d1f32', accent: '#90caf9', accent2: '#bbdefb', bg: '#08101a' },
  fog:    { orb1: '#1e1e2e', orb2: '#2a2a3e', accent: '#b0bec5', accent2: '#cfd8dc', bg: '#0d0d15' },
  rain:   { orb1: '#0d1f3c', orb2: '#091628', accent: '#4fc3f7', accent2: '#81d4fa', bg: '#060e1a' },
  snow:   { orb1: '#1a2040', orb2: '#2a305a', accent: '#e1f5fe', accent2: '#b3e5fc', bg: '#08091a' },
  storm:  { orb1: '#1a0a30', orb2: '#100520', accent: '#ce93d8', accent2: '#e040fb', bg: '#08030f' },
};

function applyTheme(bgKey) {
  const t = themes[bgKey] || themes.cloudy;
  const r = document.documentElement.style;
  r.setProperty('--orb1', t.orb1);
  r.setProperty('--orb2', t.orb2);
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent2', t.accent2);
  r.setProperty('--bg', t.bg);
  document.querySelector('.bg-canvas').style.background = t.bg;
}

/* ───── Helpers ───── */
function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function uvLabel(uv) {
  if (uv === null || uv === undefined) return '—';
  const v = parseFloat(uv).toFixed(1);
  const level =
    uv < 3  ? 'Low'       :
    uv < 6  ? 'Moderate'  :
    uv < 8  ? 'High'      :
    uv < 11 ? 'Very High' : 'Extreme';
  return `${v} · ${level}`;
}

function getLocalTime(timezone) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return '';
  }
}

function dayName(dateStr, idx) {
  if (idx === 0) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { weekday: 'short' });
}

/* ───── Render ───── */
function renderData(d) {
  const { current, daily, city, country, timezone } = d;
  const wmo = getWMO(current.weather_code);

  document.getElementById('cityName').textContent      = `${city}, ${country}`;
  document.getElementById('localTime').textContent     = getLocalTime(timezone);
  document.getElementById('tempVal').textContent       = display(current.temperature_2m);
  document.getElementById('tempUnitLabel').textContent = unit === 'C' ? '°C' : '°F';
  document.getElementById('conditionText').textContent = wmo.label;
  document.getElementById('feelsLike').textContent     = `${display(current.apparent_temperature)}°${unit}`;
  document.getElementById('weatherIcon').textContent   = wmo.icon;
  document.getElementById('humidity').textContent      = `${current.relative_humidity_2m}%`;
  document.getElementById('wind').textContent          = `${current.wind_speed_10m} km/h ${windDir(current.wind_direction_10m)}`;
  document.getElementById('precip').textContent        = `${current.precipitation} mm`;
  document.getElementById('uvIndex').textContent       = uvLabel(current.uv_index);

  applyTheme(wmo.bg);

  /* 5-Day Forecast */
  const row = document.getElementById('forecastRow');
  row.innerHTML = daily.time.map((date, i) => {
    const fc   = getWMO(daily.weather_code[i]);
    const mx   = display(daily.temperature_2m_max[i]);
    const mn   = display(daily.temperature_2m_min[i]);
    const rain = daily.precipitation_sum[i];
    return `
      <div class="forecast-day">
        <div class="fc-day">${dayName(date, i)}</div>
        <span class="fc-icon">${fc.icon}</span>
        <div class="fc-max">${mx}°</div>
        <div class="fc-min">${mn}°</div>
        ${rain > 0 ? `<div class="fc-rain">🌧 ${rain}mm</div>` : ''}
      </div>`;
  }).join('');

  showCard();
}

/* ───── UI State ───── */
function showLoading(msg) {
  document.getElementById('statusText').textContent = msg;
  document.getElementById('statusEl').classList.add('visible');
  document.getElementById('errorEl').classList.remove('visible');
}

function hideLoading() {
  document.getElementById('statusEl').classList.remove('visible');
}

function showError(msg) {
  hideLoading();
  document.getElementById('errorEl').textContent = '❌ ' + msg;
  document.getElementById('errorEl').classList.add('visible');
}

function showCard() {
  hideLoading();
  const card = document.getElementById('mainCard');
  card.style.display = 'block';
  requestAnimationFrame(() => card.classList.add('visible'));
}

/* ───── Fetch Weather ───── */
async function fetchWeather(lat, lon, cityName, countryName) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto&forecast_days=5`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather service unavailable.');
  const data = await res.json();

  lastData = {
    current: data.current,
    daily:   data.daily,
    city:    cityName,
    country: countryName,
    timezone: data.timezone,
  };

  renderData(lastData);
}

/* ───── Main Search ───── */
async function getWeather() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return;

  showLoading('Searching city…');

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();

    if (!geoData.results?.length) throw new Error('City not found. Try a different name.');

    const { latitude, longitude, name, country } = geoData.results[0];
    showLoading(`Loading weather for ${name}…`);
    await fetchWeather(latitude, longitude, name, country);

  } catch (e) {
    showError(e.message);
  }
}

/* ───── Quick City Buttons ───── */
function quickSearch(city) {
  document.getElementById('cityInput').value = city;
  getWeather();
}

/* ───── Geolocation ───── */
function geoLocate() {
  if (!navigator.geolocation) {
    showError('Geolocation not supported by your browser.');
    return;
  }

  showLoading('Getting your location…');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        showLoading('Looking up your city…');

        const revRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const revData = await revRes.json();

        const city =
          revData.address?.city ||
          revData.address?.town ||
          revData.address?.village ||
          'Your Location';
        const country = revData.address?.country_code?.toUpperCase() || '';

        showLoading('Loading weather…');
        await fetchWeather(latitude, longitude, city, country);

      } catch (e) {
        showError('Could not determine your location.');
      }
    },
    () => showError('Location access denied. Please allow location or search manually.')
  );
}

/* ───── Clock Refresh (every 30s) ───── */
setInterval(() => {
  if (lastData) {
    const el = document.getElementById('localTime');
    if (el) el.textContent = getLocalTime(lastData.timezone);
  }
}, 30000);

/* ───── Auto-load Manila on start ───── */
window.addEventListener('load', () => quickSearch('Manila'));
