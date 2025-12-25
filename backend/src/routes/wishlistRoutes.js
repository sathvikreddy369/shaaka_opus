const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/auth');
const { validate, mongoIdValidation, cartItemValidation } = require('../middleware/validators');
const { body } = require('express-validator');

router.use(authenticate);

router.get('/', wishlistController.getWishlist);

router.post(
  '/items',
  body('productId').isMongoId().withMessage('Invalid product ID'),
  validate,
  wishlistController.addToWishlist
);

router.delete(
  '/items/:productId',
  mongoIdValidation('productId'),
  validate,
  wishlistController.removeFromWishlist
);

router.get(
  '/check/:productId',
  mongoIdValidation('productId'),
  validate,
  wishlistController.checkWishlist
);

router.delete('/', wishlistController.clearWishlist);

router.post(
  '/move-to-cart',
  cartItemValidation,
  validate,
  wishlistController.moveToCart
);

module.exports = router;
