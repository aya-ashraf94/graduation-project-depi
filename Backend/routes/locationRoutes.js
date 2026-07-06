const express = require('express');
const router = express.Router();
const {
  getGovernorates,
  getCities,
  getDistricts,
} = require('../controllers/locationController');

router.get('/governorates', getGovernorates);
router.get('/cities/:governorateId', getCities);
router.get('/districts/:cityId', getDistricts);

module.exports = router;
