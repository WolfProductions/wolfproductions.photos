const mongoose = require('mongoose')

/* Attach the models to the mongoose library. */
module.exports = {
  Organisation: mongoose.model('Organisation', require('./Organisation')),
  Album: mongoose.model('Album', require('./Album')),
  Photo: mongoose.model('Photo', require('./Photo'))
}
