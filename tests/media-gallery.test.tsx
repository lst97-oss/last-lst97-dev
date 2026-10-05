import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ImageGallery, MediaTrigger } from '../src/components/site/share/media/image-gallery'
import { coverSrcSet, type MediaViewerItem, toMediaItem } from '../src/components/site/share/media/media-item'
import { MediaViewer } from '../src/components/site/share/media/media-viewer'
import type { CoverImage } from '../src/server/content/types'

function item(overrides: Partial<MediaViewerItem> = {}): MediaViewerItem {
  return { src: '/media/one.png', alt: 'First image', caption: null, ...overrides }
}

function cover(overrides: Partial<CoverImage> = {}): CoverImage {
  return { url: '/media/one.png', alt: 'First image', width: 1600, height: 900, ...overrides }
}

describe('media item conversion', () => {
  test('rejects an unsafe image URL so callers render nothing', () => {
    expect(toMediaItem(cover({ url: 'javascript:alert(1)' }))).toBeNull()
    expect(toMediaItem(cover({ url: null }))).toBeNull()
  })

  test('keeps a safe URL and falls back through alt, caption, then empty', () => {
    expect(toMediaItem(cover())?.src).toBe('/media/one.png')
    expect(toMediaItem(cover({ alt: null }), { altFallback: 'A project' })?.alt).toBe('A project')
    expect(toMediaItem(cover({ alt: null }), { caption: 'A caption' })?.alt).toBe('A caption')
    expect(toMediaItem(cover({ alt: null }))?.alt).toBe('')
  })

  test('normalizes an absent caption to null rather than undefined', () => {
    expect(toMediaItem(cover())?.caption).toBeNull()
    expect(toMediaItem(cover(), { caption: null })?.caption).toBeNull()
    expect(toMediaItem(cover(), { caption: 'Shown' })?.caption).toBe('Shown')
  })

  test('builds a width-descriptor srcset and omits it when no size is usable', () => {
    const withSizes = cover({
      sizes: {
        card: { url: '/media/one-800.png', width: 800, height: 450 },
        thumbnail: { url: null, width: null, height: null },
      },
    })

    expect(coverSrcSet(withSizes)).toBe('/media/one-800.png 800w')
    expect(coverSrcSet(cover())).toBeUndefined()
    expect(toMediaItem(withSizes)?.srcSet).toBe('/media/one-800.png 800w')
  })

  test('offers 16:9 derivatives even when the original is not 16:9', () => {
    // Covers and gallery tiles are `aspect-video` boxes that crop with
    // `object-cover`, so the RENDERED ratio is 16:9 whatever was uploaded.
    // Judging candidates against the original instead of the box left every
    // square or 3:2 upload with an empty candidate list, so no `srcset` was
    // emitted and the browser fell back to the full-resolution original.
    for (const [width, height] of [
      [800, 800],
      [1800, 1200],
      [1000, 1250],
    ]) {
      const nonSixteenByNine = cover({
        width,
        height,
        sizes: {
          thumbnail: { url: '/media/one-320.png', width: 320, height: 240 },
          card: { url: '/media/one-768.png', width: 768, height: 432 },
          hero: { url: '/media/one-1600.png', width: 1600, height: 900 },
        },
      })

      // The 4:3 `thumbnail` is still excluded: it does not match the box.
      expect(coverSrcSet(nonSixteenByNine)).toBe('/media/one-768.png 768w, /media/one-1600.png 1600w')
    }
  })

  test('drops a derivative whose aspect ratio disagrees with the layout box', () => {
    // Payload's imageSizes are fixed-aspect crops, so a 4:3 `thumbnail` is not
    // a valid stand-in for a 16:9 box. Offering it in a `w`-descriptor srcset
    // makes the browser fetch it and then lay it out for the box, distorting it.
    const mismatched = cover({
      sizes: {
        thumbnail: { url: '/media/one-320.png', width: 320, height: 240 },
        card: { url: '/media/one-768.png', width: 768, height: 432 },
      },
    })

    expect(coverSrcSet(mismatched)).toBe('/media/one-768.png 768w')
  })

  test('keeps prose images on the original-aspect rule so they are never cropped', () => {
    // Prose images render inside `.media-trigger`, which sets no aspect ratio
    // and no `object-fit`, so the image is painted at its intrinsic ratio. A
    // 16:9 derivative of a square upload would arrive stretched.
    const square = {
      url: '/media/one.png',
      alt: 'First image',
      width: 800,
      height: 800,
      sizes: {
        card: { url: '/media/one-768.png', width: 768, height: 432 },
        hero: { url: '/media/one-1600.png', width: 1600, height: 900 },
      },
    }

    expect(coverSrcSet(square, 'original')).toBeUndefined()
    // The same image in an aspect-video box does get the derivatives.
    expect(coverSrcSet(square, 'box')).toBe('/media/one-768.png 768w, /media/one-1600.png 1600w')
  })

  test('offers no candidate when the original has no dimensions to compare', () => {
    // Without the original's ratio nothing can be proven for an intrinsic-size
    // render, so a possibly distorted derivative must not be offered. A box
    // reference is unaffected: the box's ratio is known from CSS.
    const unknown = cover({
      width: null,
      height: null,
      sizes: { card: { url: '/media/one-768.png', width: 768, height: 432 } },
    })

    expect(coverSrcSet(unknown, 'original')).toBeUndefined()
    // The card grid still gets its candidates even with unknown dimensions,
    // because the rendered box is 16:9 regardless of the upload.
    expect(coverSrcSet(unknown, 'box')).toBe('/media/one-768.png 768w')
  })

  test('routes the filmstrip to the thumbnail derivative, not the original', () => {
    const withThumbnail = cover({
      sizes: { thumbnail: { url: '/media/one-320.png', width: 320, height: 240 } },
    })

    expect(toMediaItem(withThumbnail)?.thumbSrc).toBe('/media/one-320.png')
    // A mismatched-aspect thumbnail is still correct here: the thumb box is
    // `object-fit: cover`, so only bytes matter.
    expect(toMediaItem(cover())?.thumbSrc).toBeUndefined()
  })

  test('offers the width-preserving derivatives only to an uncropped surface', () => {
    // `gallerySm`/`galleryLg` are generated with `fit: 'inside'`, so they are
    // the only derivatives that preserve a square upload's ratio. A viewer item
    // paints at its own ratio, so it may use them; a 16:9 cover box crops what it
    // fetches, so it must never be offered one — the browser picks by width and
    // would stretch a square file into the frame. The 16:9 `card` crop stays
    // valid in both modes: it matches the box, and it does not match the
    // square original, so only the box reference can take it.
    const square = cover({
      width: 800,
      height: 800,
      sizes: {
        card: { url: '/media/one-768.png', width: 768, height: 432 },
        gallerySm: { url: '/media/one-640.png', width: 640, height: 640 },
        galleryLg: { url: '/media/one-1280.png', width: 1280, height: 1280 },
      },
    })

    expect(toMediaItem(square)?.srcSet).toBe('/media/one-640.png 640w, /media/one-1280.png 1280w')
    expect(coverSrcSet(square, 'box')).toBe('/media/one-768.png 768w')
  })

  test('drops a derivative the tolerance cannot absorb', () => {
    // `matchesAspect` allows 2% so sharp's whole-pixel scaling cannot empty the
    // `srcset`; it does not widen to "roughly the right shape". This candidate
    // is 1280x1024 against a 4:3 original — 6.7% off — so it must be rejected
    // rather than served into a 4:3 box and distorted.
    const landscape = cover({
      width: 1600,
      height: 1200,
      sizes: {
        gallerySm: { url: '/media/one-640.png', width: 640, height: 480 },
        galleryLg: { url: '/media/one-1280.png', width: 1280, height: 1024 },
      },
    })

    expect(toMediaItem(landscape)?.srcSet).toBe('/media/one-640.png 640w')
  })
})

describe('image gallery', () => {
  test('renders one clickable tile per item inside the project gallery section', () => {
    const markup = renderToStaticMarkup(
      createElement(ImageGallery, {
        heading: 'Gallery',
        items: [item({ src: '/media/a.png' }), item({ src: '/media/b.png' })],
      }),
    )

    expect(markup).toContain('aria-label="Project image gallery"')
    expect(markup).toContain('>Gallery</h2>')
    expect(markup.match(/<button/g) ?? []).toHaveLength(2)
    expect(markup).toContain('src="/media/a.png"')
    expect(markup).toContain('src="/media/b.png"')
  })

  test('renders a caption when present and no figcaption when it is null', () => {
    const withCaption = renderToStaticMarkup(
      createElement(ImageGallery, { items: [item({ caption: 'Deploy pipeline' })] }),
    )
    const withoutCaption = renderToStaticMarkup(createElement(ImageGallery, { items: [item()] }))

    expect(withCaption).toContain('<figcaption')
    expect(withCaption).toContain('Deploy pipeline')
    expect(withoutCaption).not.toContain('<figcaption')
  })

  test('carries the item srcset onto the tile image', () => {
    const markup = renderToStaticMarkup(
      createElement(ImageGallery, { items: [item({ srcSet: '/media/a-800.png 800w' })] }),
    )

    // React's static renderer preserves the JSX prop name verbatim, so this is
    // `srcSet`, not the lowercased `srcset` the DOM ends up with.
    expect(markup).toContain('srcSet="/media/a-800.png 800w"')
  })

  test('declares the grid width so the browser does not over-fetch a tile', () => {
    const markup = renderToStaticMarkup(createElement(ImageGallery, { items: [item()] }))

    // The grid is one column below `sm` and two above it. A `33vw` hint
    // under-declared the tile's real width and made the browser pick an
    // unnecessarily large candidate.
    expect(markup).toContain('sizes="(min-width: 640px) 50vw, 100vw"')
    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain('decoding="async"')
  })

  test('reserves each image’s own ratio so no tile is cropped', () => {
    const markup = renderToStaticMarkup(
      createElement(ImageGallery, {
        items: [
          item({ src: '/media/portrait.png', width: 800, height: 1200 }),
          item({ src: '/media/wide.png', width: 1920, height: 800 }),
        ],
      }),
    )

    // The tile wraps its image in `AspectRatio`, which emits the ratio as an
    // inline `--ratio` consumed by `aspect-(--ratio)`. A shared 16:9 frame here
    // is the regression this catches: it would crop both of these.
    const ratios = [...markup.matchAll(/--ratio:([\d.]+)/g)].map((match) => Number.parseFloat(match[1] as string))
    expect(ratios).toHaveLength(2)
    expect(ratios[0]).toBeCloseTo(800 / 1200)
    expect(ratios[1]).toBeCloseTo(1920 / 800)
  })

  test('falls back to the covers’ 16:9 box when a tile has no dimensions', () => {
    // A media document with no `width`/`height` has no ratio to reserve, so it
    // borrows the covers' box rather than collapsing to the image's own height.
    const markup = renderToStaticMarkup(createElement(ImageGallery, { items: [item({ src: '/media/unknown.png' })] }))

    expect(Number.parseFloat(/--ratio:([\d.]+)/.exec(markup)?.[1] ?? '0')).toBeCloseTo(16 / 9)
  })

  test('renders nothing when there is no viewable image', () => {
    expect(renderToStaticMarkup(createElement(ImageGallery, { items: [] }))).toBe('')
    expect(renderToStaticMarkup(createElement(ImageGallery, { items: [item({ src: '' })] }))).toBe('')
  })

  test('keys tiles by the image so a dropped entry keeps the rest mounted', () => {
    // An index key makes every tile after a removed image remount, which
    // discards the decoded bitmap of the images that did not change. The
    // content key only disambiguates a genuinely duplicated upload, so two
    // tiles may share a source without React dropping one.
    const duplicated = renderToStaticMarkup(
      createElement(ImageGallery, {
        items: [item({ src: '/media/same.png', alt: 'First' }), item({ src: '/media/same.png', alt: 'Second' })],
      }),
    )

    expect((duplicated.match(/<button/g) ?? []).length).toBe(2)
  })
})

describe('media trigger', () => {
  test('renders children bare with no button when there is no image', () => {
    const markup = renderToStaticMarkup(
      createElement(MediaTrigger, { item: null }, createElement('span', null, 'Cover area')),
    )

    expect(markup).toBe('<span>Cover area</span>')
  })

  test('wraps children in a labelled button when an image is present', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MediaTrigger,
        { item: item(), label: 'View full size image: A post' },
        createElement('span', null, 'Cover area'),
      ),
    )

    expect(markup).toContain('<button')
    expect(markup).toContain('aria-label="View full size image: A post"')
    expect(markup).toContain('Cover area')
  })
})

describe('media viewer', () => {
  test('renders nothing while closed', () => {
    expect(
      renderToStaticMarkup(
        createElement(MediaViewer, {
          index: null,
          items: [item()],
          onClose: () => {},
          onIndexChange: () => {},
        }),
      ),
    ).toBe('')
  })
})
