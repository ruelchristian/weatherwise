const express = require('express');
const router = express.Router();
const dbService = require('../services/dbService');

// GET /api/preferences
router.get('/', async (req, res) => {
  try {
    const preferences = await dbService.getPreferences();
    res.json({ success: true, data: preferences });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/preferences
router.post('/', async (req, res) => {
  try {
    const { unit, windUnit, autoRefresh, refreshInterval } = req.body;
    const updated = await dbService.savePreferences({ unit, windUnit, autoRefresh, refreshInterval });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/preferences/saved-locations
router.get('/saved-locations', async (req, res) => {
  try {
    const locations = await dbService.getSavedLocations();
    res.json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/preferences/saved-locations
router.post('/saved-locations', async (req, res) => {
  try {
    const { name, country, lat, lon, isDefault } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'City name is required' });
    }
    const added = await dbService.addSavedLocation({ name, country, lat, lon, isDefault });
    res.json({ success: true, data: added });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/preferences/saved-locations/:id
router.delete('/saved-locations/:id', async (req, res) => {
  try {
    await dbService.deleteSavedLocation(req.params.id);
    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/preferences/history
router.get('/history', async (req, res) => {
  try {
    const history = await dbService.getSearchHistory();
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
