/**
 * Backend for WolfProductions.Photos
 * ------------------------------------------------
 * @author: WolfProductions
 * @version: 1.0
 * @license: MIT
 */

/* Get the environment variables. */
const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')
const myEnv = dotenv.config()
dotenvExpand.expand(myEnv)

/* Get the mongoose library and initiate the connection. */
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
/* Attach the models to the mongoose library. */
const organisationSchema = require('./models/Organisation')
const Organisation = mongoose.model('Organisation', organisationSchema)
const albumSchema = require('./models/Album')
const Album = mongoose.model('Album', albumSchema)

/* Get the express module. */
const express = require('express')
const cors = require('cors')
const app = express()
const bodyParser = require('body-parser')

/* Enable CORS. */
app.use(
  cors({
    origin: ['https://wolfproductions.photos', 'http://localhost:3000']
  })
)

/* Enable body parsing. */
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

/**
 * The routes for the backend.
 */
app.get('/', async (req, res) => {
  const albums = await Album.find().populate({
    path: 'organisation',
    model: 'Organisation',
    strictPopulate: false
  })
  res.send(albums)
})

app.get('/api/organisations', async (req, res) => {
  const organisations = await Organisation.find()
  res.send(organisations)
})

app.get('/api/organisations/:organisation_id', async (req, res) => {
  const organisation_id = req.params.organisation_id
  const organisation = await Organisation.findById(organisation_id)

  res.send(organisation)
})

app.post('/api/organisations/:organisation_id/albums', async (req, res) => {
  const organisation_id = req.params.organisation_id
  const album = new Album({
    title: req.body.title,
    date: req.body.date,
    cover: req.body.cover,
    sections: req.body.sections,
    organisation: organisation_id
  })
  await album.save()
  res.send(album)
})

app.get('/api/organisations/:organisation_id/albums', async (req, res) => {
  const organisation_id = req.params.organisation_id
  const albums = await Album.find({ organisation: organisation_id })
  res.send(albums)
})

app.get('/api/album/:album_id', (req, res) => {
  const album_id = req.params.album_id
  Album.findById(album_id, (err, album) => {
    if (err) {
      res.send(err)
    } else {
      res.send(album)
    }
  })
})

app.put('/api/album/:album_id', async (req, res) => {
  const album = await Album.findById(req.body._id)
  album.title = req.body.title
  album.date = req.body.date
  album.cover = req.body.cover
  album.sections = req.body.sections
  album.organisation = req.body.organisation
  await album.save()
  res.send(album)
})

/* Start listening on the port. */
app.listen(3001)
