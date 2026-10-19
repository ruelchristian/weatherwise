const https = require('https');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Major city coordinates and default data
const POPULAR_CITIES = [
  { name: 'Manila', country: 'PH', lat: 14.5995, lon: 120.9842, baseTemp: 31, condition: 'Clouds', description: 'scattered clouds', humidity: 76, wind: 14, rainChance: 45 },
  { name: 'Quezon City', country: 'PH', lat: 14.6760, lon: 121.0437, baseTemp: 30, condition: 'Rain', description: 'light rain shower', humidity: 82, wind: 11, rainChance: 70 },
  { name: 'Cebu City', country: 'PH', lat: 10.3157, lon: 123.8854, baseTemp: 32, condition: 'Clear', description: 'clear sky', humidity: 68, wind: 18, rainChance: 20 },
  { name: 'Davao City', country: 'PH', lat: 7.1907, lon: 125.4579, baseTemp: 29, condition: 'Thunderstorm', description: 'isolated thunderstorm', humidity: 85, wind: 9, rainChance: 80 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503, baseTemp: 18, condition: 'Clear', description: 'clear sky', humidity: 55, wind: 12, rainChance: 10 },
  { name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060, baseTemp: 15, condition: 'Clouds', description: 'overcast clouds', humidity: 62, wind: 19, rainChance: 35 },
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278, baseTemp: 13, condition: 'Rain', description: 'light drizzle', humidity: 88, wind: 22, rainChance: 65 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522, baseTemp: 16, condition: 'Clear', description: 'clear sky', humidity: 58, wind: 15, rainChance: 15 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198, baseTemp: 31, condition: 'Thunderstorm', description: 'thunderstorm with light rain', humidity: 84, wind: 10, rainChance: 75 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093, baseTemp: 22, condition: 'Clouds', description: 'few clouds', humidity: 60, wind: 24, rainChance: 25 }
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + data));
        }
      });
    }).on('error', err => reject(err));
  });
}

function getCacheKey(type, params) {
  return `${type}:${JSON.stringify(params)}`;
}

// Generate deterministic realistic simulated weather for any city
function generateSimulatedCurrent(query) {
  const norm = (query || 'Manila').toLowerCase().trim();
  const matched = POPULAR_CITIES.find(c => c.name.toLowerCase() === norm || norm.includes(c.name.toLowerCase())) 
    || POPULAR_CITIES[Math.abs(hashString(norm)) % POPULAR_CITIES.length];

  const now = new Date();
  const hour = now.getHours();
  // Diurnal variation
  const tempVariance = Math.sin((hour - 8) * (Math.PI / 12)) * 4;
  const tempC = Math.round((matched.baseTemp + tempVariance) * 10) / 10;
  const feelsLikeC = Math.round((tempC + (matched.humidity > 70 ? 2.5 : -1)) * 10) / 10;

  return {
    cityName: matched.name,
    country: matched.country,
    coordinates: { lat: matched.lat, lon: matched.lon },
    temperature: {
      celsius: tempC,
      fahrenheit: Math.round((tempC * 9 / 5 + 32) * 10) / 10,
      feelsLikeCelsius: feelsLikeC,
      feelsLikeFahrenheit: Math.round((feelsLikeC * 9 / 5 + 32) * 10) / 10
    },
    condition: {
      main: matched.condition,
      description: matched.description,
      icon: getIconCode(matched.condition, hour)
    },
    metrics: {
      humidity: matched.humidity,
      windSpeedKmH: matched.wind,
      windSpeedMps: Math.round((matched.wind / 3.6) * 10) / 10,
      pressureHpa: 1012,
      cloudiness: matched.condition === 'Clear' ? 10 : matched.condition === 'Clouds' ? 75 : 90,
      rainProbabilityPercent: matched.rainChance
    },
    sun: {
      sunrise: new Date(now.setHours(5, 45, 0, 0)).toISOString(),
      sunset: new Date(now.setHours(18, 15, 0, 0)).toISOString()
    },
    timestamp: new Date().toISOString(),
    isSimulated: true,
    notice: 'Simulated preview mode. Configure OPENWEATHER_API_KEY in Render environment to enable live OpenWeather API data.'
  };
}

function generateSimulatedForecast(query) {
  const current = generateSimulatedCurrent(query);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  
  const dailyForecast = [];
  const hourlyPrecipitation = [];

  // Generate 5-day forecast
  for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayName = days[d.getDay()];
    const variance = (Math.sin(i * 1.5) * 3);
    const highC = Math.round((current.temperature.celsius + 2 + variance) * 10) / 10;
    const lowC = Math.round((current.temperature.celsius - 4 + variance) * 10) / 10;
    const condList = ['Clear', 'Clouds', 'Rain', 'Thunderstorm'];
    const cond = condList[(Math.abs(hashString(query + i))) % condList.length];

    dailyForecast.push({
      date: d.toISOString().split('T')[0],
      dayName,
      condition: cond,
      description: cond === 'Rain' ? 'Scattered rain showers' : cond === 'Clouds' ? 'Partly cloudy' : 'Mostly clear',
      icon: getIconCode(cond, 12),
      tempHighC: highC,
      tempHighF: Math.round(highC * 9 / 5 + 32),
      tempLowC: lowC,
      tempLowF: Math.round(lowC * 9 / 5 + 32),
      rainChance: cond === 'Rain' ? 75 : cond === 'Thunderstorm' ? 85 : cond === 'Clouds' ? 35 : 10,
      windSpeedKmH: Math.round(current.metrics.windSpeedKmH + (i % 3) * 2)
    });
  }

  // Generate 8 3-hour precipitation slots for next 24 hours
  for (let i = 0; i < 8; i++) {
    const h = new Date();
    h.setHours(today.getHours() + (i * 3));
    const hLabel = h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const pChance = Math.min(100, Math.max(5, Math.round(current.metrics.rainProbabilityPercent + Math.sin(i) * 25)));
    hourlyPrecipitation.push({
      time: hLabel,
      rainChancePercent: pChance,
      precipitationMm: pChance > 40 ? Math.round((pChance / 30) * 10) / 10 : 0
    });
  }

  return {
    cityName: current.cityName,
    country: current.country,
    dailyForecast,
    hourlyPrecipitation,
    timestamp: new Date().toISOString(),
    isSimulated: true
  };
}

function getIconCode(condition, hour) {
  const isNight = hour < 6 || hour >= 18;
  const suffix = isNight ? 'n' : 'd';
  switch (condition) {
    case 'Clear': return `01${suffix}`;
    case 'Clouds': return `03${suffix}`;
    case 'Rain': return `10${suffix}`;
    case 'Thunderstorm': return `11${suffix}`;
    case 'Snow': return `13${suffix}`;
    default: return `50${suffix}`;
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// Public API
async function getCurrentWeather(city = 'Manila', lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const cacheKey = getCacheKey('current', { city, lat, lon });

  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (apiKey) {
    try {
      const queryParam = (lat && lon) ? `lat=${lat}&lon=${lon}` : `q=${encodeURIComponent(city)}`;
      const url = `https://api.openweathermap.org/data/2.5/weather?${queryParam}&appid=${apiKey}&units=metric`;
      const res = await httpGet(url);

      if (res.status === 200) {
        const d = res.data;
        const normalized = {
          cityName: d.name,
          country: d.sys?.country || '',
          coordinates: { lat: d.coord.lat, lon: d.coord.lon },
          temperature: {
            celsius: Math.round(d.main.temp * 10) / 10,
            fahrenheit: Math.round((d.main.temp * 9 / 5 + 32) * 10) / 10,
            feelsLikeCelsius: Math.round(d.main.feels_like * 10) / 10,
            feelsLikeFahrenheit: Math.round((d.main.feels_like * 9 / 5 + 32) * 10) / 10
          },
          condition: {
            main: d.weather[0]?.main || 'Clear',
            description: d.weather[0]?.description || '',
            icon: d.weather[0]?.icon || '01d'
          },
          metrics: {
            humidity: d.main.humidity,
            windSpeedKmH: Math.round(d.wind.speed * 3.6 * 10) / 10,
            windSpeedMps: Math.round(d.wind.speed * 10) / 10,
            pressureHpa: d.main.pressure,
            cloudiness: d.clouds?.all ?? 0,
            rainProbabilityPercent: d.rain ? 90 : (d.clouds?.all > 60 ? 40 : 10)
          },
          sun: {
            sunrise: new Date(d.sys.sunrise * 1000).toISOString(),
            sunset: new Date(d.sys.sunset * 1000).toISOString()
          },
          timestamp: new Date().toISOString(),
          isSimulated: false
        };

        cache.set(cacheKey, { data: normalized, cachedAt: Date.now() });
        return normalized;
      }
    } catch (err) {
      console.warn('OpenWeather current API error, falling back to simulated data:', err.message);
    }
  }

  const simulated = generateSimulatedCurrent(city);
  cache.set(cacheKey, { data: simulated, cachedAt: Date.now() });
  return simulated;
}

async function getForecast(city = 'Manila', lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const cacheKey = getCacheKey('forecast', { city, lat, lon });

  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (apiKey) {
    try {
      const queryParam = (lat && lon) ? `lat=${lat}&lon=${lon}` : `q=${encodeURIComponent(city)}`;
      const url = `https://api.openweathermap.org/data/2.5/forecast?${queryParam}&appid=${apiKey}&units=metric`;
      const res = await httpGet(url);

      if (res.status === 200) {
        const d = res.data;
        const dailyMap = new Map();
        const hourlyPrecipitation = [];

        // Parse 3-hour list
        d.list.slice(0, 8).forEach(item => {
          hourlyPrecipitation.push({
            time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            rainChancePercent: Math.round((item.pop || 0) * 100),
            precipitationMm: item.rain?.['3h'] || 0
          });
        });

        // Group into daily forecast
        d.list.forEach(item => {
          const date = item.dt_txt.split(' ')[0];
          if (!dailyMap.has(date)) {
            dailyMap.set(date, {
              date,
              temps: [],
              conditions: [],
              rainChances: []
            });
          }
          dailyMap.get(date).temps.push(item.main.temp);
          dailyMap.get(date).conditions.push(item.weather[0]);
          dailyMap.get(date).rainChances.push(item.pop || 0);
        });

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dailyForecast = Array.from(dailyMap.values()).slice(0, 5).map(day => {
          const dt = new Date(day.date);
          const max = Math.max(...day.temps);
          const min = Math.min(...day.temps);
          const maxPop = Math.max(...day.rainChances);
          const midWeather = day.conditions[Math.floor(day.conditions.length / 2)] || day.conditions[0];

          return {
            date: day.date,
            dayName: days[dt.getDay()],
            condition: midWeather.main,
            description: midWeather.description,
            icon: midWeather.icon,
            tempHighC: Math.round(max * 10) / 10,
            tempHighF: Math.round((max * 9 / 5 + 32) * 10) / 10,
            tempLowC: Math.round(min * 10) / 10,
            tempLowF: Math.round((min * 9 / 5 + 32) * 10) / 10,
            rainChance: Math.round(maxPop * 100),
            windSpeedKmH: 15
          };
        });

        const normalized = {
          cityName: d.city?.name || city,
          country: d.city?.country || '',
          dailyForecast,
          hourlyPrecipitation,
          timestamp: new Date().toISOString(),
          isSimulated: false
        };

        cache.set(cacheKey, { data: normalized, cachedAt: Date.now() });
        return normalized;
      }
    } catch (err) {
      console.warn('OpenWeather forecast API error, falling back to simulated data:', err.message);
    }
  }

  const simulated = generateSimulatedForecast(city);
  cache.set(cacheKey, { data: simulated, cachedAt: Date.now() });
  return simulated;
}

function getCitySuggestions(query = '') {
  if (!query) return POPULAR_CITIES.slice(0, 5);
  const q = query.toLowerCase().trim();
  return POPULAR_CITIES.filter(c => 
    c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
  );
}

module.exports = {
  getCurrentWeather,
  getForecast,
  getCitySuggestions,
  POPULAR_CITIES
};
