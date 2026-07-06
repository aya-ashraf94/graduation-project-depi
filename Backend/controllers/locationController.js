const {
  governorates,
  getCitiesByGovernorateId,
  getDistrictsByCityId,
  getGovernorateById,
  getCityById,
} = require('../utils/egyptLocations');

const getGovernorates = async (req, res) => {
  res.json(governorates);
};

const getCities = async (req, res) => {
  const { governorateId } = req.params;
  const cities = getCitiesByGovernorateId(governorateId);
  if (cities.length === 0) {
    return res.status(404).json({ message: 'Governorate not found' });
  }
  res.json(cities);
};

const getDistricts = async (req, res) => {
  const { cityId } = req.params;
  const districts = getDistrictsByCityId(cityId);
  if (districts.length === 0) {
    return res.status(404).json({ message: 'City not found' });
  }
  res.json(districts);
};

module.exports = {
  getGovernorates,
  getCities,
  getDistricts,
};
