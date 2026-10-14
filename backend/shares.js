/**
 * Share links. A visitor who opened /s/<token> sends the link along with
 * every request (X-Share-Token, comma separated when there are several).
 * For a link with a password that is not the bare token but an access
 * string, <token>.<signature>, which they get by entering the password; it
 * stops working when the password changes.
 */
const crypto = require('crypto')
const { promisify } = require('util')
const config = require('./config')
const { Share } = require('./models')

const scrypt = promisify(crypto.scrypt)
const MAX_LINKS = 10

/* 22 random characters, safe in a URL. */
const newToken = () => crypto.randomBytes(16).toString('base64url')

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = await scrypt(String(password), salt, 32)
  return `scrypt$${salt}$${hash.toString('base64url')}`
}

async function checkPassword(password, stored) {
  const [, salt, expected] = (stored || '').split('$')
  if (!salt || !expected) return false
  const hash = await scrypt(String(password), salt, 32)
  return crypto.timingSafeEqual(hash, Buffer.from(expected, 'base64url'))
}

/* The signature proves the password was entered; it is tied to the current password. */
function signature(share) {
  const key = crypto
    .createHash('sha256')
    .update(`share-access:${config.ADMIN_TOKEN}`)
    .digest()
  return crypto
    .createHmac('sha256', key)
    .update(`${share.token}:${share.passwordHash}`)
    .digest('base64url')
}

/* What the visitor sends to use a link: the token, plus the signature for a link with a password. */
function accessFor(share) {
  return share.passwordHash ? `${share.token}.${signature(share)}` : share.token
}

const isExpired = (share) =>
  share.expiresAt && new Date(share.expiresAt) <= new Date()

/* The links a request carries that are valid right now. */
async function sharesOf(req) {
  const header = req.get('x-share-token') || ''
  const accesses = header
    .split(',')
    .map((access) => access.trim())
    .filter(Boolean)
    .slice(0, MAX_LINKS)
  if (!accesses.length) return []

  const byToken = new Map(
    accesses.map((access) => [access.split('.')[0], access])
  )
  const shares = await Share.find({
    token: { $in: [...byToken.keys()] }
  }).lean()

  return shares.filter((share) => {
    if (isExpired(share)) return false
    if (!share.passwordHash) return true
    const given = Buffer.from(byToken.get(share.token).split('.')[1] || '')
    const expected = Buffer.from(signature(share))
    return (
      given.length == expected.length && crypto.timingSafeEqual(given, expected)
    )
  })
}

/* Whether a link gives access to a folder or album: it points at it, or at a folder above it. */
function covers(share, node) {
  const target = String(share.target.id)
  if (String(node._id) == target) return true
  return (
    share.target.kind == 'folder' &&
    (node.ancestors || []).some((id) => String(id) == target)
  )
}

/* Wrong passwords per link, to slow down guessing. */
const failures = new Map()
const FAILURE_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 10

function tooManyFailures(token) {
  const entry = failures.get(token)
  if (!entry || Date.now() - entry.since > FAILURE_WINDOW_MS) return false
  return entry.count >= MAX_FAILURES
}

function recordFailure(token) {
  const entry = failures.get(token)
  if (!entry || Date.now() - entry.since > FAILURE_WINDOW_MS)
    failures.set(token, { since: Date.now(), count: 1 })
  else entry.count++
}

module.exports = {
  newToken,
  hashPassword,
  checkPassword,
  accessFor,
  isExpired,
  sharesOf,
  covers,
  tooManyFailures,
  recordFailure
}
