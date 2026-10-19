const mysql = require('mysql2/promise');

// In-memory fallback store
const memoryStore = {
  preferences: {
    unit: 'metric', // 'metric' (°C) or 'imperial' (°F)
    windUnit: 'kmh', // 'kmh' or 'mph'
    autoRefresh: true,
    refreshInterval: 15
  },
  savedLocations: [
    { id: 1, name: 'Manila', country: 'PH', lat: 14.5995, lon: 120.9842, isDefault: true },
    { id: 2, name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503, isDefault: false },
    { id: 3, name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060, isDefault: false }
  ],
  searchHistory: []
};

let pool = null;
let useDatabase = false;

// Initialize MySQL pool if environment credentials exist
async function initDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const host = process.env.DB_HOST || process.env.MYSQLHOST;
  const user = process.env.DB_USER || process.env.MYSQLUSER;
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE;
  const port = process.env.DB_PORT || process.env.MYSQLPORT || 3306;

  if (dbUrl || (host && user)) {
    try {
      pool = dbUrl 
        ? mysql.createPool(dbUrl)
        : mysql.createPool({ host, user, password, database, port, waitForConnections: true, connectionLimit: 10 });
      
      // Test connection
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      useDatabase = true;
      console.log('✅ Connected to MySQL database');

      // Create tables if they do not exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          temp_unit VARCHAR(10) DEFAULT 'metric',
          wind_unit VARCHAR(10) DEFAULT 'kmh',
          auto_refresh BOOLEAN DEFAULT TRUE,
          refresh_interval INT DEFAULT 15,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS saved_locations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          country VARCHAR(10) NOT NULL,
          lat DOUBLE NOT NULL,
          lon DOUBLE NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS search_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          query VARCHAR(100) NOT NULL,
          searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

    } catch (err) {
      console.warn('⚠️ MySQL connection failed. Using resilient in-memory store:', err.message);
      useDatabase = false;
    }
  } else {
    console.log('ℹ️ No MySQL connection strings found in environment. Running with in-memory persistence.');
  }
}

// Preference methods
async function getPreferences() {
  if (useDatabase && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM user_preferences ORDER BY id DESC LIMIT 1');
      if (rows.length > 0) {
        return {
          unit: rows[0].temp_unit,
          windUnit: rows[0].wind_unit,
          autoRefresh: Boolean(rows[0].auto_refresh),
          refreshInterval: rows[0].refresh_interval
        };
      }
    } catch (err) {
      console.error('Database query error:', err.message);
    }
  }
  return memoryStore.preferences;
}

async function savePreferences(prefs) {
  if (useDatabase && pool) {
    try {
      await pool.query(
        `INSERT INTO user_preferences (temp_unit, wind_unit, auto_refresh, refresh_interval)
         VALUES (?, ?, ?, ?)`,
        [prefs.unit || 'metric', prefs.windUnit || 'kmh', prefs.autoRefresh ?? true, prefs.refreshInterval || 15]
      );
      return prefs;
    } catch (err) {
      console.error('Database save error:', err.message);
    }
  }
  memoryStore.preferences = { ...memoryStore.preferences, ...prefs };
  return memoryStore.preferences;
}

// Saved Locations methods
async function getSavedLocations() {
  if (useDatabase && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM saved_locations ORDER BY id DESC');
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        country: r.country,
        lat: r.lat,
        lon: r.lon,
        isDefault: Boolean(r.is_default)
      }));
    } catch (err) {
      console.error('Database query error:', err.message);
    }
  }
  return memoryStore.savedLocations;
}

async function addSavedLocation(loc) {
  if (useDatabase && pool) {
    try {
      const [result] = await pool.query(
        'INSERT INTO saved_locations (name, country, lat, lon, is_default) VALUES (?, ?, ?, ?, ?)',
        [loc.name, loc.country || '', loc.lat || 0, loc.lon || 0, loc.isDefault ? 1 : 0]
      );
      return { id: result.insertId, ...loc };
    } catch (err) {
      console.error('Database insert error:', err.message);
    }
  }
  const newLoc = { id: Date.now(), ...loc };
  memoryStore.savedLocations.push(newLoc);
  return newLoc;
}

async function deleteSavedLocation(id) {
  if (useDatabase && pool) {
    try {
      await pool.query('DELETE FROM saved_locations WHERE id = ?', [id]);
      return true;
    } catch (err) {
      console.error('Database delete error:', err.message);
    }
  }
  memoryStore.savedLocations = memoryStore.savedLocations.filter(l => l.id != id);
  return true;
}

// Search History
async function addSearchQuery(query) {
  if (useDatabase && pool) {
    try {
      await pool.query('INSERT INTO search_history (query) VALUES (?)', [query]);
    } catch (err) {
      console.error('Database search query error:', err.message);
    }
  }
  memoryStore.searchHistory.unshift({ query, searchedAt: new Date().toISOString() });
  if (memoryStore.searchHistory.length > 20) memoryStore.searchHistory.pop();
}

async function getSearchHistory() {
  if (useDatabase && pool) {
    try {
      const [rows] = await pool.query('SELECT query, searched_at FROM search_history ORDER BY id DESC LIMIT 10');
      return rows;
    } catch (err) {
      console.error('Database search history error:', err.message);
    }
  }
  return memoryStore.searchHistory.slice(0, 10);
}

module.exports = {
  initDb,
  getPreferences,
  savePreferences,
  getSavedLocations,
  addSavedLocation,
  deleteSavedLocation,
  addSearchQuery,
  getSearchHistory,
  isUsingDatabase: () => useDatabase
};
