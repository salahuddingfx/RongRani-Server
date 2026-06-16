const cloudinary = require('cloudinary').v2;

// Get Cloudinary configuration from environment
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  apiKey: process.env.CLOUDINARY_API_KEY || null,
  apiSecret: process.env.CLOUDINARY_API_SECRET || null,
};

// Check if Cloudinary is fully configured
const isCloudinaryConfigured = !!(
  cloudinaryConfig.cloudName &&
  cloudinaryConfig.apiKey &&
  cloudinaryConfig.apiSecret
);

if (!isCloudinaryConfigured) {
  console.log('⚠️  Cloudinary not configured - image uploads will be skipped');
  console.log('   To enable: Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
} else {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
  });
}

const uploadToCloudinary = (file, folder = 'rongrani') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary not configured, return placeholder
    if (!isCloudinaryConfigured) {
      console.log('⚠️  Cloudinary not configured, using placeholder image');
      resolve({
        url: 'https://via.placeholder.com/400x400?text=Image+Upload+Disabled',
        publicId: 'placeholder-' + Date.now(),
        isPlaceholder: true
      });
      return;
    }

    cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto',
    }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    });
  });
};

const uploadStreamToCloudinary = (buffer, folder = 'rongrani') => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      resolve({
        url: 'https://via.placeholder.com/400x400?text=Image+Upload+Disabled',
        publicId: 'placeholder-' + Date.now(),
        isPlaceholder: true
      });
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );
    stream.end(buffer);
  });
};

const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    // Skip if Cloudinary not configured or placeholder
    if (!isCloudinaryConfigured || publicId.startsWith('placeholder-')) {
      resolve({ result: 'skipped' });
      return;
    }

    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadStreamToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured,
};