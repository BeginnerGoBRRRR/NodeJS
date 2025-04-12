const jwt = require('jsonwebtoken');
const User = require('../schemas/user');

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.header('Authorization');
        console.log('Auth header:', authHeader); // Debug log
        
        if (!authHeader) {
            return res.status(401).json({ success: false, message: 'No authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('Token:', token); // Debug log
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Decoded token:', decoded); // Debug log
        
        // Find user and attach to request
        const user = await User.findById(decoded.userId).populate('role');
        console.log('Found user:', user); // Debug log
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token format' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};