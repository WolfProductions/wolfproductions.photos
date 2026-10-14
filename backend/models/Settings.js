const mongoose = require('mongoose')

const { ObjectId } = mongoose.Schema.Types

/* The settings of the site; there is one document. */
const settingsSchema = new mongoose.Schema(
  {
    /* What a visitor sees on /: the public folders, or the portfolio. */
    homepage: {
      type: String,
      enum: ['folders', 'portfolio'],
      default: 'folders'
    },
    portfolio: {
      title: String,
      intro: String,
      /* Keys, like the image fields of a folder. */
      hero: String,
      photos: [String],
      /* Public folders and albums shown as cards, in this order. */
      featured: [
        {
          _id: false,
          kind: { type: String, enum: ['folder', 'album'] },
          id: ObjectId
        }
      ]
    }
  },
  { timestamps: true }
)

module.exports = settingsSchema
