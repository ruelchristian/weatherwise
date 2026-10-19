// Multi-dialect Database Service (PostgreSQL & MySQL & In-Memory Fallback)
let pgPool = null;
let mysqlPool = null;
let dbDialect = 'memory'; // 'postgres', 'mysql', or 'memory'

// In-memory fallback store
const memoryStore = {
  preferences: {
    unit: 'metric',
    windUnit: 'kmh',
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

async function initDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MYSQL_URL;
  const isPostgres = dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'));
  const isMysql = (dbUrl && dbUrl.startsWith('mysql://')) || Boolean(process.env.DB_HOST || process.env.MYSQLHOST);

  // 1. Try PostgreSQL if configured
  if (isPostgres) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      dbDialect = 'postgres';
      console.log('✅ Connected to PostgreSQL database');

      // Create isolated tables for WeatherWise
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS weatherwise_user_preferences (
          id SERIAL PRIMARY KEY,
          temp_unit VARCHAR(10) DEFAULT 'metric',
          wind_unit VARCHAR(10) DEFAULT 'kmh',
          auto_refresh BOOLEAN DEFAULT TRUE,
          refresh_interval INT DEFAULT 15,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS weatherwise_saved_locations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          country VARCHAR(10) NOT NULL,
          lat DOUBLE PRECISION NOT NULL,
          lon DOUBLE PRECISION NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS weatherwise_search_history (
          id SERIAL PRIMARY KEY,
          query VARCHAR(100) NOT NULL,
          searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed, checking MySQL or in-memory fallback:', err.message);
      dbDialect = 'memory';
    }
  }

  // 2. Try MySQL if configured
  if (isMysql) {
    try {
      const mysql = require('mysql2/promise');
      const host = process.env.DB_HOST || process.env.MYSQLHOST;
      const user = process.env.DB_USER || process.env.MYSQLUSER;
      const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
      const database = process.env.DB_NAME || process.env.MYSQLDATABASE;
      const port = process.env.DB_PORT || process.env.MYSQLPORT || 3306;

      mysqlPool = dbUrl && dbUrl.startsWith('mysql://')
        ? mysql.createPool(dbUrl)
        : mysql.createPool({ host, user, password, database, port, waitForConnections: true, connectionLimit: 10 });

      const conn = await mysqlPool.getConnection();
      await conn.ping();
      conn.release();
      dbDialect = 'mysql';
      console.log('✅ Connected to MySQL database');

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS weatherwise_user_preferences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          temp_unit VARCHAR(10) DEFAULT 'metric',
          wind_unit VARCHAR(10) DEFAULT 'kmh',
          auto_refresh BOOLEAN DEFAULT TRUE,
          refresh_interval INT DEFAULT 15,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS weatherwise_saved_locations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          country VARCHAR(10) NOT NULL,
          lat DOUBLE NOT NULL,
          lon DOUBLE NOT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await mysqlPool.query(`
        CREATE TABLE IF NOT EXISTS weatherwise_search_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          query VARCHAR(100) NOT NULL,
          searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      return;
    } catch (err) {
      console.warn('⚠️ MySQL connection failed, falling back to in-memory store:', err.message);
      dbDialect = 'memory';
    }
  }

  console.log('ℹ️ Running with resilient in-memory persistence store.');
}

// Preference methods
async function getPreferences() {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM weatherwise_user_preferences ORDER BY id DESC LIMIT 1');
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          unit: r.temp_unit,
          windUnit: r.wind_unit,
          autoRefresh: Boolean(r.auto_refresh),
          refreshInterval: r.refresh_interval
        };
      }
    } catch (err) {
      console.error('Postgres preferences query error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM weatherwise_user_preferences ORDER BY id DESC LIMIT 1');
      if (rows.length > 0) {
        return {
          unit: rows[0].temp_unit,
          windUnit: rows[0].wind_unit,
          autoRefresh: Boolean(rows[0].auto_refresh),
          refreshInterval: rows[0].refresh_interval
        };
      }
    } catch (err) {
      console.error('MySQL preferences query error:', err.message);
    }
  }
  return memoryStore.preferences;
}

async function savePreferences(prefs) {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO weatherwise_user_preferences (temp_unit, wind_unit, auto_refresh, refresh_interval)
         VALUES ($1, $2, $3, $4)`,
        [prefs.unit || 'metric', prefs.windUnit || 'kmh', prefs.autoRefresh ?? true, prefs.refreshInterval || 15]
      );
      return prefs;
    } catch (err) {
      console.error('Postgres preferences save error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      await mysqlPool.query(
        `INSERT INTO weatherwise_user_preferences (temp_unit, wind_unit, auto_refresh, refresh_interval)
         VALUES (?, ?, ?, ?)`,
        [prefs.unit || 'metric', prefs.windUnit || 'kmh', prefs.autoRefresh ?? true, prefs.refreshInterval || 15]
      );
      return prefs;
    } catch (err) {
      console.error('MySQL preferences save error:', err.message);
    }
  }
  memoryStore.preferences = { ...memoryStore.preferences, ...prefs };
  return memoryStore.preferences;
}

// Saved Locations methods
async function getSavedLocations() {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM weatherwise_saved_locations ORDER BY id DESC');
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        country: r.country,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        isDefault: Boolean(r.is_default)
      }));
    } catch (err) {
      console.error('Postgres saved locations error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT * FROM weatherwise_saved_locations ORDER BY id DESC');
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        country: r.country,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        isDefault: Boolean(r.is_default)
      }));
    } catch (err) {
      console.error('MySQL saved locations error:', err.message);
    }
  }
  return memoryStore.savedLocations;
}

async function addSavedLocation(loc) {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query(
        `INSERT INTO weatherwise_saved_locations (name, country, lat, lon, is_default)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [loc.name, loc.country || '', loc.lat || 0, loc.lon || 0, loc.isDefault ? true : false]
      );
      return { id: res.rows[0].id, ...loc };
    } catch (err) {
      console.error('Postgres insert location error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      const [result] = await mysqlPool.query(
        'INSERT INTO weatherwise_saved_locations (name, country, lat, lon, is_default) VALUES (?, ?, ?, ?, ?)',
        [loc.name, loc.country || '', loc.lat || 0, loc.lon || 0, loc.isDefault ? 1 : 0]
      );
      return { id: result.insertId, ...loc };
    } catch (err) {
      console.error('MySQL insert location error:', err.message);
    }
  }
  const newLoc = { id: Date.now(), ...loc };
  memoryStore.savedLocations.push(newLoc);
  return newLoc;
}

async function deleteSavedLocation(id) {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      await pgPool.query('DELETE FROM weatherwise_saved_locations WHERE id = $1', [id]);
      return true;
    } catch (err) {
      console.error('Postgres delete location error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM weatherwise_saved_locations WHERE id = ?', [id]);
      return true;
    } catch (err) {
      console.error('MySQL delete location error:', err.message);
    }
  }
  memoryStore.savedLocations = memoryStore.savedLocations.filter(l => l.id != id);
  return true;
}

// Search History
async function addSearchQuery(query) {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      await pgPool.query('INSERT INTO weatherwise_search_history (query) VALUES ($1)', [query]);
      return;
    } catch (err) {
      console.error('Postgres search query insert error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      await mysqlPool.query('INSERT INTO weatherwise_search_history (query) VALUES (?)', [query]);
      return;
    } catch (err) {
      console.error('MySQL search query insert error:', err.message);
    }
  }
  memoryStore.searchHistory.unshift({ query, searchedAt: new Date().toISOString() });
  if (memoryStore.searchHistory.length > 20) memoryStore.searchHistory.pop();
}

async function getSearchHistory() {
  if (dbDialect === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT query, searched_at FROM weatherwise_search_history ORDER BY id DESC LIMIT 10');
      return res.rows;
    } catch (err) {
      console.error('Postgres search history error:', err.message);
    }
  } else if (dbDialect === 'mysql' && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT query, searched_at FROM weatherwise_search_history ORDER BY id DESC LIMIT 10');
      return rows;
    } catch (err) {
      console.error('MySQL search history error:', err.message);
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
  getDatabaseStatus: () => {
    if (dbDialect === 'postgres') return 'PostgreSQL (Connected)';
    if (dbDialect === 'mysql') return 'MySQL (Connected)';
    return 'In-Memory Persistence';
  }
};
