const preview   = document.getElementById('project-preview')
const imgA      = document.getElementById('preview-img-a')
const imgB      = document.getElementById('preview-img-b')
const svg       = document.getElementById('callout-svg')
const lineTop     = document.getElementById('callout-line-top')
const lineBottom  = document.getElementById('callout-line-bottom')
const projectList = document.querySelector('.project-list')

// ── Resize + reposition preview box to match the hovered item ──
function positionPreview(item) {
  const itemRect = item.getBoundingClientRect()
  preview.style.top    = `${itemRect.top}px`
  preview.style.height = `${itemRect.height}px`
}

// ── Callout lines: hovered item right edge → fixed box left edge ──
function drawCallout(item) {
  const itemRect    = item.getBoundingClientRect()
  const previewRect = preview.getBoundingClientRect()

  lineTop.setAttribute('x1', itemRect.right)
  lineTop.setAttribute('y1', itemRect.top)
  lineTop.setAttribute('x2', previewRect.left)
  lineTop.setAttribute('y2', previewRect.top)

  lineBottom.setAttribute('x1', itemRect.right)
  lineBottom.setAttribute('y1', itemRect.bottom)
  lineBottom.setAttribute('x2', previewRect.left)
  lineBottom.setAttribute('y2', previewRect.bottom)
}

// ── Redraw on scroll (item moves, box stays fixed) ──
let activeItem = null
window.addEventListener('scroll', () => {
  if (activeItem) {
    positionPreview(activeItem)
    drawCallout(activeItem)
  }
}, { passive: true })

// ── Re-fit preview when joke-text swap changes a card's height ──
window.addEventListener('project-item-resized', (e) => {
  if (activeItem && activeItem === e.detail.item) {
    positionPreview(activeItem)
    drawCallout(activeItem)
  }
})

// ── Hover interactions ──
document.querySelectorAll('.project-item').forEach((item) => {
  item.addEventListener('mouseenter', () => {
    projectList.classList.add('has-hover')
    item.classList.add('hovered')

    if (item.dataset.image) {
      const src = item.dataset.image
      const activeImg  = preview.querySelector('.active')
      const inactiveImg = activeImg === imgA ? imgB : imgA

      if (activeImg.getAttribute('src') !== src) {
        // Load new image into inactive layer, crossfade
        inactiveImg.src = src
        inactiveImg.classList.add('active')
        activeImg.classList.remove('active')
      }

      activeItem = item
      positionPreview(item)
      preview.classList.add('visible')

      requestAnimationFrame(() => {
        drawCallout(item)
        svg.classList.add('visible')
      })
    }
  })

  item.addEventListener('mouseleave', () => {
    activeItem = null
    projectList.classList.remove('has-hover')
    item.classList.remove('hovered')
    preview.classList.remove('visible')
    svg.classList.remove('visible')
  })
})
