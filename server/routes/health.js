const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WeatherWise API',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbService.isUsingDatabase() ? 'MySQL (Connected)' : 'In-Memory Persistence',
    openWeatherApiConfigured: Boolean(process.env.OPENWEATHER_API_KEY)
  });
});

module.exports = router;
