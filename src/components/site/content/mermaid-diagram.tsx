import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

// One module-level init promise, shared by every diagram on the page: mermaid
// is a module singleton, so a second `initialize` would re-theme the first
// render's output.
let mermaidReady: Promise<void> | undefined

type DiagramStatus = 'loading' | 'ready' | 'error'

interface MermaidDiagramProps {
  /**
   * A stable, caller-supplied discriminator. Two diagrams rendered in the same
   * document must never share one: mermaid throws on a duplicate render id and
   * the catch turns the second into an empty error box.
   */
  id: string
  source: string
  /** Accessible name for the rendered graphic and the viewport instructions. */
  label: string
}

/**
 * Renders a Mermaid source string as an SVG the visitor can zoom and pan.
 *
 * `mermaid` stays a dynamic import so its ~1.4 MB `elk` dependency chunk never
 * lands on the initial render path. Nothing here touches `window` before the
 * effect runs, so the component is safe to render during SSR — the toolbar is
 * present in the server HTML and the graphic arrives on hydration.
 */
export function MermaidDiagram({ id, source, label }: MermaidDiagramProps) {
  const generatedId = useId()
  const diagramRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef<{ id: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const [status, setStatus] = useState<DiagramStatus>('loading')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  // `useId` guarantees uniqueness per instance; `id` only makes the string
  // readable in the DOM. Both are stripped because mermaid's own id syntax
  // rejects the colons React puts in `useId`.
  const renderId = `mermaid-${id}-${generatedId}`.replace(/[^a-zA-Z0-9_-]/g, '')
  const viewportId = `mermaid-view-${renderId}`

  function changeZoom(amount: number) {
    setZoom((current) => Math.max(0.5, Math.min(2, Math.round((current + amount) * 10) / 10)))
  }

  function resetView() {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current
    if (!pointer || pointer.id !== event.pointerId) return
    setOffset({ x: pointer.offsetX + event.clientX - pointer.x, y: pointer.offsetY + event.clientY - pointer.y })
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (pointerRef.current?.id !== event.pointerId) return
    pointerRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }

  useEffect(() => {
    let active = true

    async function renderDiagram() {
      try {
        // A dynamic import, not a static one: mermaid pulls in a ~1.4 MB `elk`
        // chunk that must stay off the initial render path (vite.config.ts:86-96
        // documents the exemption). A static import would put it in the entry.
        const { default: mermaid } = await import('mermaid')
        if (!mermaidReady) {
          mermaidReady = Promise.resolve(
            mermaid.initialize({
              startOnLoad: false,
              securityLevel: 'strict',
              theme: 'base',
              themeVariables: {
                background: '#fffdf3',
                primaryColor: '#fff4ba',
                primaryTextColor: '#17171f',
                primaryBorderColor: '#17171f',
                lineColor: '#ff7969',
                secondaryColor: '#64d8c4',
                tertiaryColor: '#fff7df',
                clusterBkg: '#fffdf3',
                clusterBorder: '#17171f',
                edgeLabelBackground: '#fffdf3',
                fontFamily: 'monospace',
                fontSize: '14px',
              },
              flowchart: {
                htmlLabels: true,
                curve: 'stepAfter',
                nodeSpacing: 32,
                rankSpacing: 56,
              },
            }),
          )
        }
        await mermaidReady
        const { svg } = await mermaid.render(renderId, source)
        const target = diagramRef.current
        if (!active) return
        if (target) {
          target.innerHTML = svg
          setStatus('ready')
        }
      } catch {
        if (active) setStatus('error')
      }
    }

    void renderDiagram()
    return () => {
      active = false
    }
  }, [renderId, source])

  return (
    <div className="mermaid-diagram-shell">
      <div className="mermaid-diagram-toolbar" aria-label="Diagram controls">
        <button type="button" aria-label="Zoom out" onClick={() => changeZoom(-0.1)} disabled={zoom <= 0.5}>
          −
        </button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => changeZoom(0.1)} disabled={zoom >= 2}>
          +
        </button>
        <button type="button" onClick={resetView}>
          Reset view
        </button>
        <span className="mermaid-diagram-drag-hint">Drag to pan</span>
      </div>
      <ScrollArea
        className="mermaid-diagram-scroll"
        type="always"
        viewportProps={{
          id: viewportId,
          className: 'mermaid-diagram-viewport',
          tabIndex: 0,
          'aria-busy': status === 'loading',
          'aria-label': `Interactive diagram: ${label}. Drag to pan. Use zoom controls to resize.`,
          onPointerDown: startDrag,
          onPointerMove: drag,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }}
      >
        {status === 'loading' && <p className="mermaid-diagram-status">Rendering the diagram…</p>}
        <div
          ref={diagramRef}
          className="mermaid-diagram"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
          role="img"
          aria-label={label}
        />
        {status === 'error' && (
          <>
            <p className="mermaid-diagram-status" role="status">
              This diagram could not render here. Its source is shown below.
            </p>
            {/* The source stays in the document so the diagram's meaning survives a
                render failure — without this the article silently loses the figure. */}
            <pre className="mermaid-diagram-source">
              <code>{source}</code>
            </pre>
          </>
        )}
      </ScrollArea>
    </div>
  )
}
