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

// ── Spotify now-playing ──
// After deploying to Vercel, replace null with your function URL, e.g.:
// 'https://your-project.vercel.app/api/spotify'
const SPOTIFY_ENDPOINT = 'https://www.parthdomadia.xyz/api/spotify'

async function fetchSpotify() {
  const el = document.getElementById('status-spotify')
  if (!SPOTIFY_ENDPOINT) return

  try {
    const res  = await fetch(SPOTIFY_ENDPOINT)
    const data = await res.json()

    if (data.title) {
      const label = data.isPlaying ? '' : 'LAST PLAYED: '
      el.textContent = `${label}${data.title.toUpperCase()} — ${(data.artist || '').toUpperCase()}`
      el.href = data.songUrl || '#'
    } else {
      el.textContent = 'NOT PLAYING'
      el.href = '#'
    }
  } catch {
    el.textContent = 'NOT PLAYING'
    el.href = '#'
  }
}

fetchSpotify()
setInterval(fetchSpotify, 30_000)

// ── ASCII Art Portrait ──
const ASCII_RAMP = ' .:,;+*?%S#@'
const ASCII_COLS = 95
const ASCII_ROWS = 55

function initAsciiArt() {
  const pre = document.getElementById('ascii-art')
  if (!pre) return

  const canvas = document.createElement('canvas')
  canvas.width  = ASCII_COLS
  canvas.height = ASCII_ROWS
  const ctx = canvas.getContext('2d')

  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, 0, 0, ASCII_COLS, ASCII_ROWS)
    const { data } = ctx.getImageData(0, 0, ASCII_COLS, ASCII_ROWS)

    // Build 2D grid of { baseTier, offset }
    const grid = []
    for (let y = 0; y < ASCII_ROWS; y++) {
      grid[y] = []
      for (let x = 0; x < ASCII_COLS; x++) {
        const i = (y * ASCII_COLS + x) * 4
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        const baseTier = Math.round((brightness / 255) * (ASCII_RAMP.length - 1))
        grid[y][x] = { baseTier, offset: 0 }
      }
    }

    // Render grid to pre.textContent
    function render() {
      let str = ''
      for (let y = 0; y < ASCII_ROWS; y++) {
        for (let x = 0; x < ASCII_COLS; x++) {
          const { baseTier, offset } = grid[y][x]
          const tier = Math.max(0, Math.min(ASCII_RAMP.length - 1, baseTier + offset))
          str += ASCII_RAMP[tier]
        }
        str += '\n'
      }
      pre.textContent = str
    }

    render()

    // Collect mid-tone cells eligible for drift (tiers 2–9)
    const animatable = []
    for (let y = 0; y < ASCII_ROWS; y++) {
      for (let x = 0; x < ASCII_COLS; x++) {
        const t = grid[y][x].baseTier
        if (t >= 2 && t <= 9) animatable.push(grid[y][x])
      }
    }

    setInterval(() => {
      if (!animatable.length) return
      if (document.visibilityState !== 'visible') return
      // Drift 8 random mid-tone cells by ±1 tier
      for (let i = 0; i < 8; i++) {
        const cell = animatable[Math.floor(Math.random() * animatable.length)]
        cell.offset = Math.random() < 0.5 ? 1 : -1
      }
      // Reset one random cell with 30% probability
      if (Math.random() < 0.3) {
        const cell = animatable[Math.floor(Math.random() * animatable.length)]
        cell.offset = 0
      }
      render()
    }, 150)
  }

  // ── Reveal lens ──
  const wrapper = pre.closest('.ascii-wrapper')
  const reveal  = document.getElementById('ascii-reveal')

  if (wrapper && reveal) {
    let rect = reveal.getBoundingClientRect()
    window.addEventListener('resize', () => { rect = reveal.getBoundingClientRect() })
    window.addEventListener('scroll', () => { rect = reveal.getBoundingClientRect() }, { passive: true })

    wrapper.addEventListener('mousemove', (e) => {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      reveal.style.transition = 'none'
      reveal.style.clipPath = `circle(80px at ${x}px ${y}px)`
    })

    wrapper.addEventListener('mouseleave', () => {
      reveal.style.transition = 'clip-path 0.3s ease'
      reveal.style.clipPath = 'circle(0px at 50% 50%)'
    })
  }

  img.onerror = () => {
    console.warn('initAsciiArt: failed to load assets/parth.jpg')
  }
  img.src = 'assets/parth.jpg'
}

initAsciiArt()
