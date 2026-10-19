require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const weatherRoutes = require('./routes/weather');
const preferencesRoutes = require('./routes/preferences');
const healthRoutes = require('./routes/health');
const dbService = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/health', healthRoutes);

// Static frontend serving
const clientDist = path.join(__dirname, '../client/dist');
const publicDir = path.join(__dirname, '../public');

if (fs.existsSync(clientDist)) {
  console.log(`Serving static files from ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else if (fs.existsSync(publicDir)) {
  console.log(`Serving static files from ${publicDir}`);
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.url.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
});

// Start server and initialize database
async function startServer() {
  await dbService.initDb();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🌦️  WeatherWise Server running on port ${PORT}`);
    console.log(`🌐  Local URL: http://localhost:${PORT}`);
    console.log(`📡  Health check: http://localhost:${PORT}/api/health`);
    console.log(`===============================================`);
  });
}

startServer();
