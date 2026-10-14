const mongoose = require('mongoose')

const { ObjectId } = mongoose.Schema.Types

const albumSchema = new mongoose.Schema({
  title: String,
  date: Date,
  cover: String,
  sections: [{
    title: String,
    photos: Array
  }],
  /* The folder the album is in, and every folder above it from the top level down. */
  folder: { type: ObjectId, ref: 'Folder' },
  ancestors: [{ type: ObjectId, ref: 'Folder' }],
  order: Number,
  /* 'inherit' takes the setting of the folder the album is in. */
  visibility: {
    type: String,
    enum: ['inherit', 'private', 'public'],
    default: 'inherit'
  },
  /* From before folders: the id of the top-level folder it was migrated into. Removed once nothing reads it. */
  organisation: {
    type: ObjectId,
    ref: 'Organisation'
  }
})

albumSchema.index({ folder: 1 })
albumSchema.index({ ancestors: 1 })

module.exports = albumSchema
