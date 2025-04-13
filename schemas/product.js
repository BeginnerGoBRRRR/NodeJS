let mongoose = require('mongoose');

let productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    quantity: {
        type: Number,
        min: 0,
        required: true
    },
    price: {
        type: Number,
        min: 0,
        required: true
    },
    description: {
        type: String,
        required: true,
        default: "No description available"
    },
    imageUrl: {
        type: String,
        required: true,
        default: "https://via.placeholder.com/400"
    },
    category: {
        type: mongoose.Types.ObjectId,
        ref: 'category',
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    slug: String,
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        text: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    rating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('product', productSchema);
// Tao 1 schema cho obj category gồm name,description, timestamp