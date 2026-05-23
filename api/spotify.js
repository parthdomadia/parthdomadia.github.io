const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing'
const RECENTLY_PLAYED_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return res.status(500).json({ error: 'Missing Spotify env vars' })
  }

  try {
    // Exchange refresh token for access token
    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: SPOTIFY_REFRESH_TOKEN,
      }),
    })

    const { access_token } = await tokenRes.json()

    // Fetch currently playing track
    const nowPlayingRes = await fetch(NOW_PLAYING_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    // 204 = nothing currently playing, fall back to recently played
    if (nowPlayingRes.status === 204 || !nowPlayingRes.ok) {
      const recentRes = await fetch(RECENTLY_PLAYED_URL, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      const recentData = await recentRes.json()
      const track = recentData?.items?.[0]?.track

      if (!track) return res.json({ isPlaying: false })

      return res.json({
        isPlaying: false,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        albumArt: track.album.images[0]?.url ?? null,
        songUrl: track.external_urls.spotify,
      })
    }

    const data = await nowPlayingRes.json()

    if (!data?.item) {
      return res.json({ isPlaying: false })
    }

    return res.json({
      isPlaying: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(', '),
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url ?? null,
      songUrl: data.item.external_urls.spotify,
    })
  } catch (err) {
    return res.status(500).json({ isPlaying: false, error: err.message })
  }
}
