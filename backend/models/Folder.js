const mongoose = require('mongoose')

const { ObjectId } = mongoose.Schema.Types

/* A folder: holds subfolders, albums and, optionally, loose photos. */
const folderSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    /* null for a folder at the top level. */
    parent: { type: ObjectId, ref: 'Folder', default: null },
    /* Every folder above this one, from the top level down to the parent. */
    ancestors: [{ type: ObjectId, ref: 'Folder' }],
    /* Keys, like the image fields of an album. A folder without a cover shows the cover of its newest album. */
    cover: String,
    /* Inherited by subfolders and albums that have no logo of their own. */
    logo: String,
    /* Loose photos, shown below the subfolders and albums. Usually empty. */
    photos: [String],
    order: Number,
    sort: {
      type: String,
      enum: ['manual', 'date-desc', 'title'],
      default: 'date-desc'
    },
    /* 'inherit' takes the setting of the nearest folder above; at the top level it means private. */
    visibility: {
      type: String,
      enum: ['inherit', 'private', 'public'],
      default: 'inherit'
    }
  },
  { timestamps: true }
)

folderSchema.index({ parent: 1 })
folderSchema.index({ ancestors: 1 })

module.exports = folderSchema
