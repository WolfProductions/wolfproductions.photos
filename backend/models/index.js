const mongoose = require('mongoose')

/* Attach the models to the mongoose library. */
module.exports = {
  Organisation: mongoose.model('Organisation', require('./Organisation')),
  Folder: mongoose.model('Folder', require('./Folder')),
  Album: mongoose.model('Album', require('./Album')),
  Photo: mongoose.model('Photo', require('./Photo')),
  Share: mongoose.model('Share', require('./Share')),
  Settings: mongoose.model('Settings', require('./Settings'))
}
