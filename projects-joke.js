const JOKE_PROXY_URL = 'https://joke-proxy.vercel.app/api/joke'

function initSimplifyButtons() {
  document.querySelectorAll('.project-item[data-joke]').forEach((item) => {
    const desc = item.querySelector('.project-item__desc')
    const nameEl = item.querySelector('.project-item__name')
    const links = item.querySelector('.project-item__links')
    const originalDescription = desc.textContent.trim()
    const originalName = nameEl.textContent.trim()
    const hardcodedJoke = item.dataset.joke

    // Lock the description's natural height so swapping to shorter/longer
    // text (hardcoded or LLM joke) never resizes the card.
    desc.style.minHeight = `${desc.getBoundingClientRect().height}px`

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'project-item__simplify'
    button.textContent = 'Simplify'
    links.appendChild(button)

    let revealed = false // false = showing real description, true = showing a joke

    button.addEventListener('click', async () => {
      if (button.disabled) return

      if (!revealed) {
        revealed = true
        button.disabled = true
        await swapText(desc, hardcodedJoke, item)
        button.textContent = 'Even simpler →'
        button.disabled = false
        return
      }

      button.disabled = true
      const restoreLabel = button.textContent
      button.textContent = '...'

      try {
        const joke = await fetchJoke(originalName, originalDescription)
        await swapText(desc, joke, item)
        button.textContent = restoreLabel
      } catch {
        button.textContent = 'try again later'
        setTimeout(() => {
          button.textContent = restoreLabel
        }, 1500)
      } finally {
        button.disabled = false
      }
    })
  })
}

async function fetchJoke(name, description) {
  const res = await fetch(JOKE_PROXY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })

  if (!res.ok) {
    throw new Error(`Proxy responded ${res.status}`)
  }

  const data = await res.json()

  if (!data.joke) {
    throw new Error('Empty joke in response')
  }

  return data.joke
}

const TUMBLE_DURATION_MS = 1000
const FADE_DURATION_MS = 200

async function swapText(desc, newText, item) {
  await playFallingText(desc, newText)
  desc.textContent = newText
  desc.classList.remove('project-item__desc--hidden')
  window.dispatchEvent(new CustomEvent('project-item-resized', { detail: { item } }))
}

function playFallingText(desc, text) {
  return new Promise((resolve) => {
    const rect = desc.getBoundingClientRect()

    const stage = document.createElement('div')
    stage.className = 'project-item__joke-stage'
    stage.style.width = `${rect.width}px`
    stage.style.height = `${rect.height}px`

    desc.classList.add('project-item__desc--hidden')
    desc.insertAdjacentElement('beforebegin', stage)

    const stageWidth = rect.width
    const stageHeight = rect.height

    const engine = Matter.Engine.create()
    const world = engine.world

    const floor = Matter.Bodies.rectangle(stageWidth / 2, stageHeight + 10, stageWidth, 20, {
      isStatic: true,
    })
    const leftWall = Matter.Bodies.rectangle(-10, stageHeight / 2, 20, stageHeight * 2, {
      isStatic: true,
    })
    const rightWall = Matter.Bodies.rectangle(stageWidth + 10, stageHeight / 2, 20, stageHeight * 2, {
      isStatic: true,
    })
    Matter.World.add(world, [floor, leftWall, rightWall])

    const letters = []
    let x = 8

    for (const char of text) {
      const span = document.createElement('span')
      span.className = 'project-item__joke-letter'
      span.textContent = char
      stage.appendChild(span)

      const width = span.getBoundingClientRect().width || 6

      const body = Matter.Bodies.rectangle(x + width / 2, -Math.random() * 100 - 20, width, 14, {
        restitution: 0.4,
        friction: 0.3,
        angle: (Math.random() - 0.5) * 1.2,
      })
      Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 0 })
      Matter.World.add(world, body)

      letters.push({ span, body, halfWidth: width / 2 })
      x += width
    }

    let running = true

    function tick() {
      if (!running) return
      Matter.Engine.update(engine, 1000 / 60)
      for (const { span, body, halfWidth } of letters) {
        span.style.transform =
          `translate(${body.position.x - halfWidth}px, ${body.position.y}px) rotate(${body.angle}rad)`
      }
      requestAnimationFrame(tick)
    }
    tick()

    setTimeout(() => {
      running = false
      stage.classList.add('project-item__joke-stage--fade-out')
      setTimeout(() => {
        stage.remove()
        resolve()
      }, FADE_DURATION_MS)
    }, TUMBLE_DURATION_MS)
  })
}

initSimplifyButtons()
