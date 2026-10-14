const mongoose = require('mongoose')

/* One record per photo that a folder, album or organisation refers to. */
const photoSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  /* Random and unguessable: the name of the variants and the id visitors get instead of the key. */
  publicId: { type: String, unique: true, sparse: true },
  status: { type: String, default: 'pending' },
  /* The dimensions of the large variant. */
  width: Number,
  height: Number,
  /* The original the variants were made from, to notice a replaced file. */
  sourceMtimeMs: Number,
  sourceSize: Number,
  error: String
})

module.exports = photoSchema
