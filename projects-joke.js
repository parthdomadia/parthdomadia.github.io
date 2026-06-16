const JOKE_PROXY_URL = 'https://parth-joke-proxy.vercel.app/api/joke'

function initSimplifyButtons() {
  document.querySelectorAll('.project-item[data-joke]').forEach((item) => {
    const desc = item.querySelector('.project-item__desc')
    const nameEl = item.querySelector('.project-item__name')
    const originalDescription = desc.textContent.trim()
    const originalName = nameEl.textContent.trim()
    const hardcodedJoke = item.dataset.joke

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'project-item__simplify'
    button.textContent = 'Simplify'
    desc.insertAdjacentElement('afterend', button)

    let revealed = false // false = showing real description, true = showing a joke

    button.addEventListener('click', async () => {
      if (button.disabled) return

      if (!revealed) {
        revealed = true
        await swapText(desc, hardcodedJoke)
        button.textContent = 'Even simpler →'
        return
      }

      button.disabled = true
      const restoreLabel = button.textContent
      button.textContent = '...'

      try {
        const joke = await fetchJoke(originalName, originalDescription)
        await swapText(desc, joke)
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

async function swapText(desc, newText) {
  desc.textContent = newText
}

initSimplifyButtons()
