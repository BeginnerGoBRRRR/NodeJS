const express = require('express');
const router = express.Router();
const Comment = require('../schemas/comment');
const Product = require('../schemas/product');
const User = require('../schemas/user');
const { check_authentication } = require('../utils/check_auth');

// Get all comments (admin only)
router.get('/', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const comments = await Comment.find()
            .populate('user', 'username')
            .populate('product', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: comments
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching comments'
        });
    }
});

// Get comments by product ID
router.get('/product/:productId', async (req, res) => {
    try {
        const comments = await Comment.find({ 
            product: req.params.productId,
            status: 'approved'
        })
        .populate('user', 'username')
        .sort({ createdAt: -1 });
        
        res.json({ 
            success: true, 
            data: comments 
        });
    } catch (error) {
        console.error('Error fetching product comments:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching product comments'
        });
    }
});

// Create a new comment
router.post('/', check_authentication, async (req, res) => {
    try {
        const { productId, comment, rating } = req.body;
        
        if (!productId || !comment || !rating) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please provide productId, comment, and rating' 
            });
        }

        const newComment = new Comment({
            product: productId,
            user: req.user._id,
            comment,
            rating,
            status: 'pending'
        });

        await newComment.save();
        res.status(201).json({ 
            success: true, 
            data: newComment 
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating comment' 
        });
    }
});

// Update comment status and admin reply (admin only)
router.put('/:id', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const { status, adminReply } = req.body;
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        if (status) comment.status = status;
        if (adminReply !== undefined) comment.adminReply = adminReply;

        await comment.save();
        
        res.json({
            success: true,
            data: comment
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating comment'
        });
    }
});

// Delete comment (admin only)
router.delete('/:id', check_authentication, async (req, res) => {
    try {
        if (req.user.role.name !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        const comment = await Comment.findByIdAndDelete(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
        }

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting comment'
        });
    }
});

module.exports = router; 