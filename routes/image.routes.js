const express = require('express');
const mongoose = require('mongoose');
const ImageAsset = require('../models/ImageAsset');

const router = express.Router();

// Public image delivery endpoint for products stored in MongoDB.
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const image = await ImageAsset.findById(id).lean();
    if (!image?.data) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.set('Content-Type', image.contentType || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(image.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
