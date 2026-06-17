const preview   = document.getElementById('project-preview')
const imgA      = document.getElementById('preview-img-a')
const imgB      = document.getElementById('preview-img-b')
const svg       = document.getElementById('callout-svg')
const lineTop     = document.getElementById('callout-line-top')
const lineBottom  = document.getElementById('callout-line-bottom')
const projectList = document.querySelector('.project-list')

// ── Center the preview box vertically on the hovered item ──
//    Height comes from the image's aspect ratio (set in fitPreviewToImage),
//    so we center the box on the item rather than matching its height.
function positionPreview(item) {
  const itemRect = item.getBoundingClientRect()
  const boxH     = preview.getBoundingClientRect().height
  preview.style.top = `${itemRect.top + itemRect.height / 2 - boxH / 2}px`
}

// ── Size the box to the image's natural aspect ratio (no cropping) ──
function fitPreviewToImage(src, item) {
  const probe = new Image()
  probe.onload = () => {
    const aspect = probe.naturalWidth / probe.naturalHeight
    const width  = preview.getBoundingClientRect().width
    preview.style.height = `${width / aspect}px`
    if (activeItem === item) {
      positionPreview(item)
      drawCallout(item)
    }
  }
  probe.src = src
}

// ── Callout lines: hovered item right edge → fixed box left edge ──
function drawCallout(item) {
  // Lines fan from the item's right-hand corners to the box's left-hand
  // corners. The box has no position/size transition, so its rect is always
  // accurate — including while scrolling, when the box stays put and only the
  // item moves.
  const itemRect = item.getBoundingClientRect()
  const boxRect  = preview.getBoundingClientRect()

  lineTop.setAttribute('x1', itemRect.right)
  lineTop.setAttribute('y1', itemRect.top)
  lineTop.setAttribute('x2', boxRect.left)
  lineTop.setAttribute('y2', boxRect.top)

  lineBottom.setAttribute('x1', itemRect.right)
  lineBottom.setAttribute('y1', itemRect.bottom)
  lineBottom.setAttribute('x2', boxRect.left)
  lineBottom.setAttribute('y2', boxRect.bottom)
}

// ── Redraw on scroll: the box stays fixed in place, only the lines re-track
//    the scrolling item. (No positionPreview here — that's what made the box
//    drift with the scroll.) ──
let activeItem = null
window.addEventListener('scroll', () => {
  if (activeItem) {
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
      preview.classList.add('visible')
      // Size to the image's aspect ratio, then center + draw. fitPreviewToImage
      // re-centers and redraws once the image's dimensions are known.
      fitPreviewToImage(src, item)
      positionPreview(item)

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
