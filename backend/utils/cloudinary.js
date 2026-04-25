/**
 * Cloudinary configuration and Multer upload middleware.
 * Separate storage buckets for CVs and profile avatars.
 */

const cloudinary            = require('cloudinary').v2;
const multer                = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key   : process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* CV / resume bucket */
const cvStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder         : 'careerbridge/cvs',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type  : 'raw',
  },
});

/* Profile avatar bucket */
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder         : 'careerbridge/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation : [{ width: 400, height: 400, crop: 'fill' }],
  },
});

const cvUploader = multer({
  storage: cvStorage,
  limits : { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
});

const avatarUploader = multer({
  storage: avatarStorage,
  limits : { fileSize: 2 * 1024 * 1024 }, // 2 MB cap
});

const removeCloudinaryAsset = async (publicId, kind = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: kind });
  } catch (err) {
    console.error('Cloudinary removal error:', err.message);
  }
};

module.exports = { cloudinary, cvUploader, avatarUploader, removeCloudinaryAsset };
