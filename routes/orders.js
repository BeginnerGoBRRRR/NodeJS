const express = require('express');
const router = express.Router();
const Order = require('../schemas/order');
const { check_authentication } = require('../utils/check_auth');

// Get all orders (admin only)
router.get('/', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const orders = await Order.find()
            .populate('user', 'username')
            .populate('items.product', 'name');
        
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get user's orders
router.get('/my-orders', check_authentication, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate('items.product', 'name')
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create new order
router.post('/', check_authentication, async (req, res) => {
    try {
        const order = new Order({
            user: req.user._id,
            items: req.body.items,
            totalAmount: req.body.totalAmount,
            shippingAddress: req.body.shippingAddress,
            paymentMethod: req.body.paymentMethod,
            paymentStatus: req.body.paymentStatus,
            orderStatus: req.body.orderStatus
        });

        await order.save();
        res.status(201).json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Update order status (admin only)
router.put('/:id/status', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { orderStatus: req.body.status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// Get order statistics (admin only)
router.get('/statistics', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            { $match: { paymentStatus: 'Completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const ordersByStatus = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                ordersByStatus
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;