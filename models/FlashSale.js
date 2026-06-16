const mongoose = require('mongoose');

const flashSaleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        discountPrice: {
            type: Number,
            required: true
        },
        totalQuantity: {
            type: Number,
            required: true
        },
        soldQuantity: {
            type: Number,
            default: 0
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    backgroundColor: {
        type: String,
        default: 'bg-white' // Assuming tailwind class or hex code
    }
}, {
    timestamps: true
});

// Ensure end time is after start time
flashSaleSchema.pre('validate', function (next) {
    if (this.startTime >= this.endTime) {
        next(new Error('End time must be after start time'));
    } else {
        next();
    }
});

module.exports = mongoose.model('FlashSale', flashSaleSchema);
