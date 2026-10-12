/* Get the environment variables. Values that are already set win, so .env.local overrides .env. */
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const dotenvExpand = require('dotenv-expand')
dotenv.config({ path: path.join(__dirname, '.env.local') })
const myEnv = dotenv.config({ path: path.join(__dirname, '.env') })
dotenvExpand.expand(myEnv)

const resolve = (dir) => (dir ? path.resolve(dir) : '')

const config = {
  PORT: Number(process.env.PORT) || 3002,
  MONGODB_URI: process.env.MONGODB_URI,
  /* The originals (the mounted NAS share). Never written to. */
  PHOTOS_ROOT: resolve(process.env.PHOTOS_ROOT),
  /* The generated variants, served under /media. */
  VARIANTS_ROOT: resolve(process.env.VARIANTS_ROOT),
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || ''
}

/* Whether one directory is the other or lies inside it. */
function overlaps(a, b) {
  const inside = (parent, child) => {
    const relative = path.relative(parent, child)
    return !relative.startsWith('..') && !path.isAbsolute(relative)
  }
  return inside(a, b) || inside(b, a)
}

/**
 * Refuse to start on a configuration that would expose the admin routes or
 * the originals. PHOTOS_ROOT may be unreachable (NAS turned off), so only
 * its location is checked here.
 */
config.check = () => {
  const realpath = (dir) => {
    try {
      return fs.realpathSync(dir)
    } catch (err) {
      return dir
    }
  }

  if (!config.MONGODB_URI) throw new Error('MONGODB_URI is not set')
  if (config.ADMIN_TOKEN.length < 16)
    throw new Error('ADMIN_TOKEN must be set to at least 16 characters')
  if (!config.PHOTOS_ROOT) throw new Error('PHOTOS_ROOT is not set')
  if (!config.VARIANTS_ROOT) throw new Error('VARIANTS_ROOT is not set')

  try {
    fs.accessSync(config.VARIANTS_ROOT, fs.constants.W_OK)
  } catch (err) {
    throw new Error(
      `VARIANTS_ROOT (${config.VARIANTS_ROOT}) does not exist or is not writable`
    )
  }
  if (!fs.statSync(config.VARIANTS_ROOT).isDirectory())
    throw new Error(
      `VARIANTS_ROOT (${config.VARIANTS_ROOT}) is not a directory`
    )

  if (overlaps(realpath(config.PHOTOS_ROOT), realpath(config.VARIANTS_ROOT)))
    throw new Error('PHOTOS_ROOT and VARIANTS_ROOT must not contain each other')
}

module.exports = config
