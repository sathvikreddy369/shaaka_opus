const config = require('../config');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * Check if coordinates are within delivery radius of Hyderabad
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {object} { isDeliverable, distance }
 */
const isWithinDeliveryRadius = (lat, lng) => {
  const distance = calculateDistance(
    config.hyderabad.lat,
    config.hyderabad.lng,
    lat,
    lng
  );
  
  return {
    isDeliverable: distance <= config.app.deliveryRadiusKm,
    distance: Math.round(distance * 100) / 100,
    maxRadius: config.app.deliveryRadiusKm,
  };
};

/**
 * Calculate delivery charge based on order value
 * @param {number} orderValue - Total order value
 * @returns {number} Delivery charge
 */
const calculateDeliveryCharge = (orderValue) => {
  if (orderValue >= config.app.freeDeliveryThreshold) {
    return 0;
  }
  return config.app.deliveryCharge;
};

/**
 * Check if order meets minimum value requirement
 * @param {number} orderValue - Total order value
 * @returns {object} { isValid, minRequired, difference }
 */
const meetsMinimumOrderValue = (orderValue) => {
  const isValid = orderValue >= config.app.minOrderValue;
  return {
    isValid,
    minRequired: config.app.minOrderValue,
    difference: isValid ? 0 : config.app.minOrderValue - orderValue,
  };
};

module.exports = {
  calculateDistance,
  isWithinDeliveryRadius,
  calculateDeliveryCharge,
  meetsMinimumOrderValue,
};
