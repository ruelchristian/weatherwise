// WeatherWise Client Controller
let currentCity = 'Manila';
let currentUnit = 'metric'; // 'metric' (°C) or 'imperial' (°F)
let windUnit = 'kmh'; // 'kmh' or 'mph'
let currentWeatherData = null;
let currentForecastData = null;
let savedLocations = [];

// DOM Elements
const desktopSearchInput = document.getElementById('desktopSearchInput');
const mobileSearchInput = document.getElementById('mobileSearchInput');
const searchBtnDesktop = document.getElementById('searchBtnDesktop');
const searchBtnMobile = document.getElementById('searchBtnMobile');
const desktopSuggestions = document.getElementById('desktopSuggestions');
const mobileSuggestions = document.getElementById('mobileSuggestions');

const unitCelsiusBtn = document.getElementById('unitCelsiusBtn');
const unitFahrenheitBtn = document.getElementById('unitFahrenheitBtn');
const currentLocBtn = document.getElementById('currentLocBtn');
const pinLocationBtn = document.getElementById('pinLocationBtn');
const locationChips = document.getElementById('locationChips');

const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const weatherContent = document.getElementById('weatherContent');

// Settings Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const modalUnitCelsius = document.getElementById('modalUnitCelsius');
const modalUnitFahrenheit = document.getElementById('modalUnitFahrenheit');
const modalWindKmh = document.getElementById('modalWindKmh');
const modalWindMph = document.getElementById('modalWindMph');

// Weather Icons Mapping to FontAwesome
function getConditionIcon(condition = '', isNight = false) {
  const cond = condition.toLowerCase();
  if (cond.includes('clear')) {
    return isNight ? '<i class="fa-solid fa-moon text-indigo-300"></i>' : '<i class="fa-solid fa-sun text-amber-400"></i>';
  } else if (cond.includes('cloud')) {
    return isNight ? '<i class="fa-solid fa-cloud-moon text-slate-300"></i>' : '<i class="fa-solid fa-cloud-sun text-amber-200"></i>';
  } else if (cond.includes('rain') || cond.includes('drizzle')) {
    return '<i class="fa-solid fa-cloud-showers-heavy text-sky-400"></i>';
  } else if (cond.includes('thunder')) {
    return '<i class="fa-solid fa-cloud-bolt text-yellow-400"></i>';
  } else if (cond.includes('snow')) {
    return '<i class="fa-solid fa-snowflake text-sky-200"></i>';
  } else {
    return '<i class="fa-solid fa-smog text-slate-300"></i>';
  }
}

// Format Temperature based on preference
function formatTemp(tempC) {
  if (tempC === undefined || tempC === null) return '--';
  if (currentUnit === 'imperial') {
    return Math.round(tempC * 9 / 5 + 32);
  }
  return Math.round(tempC);
}

// Format Wind Speed based on preference
function formatWind(windKmH) {
  if (windKmH === undefined || windKmH === null) return '--';
  if (windUnit === 'mph') {
    return `${Math.round(windKmH * 0.621371)} mph`;
  }
  return `${Math.round(windKmH)} km/h`;
}

// Fetch Weather & Forecast
async function fetchWeather(city, lat = null, lon = null) {
  showLoading(true);
  try {
    const query = lat && lon ? `lat=${lat}&lon=${lon}` : `city=${encodeURIComponent(city)}`;
    
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`/api/weather/current?${query}`).then(r => r.json()),
      fetch(`/api/weather/forecast?${query}`).then(r => r.json())
    ]);

    if (!currentRes.success || !forecastRes.success) {
      throw new Error(currentRes.error || forecastRes.error || 'Failed to fetch weather data');
    }

    currentWeatherData = currentRes.data;
    currentForecastData = forecastRes.data;
    currentCity = currentWeatherData.cityName;

    renderCurrentWeather(currentWeatherData);
    renderRainForecast(currentForecastData.hourlyPrecipitation);
    renderUpcomingForecast(currentForecastData.dailyForecast);
    updatePinButtonState();

    if (currentWeatherData.notice) {
      document.getElementById('noticeText').innerText = currentWeatherData.notice;
      document.getElementById('noticeBanner').style.display = 'block';
    } else {
      document.getElementById('noticeText').innerText = 'Live meteorological feed via OpenWeather API.';
    }

    showError(false);
  } catch (err) {
    console.error('Fetch error:', err);
    showError(true, err.message);
  } finally {
    showLoading(false);
  }
}

// Render Current Weather Hero
function renderCurrentWeather(data) {
  document.getElementById('cityTitle').innerText = data.cityName;
  document.getElementById('countryBadge').innerText = data.country || 'N/A';
  
  const d = new Date(data.timestamp);
  document.getElementById('dateTimeLabel').innerText = `${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const tempDisplay = formatTemp(data.temperature.celsius);
  const feelsLikeDisplay = formatTemp(data.temperature.feelsLikeCelsius);
  const unitSymbol = currentUnit === 'imperial' ? '°F' : '°C';

  document.getElementById('currentTemp').innerText = tempDisplay;
  document.getElementById('currentTempUnit').innerText = unitSymbol;
  document.getElementById('feelsLikeText').innerText = `Feels like ${feelsLikeDisplay}${unitSymbol}`;

  const isNight = data.condition.icon?.includes('n');
  document.getElementById('conditionIconWrapper').innerHTML = getConditionIcon(data.condition.main, isNight);
  document.getElementById('conditionBadge').innerText = data.condition.description;

  document.getElementById('humidityVal').innerText = `${data.metrics.humidity}%`;
  document.getElementById('windVal').innerText = formatWind(data.metrics.windSpeedKmH);
  document.getElementById('rainVal').innerText = `${data.metrics.rainProbabilityPercent}%`;
  document.getElementById('pressureVal').innerText = `${data.metrics.pressureHpa} hPa`;

  document.getElementById('cloudinessVal').innerText = `${data.metrics.cloudiness}%`;
  document.getElementById('cloudBar').style.width = `${data.metrics.cloudiness}%`;

  const precipChance = data.metrics.rainProbabilityPercent;
  document.getElementById('precipBar').style.width = `${precipChance}%`;
  document.getElementById('precipRisk').innerText = precipChance > 60 ? 'High' : (precipChance > 30 ? 'Moderate' : 'Low');

  document.getElementById('coordsVal').innerText = `${data.coordinates.lat.toFixed(2)}° N, ${data.coordinates.lon.toFixed(2)}° E`;

  if (data.sun?.sunrise) {
    document.getElementById('sunriseVal').innerText = new Date(data.sun.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sunsetVal').innerText = new Date(data.sun.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Render Rain Precipitation Timeline
function renderRainForecast(hourlyList = []) {
  const container = document.getElementById('rainTimeline');
  container.innerHTML = '';

  hourlyList.forEach(slot => {
    const card = document.createElement('div');
    card.className = 'flex flex-col items-center p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 text-center flex-shrink-0 min-w-[70px]';

    const heightPct = Math.max(15, slot.rainChancePercent);
    const barColor = slot.rainChancePercent > 60 ? 'bg-sky-400' : slot.rainChancePercent > 30 ? 'bg-sky-500/70' : 'bg-slate-600';

    card.innerHTML = `
      <span class="text-[11px] font-medium text-slate-400 mb-2">${slot.time}</span>
      <div class="h-16 w-3 bg-slate-900 rounded-full flex items-end p-0.5 overflow-hidden my-1">
        <div class="w-full ${barColor} rounded-full transition-all duration-500" style="height: ${heightPct}%"></div>
      </div>
      <span class="text-xs font-bold text-white mt-1">${slot.rainChancePercent}%</span>
      <span class="text-[10px] text-slate-500">${slot.precipitationMm} mm</span>
    `;
    container.appendChild(card);
  });
}

// Render 5-Day Forecast Grid
function renderUpcomingForecast(dailyList = []) {
  const container = document.getElementById('forecastGrid');
  container.innerHTML = '';

  dailyList.forEach((day, index) => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex flex-col justify-between hover:border-sky-500/40 transition-all';

    const unitSymbol = currentUnit === 'imperial' ? '°F' : '°C';
    const high = formatTemp(day.tempHighC);
    const low = formatTemp(day.tempLowC);
    const icon = getConditionIcon(day.condition);

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold ${index === 0 ? 'text-sky-400' : 'text-slate-300'} uppercase">${day.dayName}</span>
        <span class="text-[10px] text-slate-500">${day.date.slice(5)}</span>
      </div>
      <div class="my-4 flex items-center gap-3">
        <div class="text-2xl">${icon}</div>
        <div>
          <div class="text-sm font-bold text-white">${high}${unitSymbol} <span class="text-xs font-normal text-slate-400">/ ${low}${unitSymbol}</span></div>
          <div class="text-[11px] text-slate-400 capitalize">${day.description}</div>
        </div>
      </div>
      <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/30">
        <span><i class="fa-solid fa-umbrella text-sky-400 mr-1"></i>${day.rainChance}% rain</span>
        <span><i class="fa-solid fa-wind text-teal-400 mr-1"></i>${day.windSpeedKmH} km/h</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// Saved Locations Management
async function loadSavedLocations() {
  try {
    const res = await fetch('/api/preferences/saved-locations').then(r => r.json());
    if (res.success) {
      savedLocations = res.data;
      renderLocationChips();
      updatePinButtonState();
    }
  } catch (err) {
    console.error('Failed to load saved locations:', err);
  }
}

function renderLocationChips() {
  locationChips.innerHTML = '';
  savedLocations.forEach(loc => {
    const chip = document.createElement('button');
    const isCurrent = loc.name.toLowerCase() === currentCity.toLowerCase();
    chip.className = `px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
      isCurrent ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
    }`;
    chip.innerHTML = `<span>${loc.name}</span>`;
    chip.onclick = () => fetchWeather(loc.name);
    locationChips.appendChild(chip);
  });
}

function updatePinButtonState() {
  const isPinned = savedLocations.some(l => l.name.toLowerCase() === currentCity.toLowerCase());
  if (isPinned) {
    pinLocationBtn.innerHTML = '<i class="fa-solid fa-star text-amber-400"></i>';
    pinLocationBtn.title = 'City pinned to saved locations';
  } else {
    pinLocationBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
    pinLocationBtn.title = 'Pin city to quick access';
  }
}

async function togglePinLocation() {
  const existing = savedLocations.find(l => l.name.toLowerCase() === currentCity.toLowerCase());
  if (existing) {
    // Delete
    await fetch(`/api/preferences/saved-locations/${existing.id}`, { method: 'DELETE' });
    savedLocations = savedLocations.filter(l => l.id !== existing.id);
  } else if (currentWeatherData) {
    // Add
    const res = await fetch('/api/preferences/saved-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: currentWeatherData.cityName,
        country: currentWeatherData.country,
        lat: currentWeatherData.coordinates.lat,
        lon: currentWeatherData.coordinates.lon
      })
    }).then(r => r.json());
    if (res.success) {
      savedLocations.push(res.data);
    }
  }
  renderLocationChips();
  updatePinButtonState();
}

// Autocomplete suggestions
function setupAutocomplete(inputEl, dropdownEl) {
  let debounceTimer;

  inputEl.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    if (query.length < 2) {
      dropdownEl.classList.add('hidden');
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/weather/cities/suggestions?q=${encodeURIComponent(query)}`).then(r => r.json());
        if (res.success && res.data.length > 0) {
          dropdownEl.innerHTML = '';
          res.data.forEach(city => {
            const row = document.createElement('div');
            row.className = 'px-4 py-2.5 hover:bg-slate-700/80 cursor-pointer flex items-center justify-between text-xs sm:text-sm text-slate-200';
            row.innerHTML = `
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-location-dot text-sky-400"></i>
                <span class="font-medium">${city.name}</span>
                <span class="text-xs text-slate-400">(${city.country})</span>
              </div>
              <span class="text-xs text-slate-400">${city.condition}</span>
            `;
            row.onclick = () => {
              inputEl.value = city.name;
              dropdownEl.classList.add('hidden');
              fetchWeather(city.name);
            };
            dropdownEl.appendChild(row);
          });
          dropdownEl.classList.remove('hidden');
        } else {
          dropdownEl.classList.add('hidden');
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
  });

  document.addEventListener('click', (e) => {
    if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
      dropdownEl.classList.add('hidden');
    }
  });
}

// Temperature Unit Toggle
function setUnit(unit) {
  currentUnit = unit;
  if (unit === 'imperial') {
    unitCelsiusBtn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-200';
    unitFahrenheitBtn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all bg-sky-500 text-white shadow-sm';
  } else {
    unitCelsiusBtn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all bg-sky-500 text-white shadow-sm';
    unitFahrenheitBtn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-slate-200';
  }
  if (currentWeatherData) renderCurrentWeather(currentWeatherData);
  if (currentForecastData) renderUpcomingForecast(currentForecastData.dailyForecast);
}

// UI Helpers
function showLoading(show) {
  loadingIndicator.classList.toggle('hidden', !show);
  if (show) weatherContent.classList.add('opacity-50');
  else weatherContent.classList.remove('opacity-50');
}

function showError(show, msg = '') {
  errorMessage.classList.toggle('hidden', !show);
  weatherContent.classList.toggle('hidden', show);
  if (msg) errorText.innerText = msg;
}

// Geolocation
function handleCurrentLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  showLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchWeather(null, pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      showLoading(false);
      alert('Unable to retrieve location. Defaulting to Manila.');
      fetchWeather('Manila');
    }
  );
}

// Settings Modal Handlers
function openSettings() {
  settingsModal.classList.remove('hidden');
  fetch('/api/health')
    .then(r => r.json())
    .then(data => {
      document.getElementById('diagnosticDb').innerText = data.database;
      document.getElementById('diagnosticWeather').innerText = data.openWeatherApiConfigured ? 'OpenWeather Live API' : 'Simulated Sandbox';
      document.getElementById('diagnosticUptime').innerText = `${Math.floor(data.uptime)}s`;
    })
    .catch(() => {});
}

// Event Listeners
desktopSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && desktopSearchInput.value.trim()) {
    fetchWeather(desktopSearchInput.value.trim());
    desktopSuggestions.classList.add('hidden');
  }
});
searchBtnDesktop.onclick = () => {
  if (desktopSearchInput.value.trim()) fetchWeather(desktopSearchInput.value.trim());
};

mobileSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && mobileSearchInput.value.trim()) {
    fetchWeather(mobileSearchInput.value.trim());
    mobileSuggestions.classList.add('hidden');
  }
});
searchBtnMobile.onclick = () => {
  if (mobileSearchInput.value.trim()) fetchWeather(mobileSearchInput.value.trim());
};

unitCelsiusBtn.onclick = () => setUnit('metric');
unitFahrenheitBtn.onclick = () => setUnit('imperial');
currentLocBtn.onclick = handleCurrentLocation;
pinLocationBtn.onclick = togglePinLocation;

settingsBtn.onclick = openSettings;
closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');
settingsModal.onclick = (e) => {
  if (e.target === settingsModal) settingsModal.classList.add('hidden');
};

modalUnitCelsius.onclick = () => {
  setUnit('metric');
  modalUnitCelsius.className = 'p-2.5 rounded-xl border border-sky-500 bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center gap-2';
  modalUnitFahrenheit.className = 'p-2.5 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:border-slate-600';
};
modalUnitFahrenheit.onclick = () => {
  setUnit('imperial');
  modalUnitFahrenheit.className = 'p-2.5 rounded-xl border border-sky-500 bg-sky-500/20 text-sky-300 font-bold text-xs flex items-center justify-center gap-2';
  modalUnitCelsius.className = 'p-2.5 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:border-slate-600';
};

modalWindKmh.onclick = () => {
  windUnit = 'kmh';
  modalWindKmh.className = 'p-2.5 rounded-xl border border-sky-500 bg-sky-500/20 text-sky-300 font-bold text-xs';
  modalWindMph.className = 'p-2.5 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 font-bold text-xs';
  if (currentWeatherData) renderCurrentWeather(currentWeatherData);
};
modalWindMph.onclick = () => {
  windUnit = 'mph';
  modalWindMph.className = 'p-2.5 rounded-xl border border-sky-500 bg-sky-500/20 text-sky-300 font-bold text-xs';
  modalWindKmh.className = 'p-2.5 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 font-bold text-xs';
  if (currentWeatherData) renderCurrentWeather(currentWeatherData);
};

saveSettingsBtn.onclick = async () => {
  await fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unit: currentUnit, windUnit })
  });
  settingsModal.classList.add('hidden');
};

// Initial setup
setupAutocomplete(desktopSearchInput, desktopSuggestions);
setupAutocomplete(mobileSearchInput, mobileSuggestions);
loadSavedLocations();
fetchWeather('Manila');
