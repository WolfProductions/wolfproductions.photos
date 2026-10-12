/**
 * Copy the organisations of another installation into this database, keeping
 * their ids so links to an organisation keep working. There is no endpoint
 * that creates organisations; they are otherwise inserted by hand.
 *
 * Usage: node scripts/import-organisations.js https://wolfproductions.photos/api/organisations
 */
const config = require('../config')
const mongoose = require('mongoose')
const { Organisation } = require('../models')
const variants = require('../variants')

async function main() {
  const url = process.argv[2]
  if (!url) throw new Error('Pass the URL of an /api/organisations endpoint')

  config.check()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  const organisations = await response.json()

  await mongoose.connect(config.MONGODB_URI)
  console.log(`Database: ${mongoose.connection.name}`)

  for (const { _id, title, logo, cover } of organisations) {
    await Organisation.replaceOne(
      { _id },
      { title, logo, cover },
      { upsert: true }
    )
    console.log(`Imported ${title}`)
  }

  /* Make the variants of the logos and covers. */
  await variants.syncAll()
  await variants.idle()
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
