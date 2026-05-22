/**
 * Run this once to get your Spotify refresh token.
 *
 * Usage:
 *   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/get-spotify-token.js
 *
 * Then copy the printed refresh token into your Vercel env vars.
 */

const http = require('http')
const { exec } = require('child_process')

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET before running.')
  process.exit(1)
}

const REDIRECT_URI = 'http://localhost:8888/callback'
const SCOPE = 'user-read-currently-playing user-read-playback-state'

const authUrl =
  `https://accounts.spotify.com/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&response_type=code` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPE)}`

// Open browser (works on Windows, Mac, Linux)
const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
exec(`${open} "${authUrl}"`)

console.log('\nOpening Spotify login in your browser...')
console.log('If it does not open automatically, visit:\n')
console.log(authUrl)
console.log('\nWaiting for callback...\n')

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8888')
  if (url.pathname !== '/callback') return

  const code = url.searchParams.get('code')
  if (!code) {
    res.end('No code in URL.')
    server.close()
    return
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  const data = await tokenRes.json()

  if (!data.refresh_token) {
    console.error('Failed to get refresh token:', data)
    res.end('Something went wrong. Check your terminal.')
    server.close()
    return
  }

  console.log('─────────────────────────────────────────')
  console.log('SPOTIFY_REFRESH_TOKEN =', data.refresh_token)
  console.log('─────────────────────────────────────────')
  console.log('\nAdd this to your Vercel environment variables.')

  res.end('<h2>Done! Check your terminal for the refresh token. You can close this tab.</h2>')
  server.close()
})

server.listen(8888)
