/**
 * Community post model — supports photos, videos, text.
 * Tracks likes and comments inline.
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author  : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text    : { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author      : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caption     : { type: String, maxlength: 1000 },
    mediaUrl    : { type: String },           // Cloudinary URL
    mediaPublicId: { type: String },
    mediaType   : { type: String, enum: ['image', 'video', 'none'], default: 'none' },
    likes       : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments    : [commentSchema],
    shares      : { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
