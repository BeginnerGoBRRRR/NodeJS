const express = require('express');
const router = express.Router();
const { check_authentication } = require('../utils/check_auth');
const cartSchema = require('../schemas/cart');
const productSchema = require('../schemas/product');
let { CreateSuccessResponse, CreateErrorResponse } = require('../utils/responseHandler');

// Get user's cart
router.get('/', check_authentication, async (req, res) => {
    try {
        const cart = await cartSchema.findOne({ user: req.user._id })
            .populate('items.product');
        
        if (!cart) {
            return CreateSuccessResponse(res, 200, []);
        }

        CreateSuccessResponse(res, 200, cart.items);
    } catch (error) {
        CreateErrorResponse(res, 500, error.message);
    }
});

// Add item to cart
router.post('/add', check_authentication, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        
        // Find the product
        const product = await productSchema.findById(productId);
        if (!product) {
            return CreateErrorResponse(res, 404, 'Product not found');
        }

        // Find or create user's cart
        let cart = await cartSchema.findOne({ user: req.user._id });
        if (!cart) {
            cart = new cartSchema({
                user: req.user._id,
                items: []
            });
        }

        // Check if item already exists in cart
        const existingItem = cart.items.find(item => item.product.toString() === productId);
        if (existingItem) {
            existingItem.quantity += parseInt(quantity);
        } else {
            cart.items.push({
                product: productId,
                quantity: parseInt(quantity)
            });
        }

        await cart.save();
        CreateSuccessResponse(res, 200, cart.items);
    } catch (error) {
        CreateErrorResponse(res, 500, error.message);
    }
});

// Update item quantity
router.post('/update', check_authentication, async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        
        const cart = await cartSchema.findOne({ user: req.user._id });
        if (!cart) {
            return CreateErrorResponse(res, 404, 'Cart not found');
        }

        const item = cart.items.find(item => item.product.toString() === productId);
        if (!item) {
            return CreateErrorResponse(res, 404, 'Item not found in cart');
        }

        item.quantity = parseInt(quantity);
        await cart.save();

        CreateSuccessResponse(res, 200, cart.items);
    } catch (error) {
        CreateErrorResponse(res, 500, error.message);
    }
});

// Remove item from cart
router.post('/remove', check_authentication, async (req, res) => {
    try {
        const { productId } = req.body;
        
        const cart = await cartSchema.findOne({ user: req.user._id });
        if (!cart) {
            return CreateErrorResponse(res, 404, 'Cart not found');
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();

        CreateSuccessResponse(res, 200, cart.items);
    } catch (error) {
        CreateErrorResponse(res, 500, error.message);
    }
});

// Clear cart
router.post('/clear', check_authentication, async (req, res) => {
    try {
        const cart = await cartSchema.findOne({ user: req.user._id });
        if (!cart) {
            return CreateErrorResponse(res, 404, 'Cart not found');
        }

        cart.items = [];
        await cart.save();

        CreateSuccessResponse(res, 200, []);
    } catch (error) {
        CreateErrorResponse(res, 500, error.message);
    }
});

module.exports = router; 