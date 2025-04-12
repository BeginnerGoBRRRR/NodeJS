const express = require('express');
const router = express.Router();
const Order = require('../schemas/order');
const User = require('../schemas/user');
const { check_authentication } = require('../utils/check_auth');

// Get all orders (admin only)
router.get('/', check_authentication, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const orders = await Order.find()
            .populate({
                path: 'user',
                select: 'username email'
            })
            .populate({
                path: 'items.product',
                select: 'name price'
            })
            .sort({ createdAt: -1 });

        // Transform the orders data to ensure consistent structure
        const transformedOrders = orders.map(order => ({
            _id: order._id,
            user: order.user ? {
                username: order.user.username,
                email: order.user.email
            } : null,
            items: order.items.map(item => ({
                product: item.product ? {
                    name: item.product.name,
                    price: item.product.price
                } : null,
                quantity: item.quantity,
                price: item.price
            })),
            totalAmount: order.totalAmount,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt
        }));

        res.json({
            success: true,
            data: transformedOrders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
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
        
        // Calculate total revenue from all orders
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
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
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching statistics',
            error: error.message 
        });
    }
});

module.exports = router;