const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');
const { validate, cartItemValidation, mongoIdValidation } = require('../middleware/validators');
const { body } = require('express-validator');

router.use(authenticate);

router.get('/', cartController.getCart);

router.post(
  '/items',
  cartItemValidation,
  validate,
  cartController.addToCart
);

router.put(
  '/items/:itemId',
  mongoIdValidation('itemId'),
  body('quantity').isInt({ min: 0, max: 10 }),
  validate,
  cartController.updateCartItem
);

router.delete(
  '/items/:itemId',
  mongoIdValidation('itemId'),
  validate,
  cartController.removeFromCart
);

router.delete('/', cartController.clearCart);

router.get('/validate', cartController.validateCart);

module.exports = router;
