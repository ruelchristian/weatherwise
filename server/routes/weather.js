const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');
const dbService = require('../services/dbService');

// GET /api/weather/current
router.get('/current', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    const locationQuery = city || (lat && lon ? `${lat},${lon}` : 'Manila');
    
    // Log search history asynchronously
    if (city) {
      dbService.addSearchQuery(city).catch(() => {});
    }

    const data = await weatherService.getCurrentWeather(city, lat, lon);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather/forecast
router.get('/forecast', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    const data = await weatherService.getForecast(city, lat, lon);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather/cities/suggestions
router.get('/cities/suggestions', (req, res) => {
  const { q } = req.query;
  const suggestions = weatherService.getCitySuggestions(q);
  res.json({ success: true, data: suggestions });
});

module.exports = router;
