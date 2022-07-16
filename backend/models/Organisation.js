const mongoose = require('mongoose')

const organisationSchema = new mongoose.Schema({
  title: String,
  logo: String,
  cover: String
})

module.exports = organisationSchema
