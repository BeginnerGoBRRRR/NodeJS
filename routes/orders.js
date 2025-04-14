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
            .populate('items.product', 'name price imageUrl')
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

// Get order statistics (admin only)
router.get('/statistics', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        const ordersByStatus = await Order.aggregate([
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusCounts = {};
        ordersByStatus.forEach(status => {
            statusCounts[status._id] = status.count;
        });

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                ordersByStatus: statusCounts
            }
        });
    } catch (error) {
        console.error('Error fetching order statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order statistics'
        });
    }
});

// Get order by ID
router.get('/:id', check_authentication, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'username email')
            .populate('items.product', 'name price imageUrl');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is admin or the order owner
        if (req.user.role.name !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order'
        });
    }
});

// Create new order
router.post('/', check_authentication, async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethod } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item'
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: 'Shipping address is required'
            });
        }

        // Calculate total amount and validate product quantities
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Product ${item.product} not found`
                });
            }

            if (product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient quantity for product ${product.name}`
                });
            }

            // Update product quantity
            product.quantity -= item.quantity;
            await product.save();

            // Add to order items
            orderItems.push({
                product: item.product,
                quantity: item.quantity,
                price: product.price
            });

            totalAmount += product.price * item.quantity;
        }

        // Create the order
        const order = new Order({
            user: req.user._id,
            items: orderItems,
            totalAmount,
            shippingAddress,
            paymentMethod: paymentMethod || 'Cash on Delivery',
            paymentStatus: 'Pending',
            orderStatus: 'Pending'
        });

        await order.save();

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order'
        });
    }
});

// Update order status (admin only)
router.put('/:id/status', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { orderStatus, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (orderStatus) {
            order.orderStatus = orderStatus;
        }
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status'
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

// Delete item from order
router.delete('/:id/items/:itemId', check_authentication, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Find the item index
        const itemIndex = order.items.findIndex(item => item._id.toString() === req.params.itemId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in order'
            });
        }

        // Remove the item
        order.items.splice(itemIndex, 1);

        // Recalculate total amount
        order.totalAmount = order.items.reduce((total, item) => total + (item.price * item.quantity), 0);

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
            message: 'Error deleting item from order'
        });
    }
});

module.exports = router;