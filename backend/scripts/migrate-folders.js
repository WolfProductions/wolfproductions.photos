/**
 * Move from organisations to folders. Every organisation becomes a private
 * folder at the top level with the same id, so links to it keep working, and
 * every album goes into the folder of its organisation. Albums without one go
 * into a private folder 'Ongesorteerd'. Nothing is deleted: the organisations
 * and the organisation field of the albums stay until the clean-up.
 *
 * Without --apply it only prints what it would do. It can be run again; what
 * was already migrated is left alone.
 *
 * Usage: node scripts/migrate-folders.js [--apply]
 */
const config = require('../config')
const mongoose = require('mongoose')
const { Organisation, Folder, Album } = require('../models')

const UNSORTED = 'Ongesorteerd'

async function main() {
  const apply = process.argv.includes('--apply')
  if (!config.MONGODB_URI) throw new Error('MONGODB_URI is not set')

  await mongoose.connect(config.MONGODB_URI)
  console.log(`Database: ${mongoose.connection.name}`)
  console.log(
    apply
      ? 'Applying the migration.\n'
      : 'Dry run: nothing is written. Pass --apply to migrate.\n'
  )

  const organisations = await Organisation.find().lean()
  const existing = new Set(
    (await Folder.find().select('_id').lean()).map((folder) =>
      String(folder._id)
    )
  )

  /* 1. Organisations become top-level folders with the same id. */
  let created = 0
  for (const organisation of organisations) {
    if (existing.has(String(organisation._id))) {
      console.log(`Folder exists:  ${organisation.title}`)
      continue
    }
    console.log(`Create folder:  ${organisation.title} (private)`)
    created++
    if (apply)
      await Folder.create({
        _id: organisation._id,
        title: organisation.title,
        cover: organisation.cover || '',
        logo: organisation.logo || '',
        photos: [],
        parent: null,
        ancestors: [],
        visibility: 'private'
      })
    existing.add(String(organisation._id))
  }

  /* 2. Albums go into the folder of their organisation. */
  const albums = await Album.find({ folder: { $exists: false } })
    .select('title organisation')
    .lean()
  const homeless = albums.filter(
    (album) => !album.organisation || !existing.has(String(album.organisation))
  )

  let unsorted = null
  if (homeless.length) {
    unsorted = await Folder.findOne({ title: UNSORTED, parent: null }).lean()
    if (!unsorted) {
      console.log(
        `Create folder:  ${UNSORTED} (private), for ${homeless.length} album(s) without an organisation`
      )
      unsorted = { _id: new mongoose.Types.ObjectId() }
      created++
      if (apply)
        await Folder.create({
          _id: unsorted._id,
          title: UNSORTED,
          photos: [],
          parent: null,
          ancestors: [],
          visibility: 'private'
        })
    }
  }

  const updates = albums.map((album) => {
    const folder = homeless.includes(album) ? unsorted._id : album.organisation
    return {
      updateOne: {
        filter: { _id: album._id, folder: { $exists: false } },
        update: {
          $set: { folder, ancestors: [folder], visibility: 'inherit' }
        }
      }
    }
  })
  console.log(
    `Move albums:    ${albums.length} album(s) into their folder, ${homeless.length} of them into ${UNSORTED}`
  )
  if (apply && updates.length) await Album.bulkWrite(updates)

  /* 3. Check: every album is in a folder that exists, and the counts per organisation match. */
  if (apply) {
    const folders = new Set(
      (await Folder.find().select('_id').lean()).map((folder) =>
        String(folder._id)
      )
    )
    const all = await Album.find().select('title folder organisation').lean()
    const lost = all.filter(
      (album) => !album.folder || !folders.has(String(album.folder))
    )
    const mismatched = all.filter(
      (album) =>
        album.organisation &&
        existing.has(String(album.organisation)) &&
        String(album.folder) != String(album.organisation)
    )

    console.log(
      `\nCheck: ${all.length} album(s), ${lost.length} without a folder, ${mismatched.length} in another folder than their organisation`
    )
    for (const album of [...lost, ...mismatched])
      console.log(`  ${album.title} (${album._id})`)
    if (lost.length || mismatched.length) process.exitCode = 1
  } else {
    console.log(
      `\nWould create ${created} folder(s) and move ${albums.length} album(s).`
    )
  }

  console.log(
    '\nAfter the migration every folder and album is private until you make it public.'
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
