// ── Live clock ──
function updateClock() {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  document.getElementById('status-time').textContent = time
}
setInterval(updateClock, 1000)
updateClock()

// ── Weather condition label from Open-Meteo WMO code ──
function weatherLabel(code) {
  if (code === 0)              return 'CLEAR SKY'
  if (code <= 3)               return 'PARTLY CLOUDY'
  if (code <= 48)              return 'FOGGY'
  if (code <= 55)              return 'DRIZZLE'
  if (code <= 65)              return 'RAIN'
  if (code <= 75)              return 'SNOW'
  if (code <= 82)              return 'SHOWERS'
  if (code <= 99)              return 'THUNDERSTORM'
  return 'UNKNOWN'
}

// ── IP geolocation → weather ──
async function fetchLocationAndWeather() {
  const locationEl = document.getElementById('status-location')
  const weatherEl  = document.getElementById('status-weather')

  try {
    const geoRes = await fetch('https://ipapi.co/json/')
    const geo    = await geoRes.json()

    const city    = (geo.city    || geo.region       || 'UNKNOWN').toUpperCase()
    const country = (geo.country_name || '').toUpperCase()
    locationEl.textContent = `${city}, ${country}`

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${geo.latitude}&longitude=${geo.longitude}` +
      `&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
    )
    const wx   = await weatherRes.json()
    const temp = Math.round(wx.current.temperature_2m)
    const cond = weatherLabel(wx.current.weather_code)
    weatherEl.textContent = `${temp}°F • ${cond}`
  } catch {
    locationEl.textContent = 'BASED IN THE US'
    weatherEl.textContent  = '—'
  }
}

fetchLocationAndWeather()

// ── Spotify now-playing (requires serverless proxy — placeholder) ──
// To enable: deploy a serverless function that exchanges your Spotify
// refresh token for an access token and returns the currently playing track.
// Point SPOTIFY_ENDPOINT below to that function's URL.
const SPOTIFY_ENDPOINT = null

async function fetchSpotify() {
  const el = document.getElementById('status-spotify')
  if (!SPOTIFY_ENDPOINT) return

  try {
    const res  = await fetch(SPOTIFY_ENDPOINT)
    const data = await res.json()
    if (data.isPlaying && data.title) {
      el.textContent = `${data.title.toUpperCase()} — ${(data.artist || '').toUpperCase()}`
    } else {
      el.textContent = 'NOT PLAYING'
    }
  } catch {
    el.textContent = 'NOT PLAYING'
  }
}

fetchSpotify()
setInterval(fetchSpotify, 30_000)
