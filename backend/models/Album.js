const mongoose = require('mongoose')

const albumSchema = new mongoose.Schema({
  title: String,
  date: Date,
  cover: String,
  sections: [{
    title: String,
    photos: Array
  }],
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation'
  }
})

module.exports = albumSchema
