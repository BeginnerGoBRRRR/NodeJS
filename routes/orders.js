const express = require('express');
const router = express.Router();
const Order = require('../schemas/order');
const User = require('../schemas/user');
const Product = require('../schemas/product');
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
            .populate('user', 'username email')
            .sort({ createdAt: -1 });

        const transformedOrders = [];
        
        for (const order of orders) {
            const items = [];
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                items.push({
                    product: product ? {
                        name: product.name,
                        price: product.price,
                        imageUrl: product.imageUrl
                    } : {
                        name: 'Product Unavailable',
                        price: item.price || 0,
                        imageUrl: ''
                    },
                    quantity: item.quantity,
                    price: item.price
                });
            }

            transformedOrders.push({
                _id: order._id,
                user: order.user ? {
                    username: order.user.username,
                    email: order.user.email
                } : {
                    username: 'Unknown User',
                    email: 'No Email'
                },
                items: items,
                totalAmount: order.totalAmount,
                orderStatus: order.orderStatus,
                createdAt: order.createdAt,
                shippingAddress: order.shippingAddress,
                paymentStatus: order.paymentStatus
            });
        }

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
            .sort({ createdAt: -1 });

        const transformedOrders = [];
        
        for (const order of orders) {
            const items = [];
            for (const item of order.items) {
                const product = await Product.findById(item.product);
                items.push({
                    product: product ? {
                        name: product.name,
                        price: product.price,
                        imageUrl: product.imageUrl
                    } : {
                        name: 'Product Unavailable',
                        price: item.price || 0,
                        imageUrl: ''
                    },
                    quantity: item.quantity,
                    price: item.price
                });
            }

            transformedOrders.push({
                _id: order._id,
                items: items,
                totalAmount: order.totalAmount,
                orderStatus: order.orderStatus || 'Pending',
                createdAt: order.createdAt,
                shippingAddress: order.shippingAddress,
                paymentStatus: order.paymentStatus || 'Pending'
            });
        }
        
        res.json({ 
            success: true, 
            data: transformedOrders 
        });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching orders',
            error: error.message 
        });
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

        // Get all orders
        const orders = await Order.find()
            .select('totalAmount orderStatus')
            .lean();

        // Calculate totals
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        // Count orders by status
        const statusCounts = {
            'Pending': 0,
            'Processing': 0,
            'Completed': 0,
            'Cancelled': 0
        };

        orders.forEach(order => {
            if (order.orderStatus && statusCounts[order.orderStatus] !== undefined) {
                statusCounts[order.orderStatus]++;
            }
        });

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue,
                ordersByStatus: statusCounts
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

// Delete order (admin only)
router.delete('/:id', check_authentication, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        // Find the order first to check if it exists
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Delete the order
        await Order.findByIdAndDelete(req.params.id);

        res.json({ 
            success: true, 
            message: 'Order deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting order',
            error: error.message 
        });
    }
});

// Delete item from order (admin only)
router.delete('/:id/items/:itemIndex', check_authentication, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        // Find the order
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        const itemIndex = parseInt(req.params.itemIndex);
        if (itemIndex < 0 || itemIndex >= order.items.length) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid item index' 
            });
        }

        // Remove the item
        order.items.splice(itemIndex, 1);

        // Recalculate total amount
        order.totalAmount = order.items.reduce((total, item) => total + (item.price * item.quantity), 0);

        // If no items left, delete the order
        if (order.items.length === 0) {
            await Order.findByIdAndDelete(req.params.id);
            return res.json({ 
                success: true, 
                message: 'Order deleted as it has no items' 
            });
        }

        // Save the updated order
        await order.save();

        res.json({ 
            success: true, 
            message: 'Item deleted successfully',
            data: order 
        });
    } catch (error) {
        console.error('Error deleting item from order:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting item from order',
            error: error.message 
        });
    }
});

module.exports = router;