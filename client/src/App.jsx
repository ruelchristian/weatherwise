import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Sun, Moon, Cloud, CloudRain, CloudLightning, Snowflake, 
  Wind, Droplets, Gauge, Umbrella, MapPin, Bookmark, Star, Settings, 
  Search, Crosshair, X, RefreshCw 
} from 'lucide-react';

export default function App() {
  const [city, setCity] = useState('Manila');
  const [searchInput, setSearchInput] = useState('');
  const [unit, setUnit] = useState('metric'); // 'metric' or 'imperial'
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [savedLocations, setSavedLocations] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);

  // Initial load
  useEffect(() => {
    fetchSavedLocations();
    fetchWeather('Manila');
  }, []);

  // Fetch weather data
  async function fetchWeather(targetCity, lat = null, lon = null) {
    setLoading(true);
    setError(null);
    try {
      const query = lat && lon ? `lat=${lat}&lon=${lon}` : `city=${encodeURIComponent(targetCity)}`;
      const [curRes, foreRes] = await Promise.all([
        fetch(`/api/weather/current?${query}`).then(r => r.json()),
        fetch(`/api/weather/forecast?${query}`).then(r => r.json())
      ]);

      if (!curRes.success || !foreRes.success) {
        throw new Error(curRes.error || foreRes.error || 'Weather lookup failed');
      }

      setCurrentWeather(curRes.data);
      setForecast(foreRes.data);
      setCity(curRes.data.cityName);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Saved locations
  async function fetchSavedLocations() {
    try {
      const res = await fetch('/api/preferences/saved-locations').then(r => r.json());
      if (res.success) setSavedLocations(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function togglePin() {
    if (!currentWeather) return;
    const exists = savedLocations.find(l => l.name.toLowerCase() === currentWeather.cityName.toLowerCase());
    if (exists) {
      await fetch(`/api/preferences/saved-locations/${exists.id}`, { method: 'DELETE' });
      setSavedLocations(prev => prev.filter(l => l.id !== exists.id));
    } else {
      const res = await fetch('/api/preferences/saved-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentWeather.cityName,
          country: currentWeather.country,
          lat: currentWeather.coordinates.lat,
          lon: currentWeather.coordinates.lon
        })
      }).then(r => r.json());
      if (res.success) setSavedLocations(prev => [...prev, res.data]);
    }
  }

  // Handle Search Input
  async function handleSearchChange(val) {
    setSearchInput(val);
    if (val.trim().length > 1) {
      try {
        const res = await fetch(`/api/weather/cities/suggestions?q=${encodeURIComponent(val)}`).then(r => r.json());
        if (res.success) setSuggestions(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSuggestions([]);
    }
  }

  function handleSelectCity(name) {
    setSearchInput('');
    setSuggestions([]);
    fetchWeather(name);
  }

  // Geolocation
  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(null, pos.coords.latitude, pos.coords.longitude),
      () => {
        setLoading(false);
        fetchWeather('Manila');
      }
    );
  }

  // Formatting helpers
  const isPinned = currentWeather && savedLocations.some(l => l.name.toLowerCase() === currentWeather.cityName.toLowerCase());
  const formatTemp = (c) => c !== undefined && c !== null ? (unit === 'imperial' ? Math.round(c * 9 / 5 + 32) : Math.round(c)) : '--';
  const unitSymbol = unit === 'imperial' ? '°F' : '°C';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => fetchWeather('Manila')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <CloudSun className="text-white w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">WeatherWise</span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">Live</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchInput.trim() && handleSelectCity(searchInput.trim())}
                placeholder="Search city (e.g., Manila, Tokyo, London)..."
                className="w-full bg-slate-800/80 text-sm pl-10 pr-20 py-2.5 rounded-xl border border-slate-700/80 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button 
                onClick={() => searchInput.trim() && handleSelectCity(searchInput.trim())}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg">
                Search
              </button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 divide-y divide-slate-700/50">
                {suggestions.map(s => (
                  <div 
                    key={s.name}
                    onClick={() => handleSelectCity(s.name)}
                    className="px-4 py-2.5 hover:bg-slate-700/80 cursor-pointer flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-white">{s.name} <span className="text-slate-400">({s.country})</span></span>
                    <span className="text-xs text-sky-400">{s.condition}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCurrentLocation}
              title="Current Location"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
              <Crosshair className="w-4 h-4" />
            </button>

            <div className="inline-flex p-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold">
              <button 
                onClick={() => setUnit('metric')}
                className={`px-2.5 py-1 rounded-lg ${unit === 'metric' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400'}`}>
                °C
              </button>
              <button 
                onClick={() => setUnit('imperial')}
                className={`px-2.5 py-1 rounded-lg ${unit === 'imperial' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400'}`}>
                °F
              </button>
            </div>

            <button 
              onClick={async () => {
                setSettingsOpen(true);
                const res = await fetch('/api/health').then(r => r.json());
                setDiagnostics(res);
              }}
              title="System Settings"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {/* Saved Locations Chips */}
        <section className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 whitespace-nowrap">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" /> Pinned:
          </span>
          {savedLocations.map(loc => (
            <button
              key={loc.id}
              onClick={() => fetchWeather(loc.name)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                loc.name.toLowerCase() === city.toLowerCase()
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}>
              {loc.name}
            </button>
          ))}
        </section>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 text-center">
            <RefreshCw className="w-10 h-10 text-sky-400 animate-spin mx-auto" />
            <p className="mt-4 text-sm text-slate-400 font-medium">Fetching real-time weather observations...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !loading && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-rose-300">Unable to Load Weather</h3>
            <p className="text-sm text-slate-400 mt-1">{error}</p>
            <button 
              onClick={() => fetchWeather('Manila')} 
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white">
              Reset to Default (Manila)
            </button>
          </div>
        )}

        {/* Weather Dashboard */}
        {!loading && currentWeather && forecast && (
          <div className="space-y-6">
            
            {/* Hero Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Primary Card */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/70 shadow-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{currentWeather.cityName}</h1>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-700 text-sky-300">{currentWeather.country}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      {new Date(currentWeather.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button 
                    onClick={togglePin}
                    className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-400 border border-slate-700">
                    <Star className={`w-5 h-5 ${isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between my-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl sm:text-8xl font-black text-white">{formatTemp(currentWeather.temperature.celsius)}</span>
                    <span className="text-3xl sm:text-5xl font-light text-sky-400">{unitSymbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                      {currentWeather.condition.description}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                      Feels like {formatTemp(currentWeather.temperature.feelsLikeCelsius)}{unitSymbol}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/50">
                  <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/40">
                    <div className="text-slate-400 text-xs flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-sky-400" /> Humidity</div>
                    <div className="text-lg font-bold text-white mt-1">{currentWeather.metrics.humidity}%</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/40">
                    <div className="text-slate-400 text-xs flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-teal-400" /> Wind</div>
                    <div className="text-lg font-bold text-white mt-1">{currentWeather.metrics.windSpeedKmH} km/h</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/40">
                    <div className="text-slate-400 text-xs flex items-center gap-1.5"><Umbrella className="w-3.5 h-3.5 text-blue-400" /> Rain Chance</div>
                    <div className="text-lg font-bold text-white mt-1">{currentWeather.metrics.rainProbabilityPercent}%</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/40">
                    <div className="text-slate-400 text-xs flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-purple-400" /> Pressure</div>
                    <div className="text-lg font-bold text-white mt-1">{currentWeather.metrics.pressureHpa} hPa</div>
                  </div>
                </div>
              </div>

              {/* Side Card */}
              <div className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Atmospheric Conditions</h2>
                  <div className="mt-4 space-y-4 text-xs sm:text-sm">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Cloud Coverage</span>
                        <span className="text-white font-semibold">{currentWeather.metrics.cloudiness}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full">
                        <div className="bg-slate-300 h-1.5 rounded-full" style={{ width: `${currentWeather.metrics.cloudiness}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Precipitation Risk</span>
                        <span className="text-sky-400 font-semibold">{currentWeather.metrics.rainProbabilityPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full">
                        <div className="bg-sky-400 h-1.5 rounded-full" style={{ width: `${currentWeather.metrics.rainProbabilityPercent}%` }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-700/40 font-mono text-xs">
                      <span>Coordinates</span>
                      <span>{currentWeather.coordinates.lat.toFixed(2)}° N, {currentWeather.coordinates.lon.toFixed(2)}° E</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 text-xs">
                  <div className="text-slate-400 font-bold uppercase text-[10px] mb-2">Sun Cycle</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-800/40">
                      <div className="text-slate-400">Sunrise</div>
                      <div className="text-amber-300 font-bold mt-0.5">{new Date(currentWeather.sun.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-800/40">
                      <div className="text-slate-400">Sunset</div>
                      <div className="text-orange-400 font-bold mt-0.5">{new Date(currentWeather.sun.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Rain Precipitation 24h Timeline */}
            <section className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Umbrella className="w-5 h-5 text-sky-400" /> Precipitation & Rain Forecast (Next 24h)
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 overflow-x-auto pb-2">
                {forecast.hourlyPrecipitation.map((slot, idx) => (
                  <div key={idx} className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 text-center min-w-[70px]">
                    <span className="text-[11px] font-medium text-slate-400 mb-2">{slot.time}</span>
                    <div className="h-16 w-3 bg-slate-900 rounded-full flex items-end p-0.5 overflow-hidden my-1">
                      <div 
                        className={`w-full rounded-full ${slot.rainChancePercent > 50 ? 'bg-sky-400' : 'bg-slate-600'}`} 
                        style={{ height: `${Math.max(15, slot.rainChancePercent)}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-white mt-1">{slot.rainChancePercent}%</span>
                    <span className="text-[10px] text-slate-500">{slot.precipitationMm} mm</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 5-Day Upcoming Forecast */}
            <section className="bg-slate-800/70 border border-slate-700/70 rounded-3xl p-6 shadow-xl">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 mb-4">
                <CloudSun className="w-5 h-5 text-indigo-400" /> 5-Day Upcoming Forecast
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {forecast.dailyForecast.map((day, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex flex-col justify-between hover:border-sky-500/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${idx === 0 ? 'text-sky-400' : 'text-slate-300'} uppercase`}>{day.dayName}</span>
                      <span className="text-[10px] text-slate-500">{day.date.slice(5)}</span>
                    </div>
                    <div className="my-4">
                      <div className="text-base font-bold text-white">
                        {formatTemp(day.tempHighC)}{unitSymbol} <span className="text-xs font-normal text-slate-400">/ {formatTemp(day.tempLowC)}{unitSymbol}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 capitalize mt-1">{day.description}</div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/30">
                      <span>{day.rainChance}% rain</span>
                      <span>{day.windSpeedKmH} km/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" /> System Configuration
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 uppercase mb-2">Temperature Unit</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setUnit('metric')}
                    className={`p-2.5 rounded-xl border font-bold ${unit === 'metric' ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-700 bg-slate-900/50 text-slate-400'}`}>
                    Celsius (°C)
                  </button>
                  <button 
                    onClick={() => setUnit('imperial')}
                    className={`p-2.5 rounded-xl border font-bold ${unit === 'imperial' ? 'border-sky-500 bg-sky-500/20 text-sky-300' : 'border-slate-700 bg-slate-900/50 text-slate-400'}`}>
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              {diagnostics && (
                <div className="rounded-2xl bg-slate-900/70 border border-slate-700/60 p-4 space-y-2">
                  <div className="font-bold text-slate-300 uppercase text-[10px]">Diagnostics</div>
                  <div className="flex justify-between text-slate-400">
                    <span>Database:</span>
                    <span className="text-sky-400">{diagnostics.database}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Weather API:</span>
                    <span className="text-amber-400">{diagnostics.openWeatherApiConfigured ? 'OpenWeather Live' : 'Simulation Sandbox'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Uptime:</span>
                    <span className="font-mono text-slate-300">{Math.floor(diagnostics.uptime)}s</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/90 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>WeatherWise Monitoring & Forecasting • Miguel Fernando Duyag (IPT2)</span>
          <span>Hosted on Render</span>
        </div>
      </footer>

    </div>
  );
}
