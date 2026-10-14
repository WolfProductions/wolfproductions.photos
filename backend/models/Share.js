const mongoose = require('mongoose')

const { ObjectId } = mongoose.Schema.Types

/**
 * A share link: whoever has the token sees a folder with everything below
 * it, or one album, even when it is private.
 */
const shareSchema = new mongoose.Schema(
  {
    /* The secret part of the link, /s/<token>. */
    token: { type: String, required: true, unique: true },
    /* For the admin only, e.g. 'Leden 2025'. */
    label: String,
    target: {
      kind: { type: String, enum: ['folder', 'album'], required: true },
      id: { type: ObjectId, required: true }
    },
    /* scrypt$<salt>$<hash>, or empty for a link without a password. */
    passwordHash: String,
    /* The link stops working after this moment. */
    expiresAt: Date,
    allowDownload: { type: Boolean, default: false }
  },
  { timestamps: true }
)

shareSchema.index({ 'target.id': 1 })

module.exports = shareSchema
