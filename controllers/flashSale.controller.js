const FlashSale = require('../models/FlashSale');
const Product = require('../models/Product');

// Get the current active flash sale
exports.getActiveFlashSale = async (req, res) => {
    try {
        const now = new Date();

        // Find active sale within current time range
        const flashSale = await FlashSale.findOne({
            isActive: true,
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).populate('products.product'); // Populate product details

        if (!flashSale) {
            return res.status(200).json({ success: true, flashSale: null });
        }

        // Filter out products that might have been deleted but are still in the flash sale list
        flashSale.products = flashSale.products.filter(p => p.product !== null);

        res.status(200).json({
            success: true,
            flashSale
        });
    } catch (error) {
        console.error('Error fetching active flash sale:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Create a new flash sale (Admin)
exports.createFlashSale = async (req, res) => {
    try {
        const { name, startTime, endTime, products, backgroundColor } = req.body;

        // Detailed validation
        if (!name) return res.status(400).json({ success: false, message: 'Campaign name is required' });
        if (!startTime) return res.status(400).json({ success: false, message: 'Start time is required' });
        if (!endTime) return res.status(400).json({ success: false, message: 'End time is required' });
        if (!products || products.length === 0) return res.status(400).json({ success: false, message: 'At least one product must be added' });

        // Ensure dates are valid and logic is sound
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return res.status(400).json({ success: false, message: 'End time must be after start time' });
        }

        const flashSale = await FlashSale.create({
            name,
            startTime: start,
            endTime: end,
            products,
            backgroundColor: backgroundColor || 'bg-white',
            isActive: true
        });

        res.status(201).json({
            success: true,
            flashSale
        });
    } catch (error) {
        console.error('ðŸ”¥ Flash Sale Create Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create flash sale'
        });
    }
};

// Update flash sale (Admin)
exports.updateFlashSale = async (req, res) => {
    try {
        const flashSale = await FlashSale.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Flash sale not found'
            });
        }

        res.status(200).json({
            success: true,
            flashSale
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Server Error'
        });
    }
};

// Delete flash sale (Admin)
exports.deleteFlashSale = async (req, res) => {
    try {
        const flashSale = await FlashSale.findByIdAndDelete(req.params.id);

        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Flash sale not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Flash sale deleted'
        });
    } catch {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// Get all flash sales (Admin)
exports.getAllFlashSales = async (req, res) => {
    try {
        const now = new Date();
        await FlashSale.updateMany(
            { isActive: true, endTime: { $lt: now } },
            { $set: { isActive: false } }
        );

        const flashSales = await FlashSale.find()
            .populate('products.product', 'name price images')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: flashSales.length,
            flashSales
        });
    } catch {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
