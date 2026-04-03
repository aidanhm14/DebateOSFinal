import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'

function caseToTree(result, motion) {
  const root = { name: motion || 'Motion', type: 'root', children: [] }
  if (result.mechanism) root.children.push({ name: 'Mechanism', type: 'mechanism', detail: result.mechanism, children: [] })
  if (result.roundVision) root.children.push({ name: 'Round Vision', type: 'vision', detail: result.roundVision, children: [] })
  if (result.arguments && result.arguments.length) {
    root.children.push({
      name: 'Arguments', type: 'section',
      children: result.arguments.map((arg, i) => ({
        name: arg.label || `Contention ${i + 1}`, type: 'argument',
        children: [
          { name: 'Claim', type: 'claim', detail: arg.claim, children: [] },
          { name: 'Warrant', type: 'warrant', detail: arg.warrant, children: [] },
          { name: 'Impact', type: 'impact', detail: arg.impact, children: [] },
        ]
      }))
    })
  }
  if (result.spikes && result.spikes.length) {
    root.children.push({ name: 'Pre-empts', type: 'section',
      children: result.spikes.map(s => ({ name: s.label, type: 'spike', detail: s.response, children: [] }))
    })
  }
  if (result.turn) {
    root.children.push({ name: 'Turn', type: 'turn', children: [
      { name: 'Their Argument', type: 'opposing', detail: result.turn.opposingArgument, children: [] },
      { name: 'The Turn', type: 'turnMove', detail: result.turn.turn, children: [] },
    ]})
  }
  if (result.ballotFraming) root.children.push({ name: 'Ballot Framing', type: 'ballot', detail: result.ballotFraming, children: [] })
  return root
}

const TYPE_COLORS = {
  root: '#e0e0e6', mechanism: '#818cf8', vision: '#a78bfa', section: '#6b6b80',
  argument: '#67e8f9', claim: '#818cf8', warrant: '#67e8f9', impact: '#f43f5e',
  spike: '#c084fc', turn: '#fbbf24', opposing: '#fb923c', turnMove: '#fbbf24', ballot: '#6ee7b7',
}
const TYPE_ICONS = {
  root: '\u25C9', mechanism: '\u2699', vision: '\u25CE', section: '\u25CB',
  argument: '\u25C6', claim: '\u25B8', warrant: '\u25B8', impact: '\u25B8',
  spike: '\u26A1', turn: '\u21BB', opposing: '\u25C0', turnMove: '\u27F6', ballot: '\u2696',
}

function getNodeColor(d, colors) {
  if (!colors) return TYPE_COLORS[d.data.type] || '#555'
  const map = { mechanism: colors.primary, vision: colors.primary, argument: colors.argument, claim: colors.primary, warrant: colors.argument, impact: '#f43f5e', spike: colors.accent, turn: colors.turn, opposing: colors.turn, turnMove: colors.turn, ballot: colors.ballot, section: '#6b6b80', root: colors.primary }
  return map[d.data.type] || TYPE_COLORS[d.data.type] || '#555'
}

export default function MindMap({ result, motion, colors, onClose }) {
  const svgRef = useRef(null)
  const miniRef = useRef(null)
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [detailPanel, setDetailPanel] = useState(null)
  const [dimensions, setDimensions] = useState({ w: 900, h: 700 })
  const [collapsed, setCollapsed] = useState(new Set())
  const floatPhases = useRef(new Map())

  const isMobile = dimensions.w < 768

  // Stable float phases per node
  const getFloatPhase = useCallback((id) => {
    if (!floatPhases.current.has(id)) floatPhases.current.set(id, Math.random() * Math.PI * 2)
    return floatPhases.current.get(id)
  }, [])

  const drawMinimap = useCallback((root, transform) => {
    if (!miniRef.current) return
    const mini = d3.select(miniRef.current)
    mini.selectAll('*').remove()
    const mW = 140, mH = 100, scale = 0.07
    const mg = mini.append('g').attr('transform', `translate(${mW/2},${mH/2}) scale(${scale})`)
    const linkGen = d3.linkRadial().angle(d => d.x).radius(d => d.y)
    mg.selectAll('.mlink').data(root.links()).join('path').attr('fill', 'none').attr('stroke', '#ffffff12').attr('stroke-width', 3).attr('d', linkGen)
    mg.selectAll('.mnode').data(root.descendants()).join('circle')
      .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .attr('r', d => d.depth === 0 ? 14 : 7)
      .attr('fill', d => (getNodeColor(d, colors)) + '60')

    // Viewport indicator
    if (transform && transform.k) {
      const vw = dimensions.w / transform.k * scale
      const vh = dimensions.h / transform.k * scale
      const vx = -transform.x / transform.k * scale
      const vy = -transform.y / transform.k * scale
      mg.append('rect')
        .attr('x', vx - vw/2).attr('y', vy - vh/2).attr('width', vw).attr('height', vh)
        .attr('fill', 'none').attr('stroke', '#ffffff30').attr('stroke-width', 2).attr('rx', 3)
    }
  }, [colors, dimensions, getNodeColor])

  const draw = useCallback(() => {
    if (!result || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const W = dimensions.w, H = dimensions.h, CX = W / 2, CY = H / 2
    const radius = Math.min(W, H) / 2 - 120

    const treeData = caseToTree(result, motion)

    // Apply collapse state
    function applyCollapse(node, path = '') {
      const id = path + '/' + node.name
      node._id = id
      if (node.children && collapsed.has(id)) {
        node._children = node.children
        node.children = []
      }
      if (node.children) node.children.forEach(c => applyCollapse(c, id))
    }
    applyCollapse(treeData)

    const root = d3.hierarchy(treeData)
    d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.8) / (a.depth || 1))
      (root)

    const g = svg.append('g').attr('transform', `translate(${CX},${CY})`)
    const zoom = d3.zoom().scaleExtent([0.3, 2.5]).on('zoom', (event) => {
      g.attr('transform', `translate(${CX + event.transform.x},${CY + event.transform.y}) scale(${event.transform.k})`)
      drawMinimap(root, event.transform)
    })
    svg.call(zoom)
    // Touch support for pinch zoom
    svg.on('touchstart.zoom', null)
    svg.call(zoom).on('dblclick.zoom', null)

    // ── SVG DEFS ──
    const defs = svg.append('defs')

    // Glow filter
    const glow = defs.append('filter').attr('id', 'node-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
    glow.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur')
    glow.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).join('feMergeNode').attr('in', d => d)

    // Intense glow for hover
    const glowHover = defs.append('filter').attr('id', 'node-glow-hover').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
    glowHover.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur')
    glowHover.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).join('feMergeNode').attr('in', d => d)

    // Gradient defs for links
    root.links().forEach((link, i) => {
      const srcColor = getNodeColor(link.source, colors)
      const tgtColor = getNodeColor(link.target, colors)
      const grad = defs.append('linearGradient')
        .attr('id', `link-grad-${i}`)
        .attr('gradientUnits', 'userSpaceOnUse')
      grad.append('stop').attr('offset', '0%').attr('stop-color', srcColor).attr('stop-opacity', 0.4)
      grad.append('stop').attr('offset', '100%').attr('stop-color', tgtColor).attr('stop-opacity', 0.25)
    })

    // Radial depth glow circles
    const depthGlows = g.append('g').attr('class', 'depth-glows')
    root.descendants().filter(d => d.depth === 1).forEach(d => {
      const angle = d.x - Math.PI / 2
      const cx = Math.cos(angle) * d.y
      const cy = Math.sin(angle) * d.y
      const col = getNodeColor(d, colors)
      depthGlows.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', 80)
        .attr('fill', col).attr('opacity', 0.03)
        .attr('filter', 'url(#node-glow)')
    })

    // ── LINKS ──
    const linkGen = d3.linkRadial().angle(d => d.x).radius(d => d.y)
    const links = g.selectAll('.link').data(root.links()).join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', (d, i) => `url(#link-grad-${i})`)
      .attr('stroke-width', d => Math.max(1.5, 3.5 - d.target.depth * 0.7))
      .attr('d', linkGen)

    // Animate link drawing
    links.each(function() {
      const len = this.getTotalLength()
      d3.select(this)
        .attr('stroke-dasharray', len)
        .attr('stroke-dashoffset', len)
        .transition().duration(900).delay((d, i) => i * 70).ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0)
    })

    // ── NODES ──
    const nodeGroups = g.selectAll('.node').data(root.descendants()).join('g')
      .attr('class', 'node')
      .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .style('cursor', 'pointer')
      .style('opacity', 0)

    // Staggered reveal
    nodeGroups.transition().duration(600)
      .delay((d, i) => 150 + d.depth * 150 + i * 30)
      .ease(d3.easeCubicOut)
      .style('opacity', 1)

    // ── PILL-SHAPED NODES ──
    nodeGroups.each(function(d) {
      const el = d3.select(this)
      const col = getNodeColor(d, colors)
      const isRoot = d.depth === 0
      const hasKids = d.data._children || (d.data.children && d.data.children.length > 0)
      const isCollapsed = d.data._children && d.data._children.length > 0

      // Counter-rotate so text is always readable
      const angle = d.x * 180 / Math.PI - 90
      const flip = angle > 90 && angle < 270

      const pillG = el.append('g')
        .attr('transform', flip ? 'rotate(180)' : '')

      // Node dimensions
      const pw = isRoot ? 140 : d.depth === 1 ? 120 : 100
      const ph = isRoot ? 44 : d.depth === 1 ? 36 : 30

      // Pill background
      pillG.append('rect')
        .attr('x', isRoot ? -pw/2 : flip ? -pw - 4 : 4)
        .attr('y', -ph/2)
        .attr('width', pw)
        .attr('height', ph)
        .attr('rx', ph/2)
        .attr('ry', ph/2)
        .attr('fill', `${col}12`)
        .attr('stroke', `${col}40`)
        .attr('stroke-width', 1.2)
        .attr('filter', d.depth <= 1 ? 'url(#node-glow)' : null)

      // Left accent bar
      const barX = isRoot ? -pw/2 + 4 : flip ? -pw : 8
      pillG.append('rect')
        .attr('x', barX)
        .attr('y', -ph/2 + 4)
        .attr('width', 3)
        .attr('height', ph - 8)
        .attr('rx', 1.5)
        .attr('fill', col)
        .attr('opacity', 0.8)

      // Icon
      const iconX = isRoot ? -pw/2 + 16 : flip ? -pw + 12 : 20
      pillG.append('text')
        .attr('x', iconX)
        .attr('y', 1)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', isRoot ? 14 : 10)
        .attr('fill', col)
        .text(TYPE_ICONS[d.data.type] || '\u25CF')

      // Label text
      const textX = isRoot ? -pw/2 + 28 : flip ? -pw + 24 : 32
      const maxChars = isRoot ? 16 : d.depth === 1 ? 14 : 12
      const label = d.data.name.length > maxChars ? d.data.name.slice(0, maxChars - 2) + '..' : d.data.name
      pillG.append('text')
        .attr('x', textX)
        .attr('y', d.data.detail ? -4 : 1)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('font-size', isRoot ? 13 : d.depth === 1 ? 11 : 10)
        .attr('font-weight', d.depth <= 1 ? 700 : 600)
        .attr('fill', col)
        .attr('font-family', "'IBM Plex Mono', 'SF Mono', monospace")
        .text(label)

      // Body snippet
      if (d.data.detail) {
        const snippet = d.data.detail.slice(0, 50) + (d.data.detail.length > 50 ? '...' : '')
        pillG.append('text')
          .attr('x', textX)
          .attr('y', 8)
          .attr('text-anchor', 'start')
          .attr('dominant-baseline', 'central')
          .attr('font-size', 8)
          .attr('fill', '#6b6b80')
          .attr('font-family', "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif")
          .text(snippet)
      }

      // Collapse indicator
      if (hasKids && !isRoot) {
        const indX = isRoot ? pw/2 - 10 : flip ? -8 : pw
        pillG.append('text')
          .attr('x', indX)
          .attr('y', 1)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', 10)
          .attr('fill', isCollapsed ? col : '#3a3a4d')
          .attr('font-weight', 700)
          .text(isCollapsed ? '+' : '\u2013')
      }
    })

    // ── HOVER + INTERACTION ──
    nodeGroups
      .on('mouseenter', function(event, d) {
        const col = getNodeColor(d, colors)
        d3.select(this).select('rect')
          .transition().duration(200)
          .attr('fill', `${col}20`)
          .attr('stroke', `${col}70`)
          .attr('filter', 'url(#node-glow-hover)')
        d3.select(this).transition().duration(200)
          .attr('transform', function() {
            const base = `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`
            return base + ' scale(1.05)'
          })

        // Brighten connected links
        links.filter(l => l.source === d || l.target === d)
          .transition().duration(200)
          .attr('stroke-width', l => Math.max(2.5, 4.5 - l.target.depth * 0.7))
          .attr('stroke-opacity', 1)

        if (d.data.detail) {
          const [mx, my] = d3.pointer(event, containerRef.current)
          setTooltip({ x: mx, y: my, title: d.data.name, text: d.data.detail, color: col, type: d.data.type })
        }
      })
      .on('mouseleave', function(event, d) {
        const col = getNodeColor(d, colors)
        d3.select(this).select('rect')
          .transition().duration(300)
          .attr('fill', `${col}12`)
          .attr('stroke', `${col}40`)
          .attr('filter', d.depth <= 1 ? 'url(#node-glow)' : null)
        d3.select(this).transition().duration(300)
          .attr('transform', `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
        links.filter(l => l.source === d || l.target === d)
          .transition().duration(300)
          .attr('stroke-width', l => Math.max(1.5, 3.5 - l.target.depth * 0.7))
          .attr('stroke-opacity', 1)
        setTooltip(null)
      })
      .on('click', function(event, d) {
        event.stopPropagation()
        const id = d.data._id
        // Toggle collapse if has children
        if ((d.data.children && d.data.children.length > 0) || d.data._children) {
          setCollapsed(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
          return
        }
        // Open detail panel for leaf nodes
        if (d.data.detail) {
          const col = getNodeColor(d, colors)
          setDetailPanel({ title: d.data.name, text: d.data.detail, color: col, type: d.data.type })
        }
      })

    svg.on('click', () => { setTooltip(null); setDetailPanel(null) })

    // ── IDLE FLOATING ANIMATION ──
    let animFrame
    let startTime = performance.now()
    function float() {
      const now = performance.now()
      const elapsed = (now - startTime) / 1000
      nodeGroups.each(function(d, i) {
        const phase = getFloatPhase(d.data._id || i)
        const dy = Math.sin(elapsed * 1.5 + phase) * 2
        const base = `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},${dy})`
        d3.select(this).attr('transform', base)
      })
      animFrame = requestAnimationFrame(float)
    }
    // Start floating after initial reveal
    const totalReveal = 150 + root.descendants().length * 30 + 600
    setTimeout(() => { animFrame = requestAnimationFrame(float) }, totalReveal)

    drawMinimap(root, d3.zoomIdentity)

    return () => { if (animFrame) cancelAnimationFrame(animFrame) }
  }, [result, motion, dimensions, drawMinimap, collapsed, colors, getFloatPhase])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDimensions({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const cleanup = draw()
    return cleanup
  }, [draw])

  if (!result) return null

  const legendItems = [
    ['Mechanism', 'mechanism'], ['Argument', 'argument'], ['Impact', 'impact'],
    ['Turn', 'turn'], ['Ballot', 'ballot'], ['Pre-empt', 'spike']
  ]

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', height: '75vh', minHeight: 540,
      background: 'linear-gradient(180deg, #0a0a12 0%, #0d0d16 100%)',
      border: '1px solid #1a1a2a', borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
        background: 'linear-gradient(180deg, #0a0a12 70%, transparent)',
        zIndex: 10, borderBottom: '1px solid #ffffff06',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors?.primary || '#818cf8', fontFamily: "'IBM Plex Mono', monospace" }}>
          Argument Map
        </span>
        <div style={{ display: 'flex', gap: 14, flex: 1, flexWrap: 'wrap' }}>
          {legendItems.map(([label, type]) => (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#4a4a5d', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span style={{ width: 7, height: 7, borderRadius: 4, background: getNodeColor({ data: { type } }, colors), boxShadow: `0 0 6px ${getNodeColor({ data: { type } }, colors)}40` }} />
              {label}
            </span>
          ))}
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #2a2a3d', borderRadius: 8,
            color: '#4a4a5d', fontSize: 16, width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>&times;</button>
        )}
      </div>

      {/* SVG Canvas */}
      <svg ref={svgRef} width={dimensions.w} height={dimensions.h} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Minimap */}
      <div style={{
        position: 'absolute', bottom: 14, right: 14,
        background: '#0a0a1280', border: '1px solid #1a1a2a',
        borderRadius: 10, overflow: 'hidden', backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px #00000040',
      }}>
        <svg ref={miniRef} width={140} height={100} style={{ display: 'block' }} />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', maxWidth: 320, padding: '14px 18px',
          background: '#13131e', border: `1px solid ${tooltip.color}30`,
          borderRadius: 12, zIndex: 20, pointerEvents: 'none',
          boxShadow: `0 8px 40px #00000070, 0 0 20px ${tooltip.color}10`,
          left: Math.min(tooltip.x + 16, dimensions.w - 340),
          top: Math.min(tooltip.y - 12, dimensions.h - 220),
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: tooltip.color }}>{TYPE_ICONS[tooltip.type] || '\u25CF'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tooltip.color, fontFamily: "'IBM Plex Mono', monospace" }}>{tooltip.title}</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: '#a0a0b2', margin: 0 }}>{tooltip.text}</p>
        </div>
      )}

      {/* Detail Panel (slide-in) */}
      {detailPanel && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: Math.min(380, dimensions.w * 0.45),
          background: '#0f0f1a', borderLeft: `2px solid ${detailPanel.color}30`,
          zIndex: 25, padding: '60px 24px 24px', overflowY: 'auto',
          boxShadow: '-8px 0 40px #00000050',
          animation: 'slideInRight 0.3s ease-out',
        }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setDetailPanel(null)} style={{
            position: 'absolute', top: 16, right: 16, background: 'none',
            border: '1px solid #2a2a3d', borderRadius: 8, color: '#555',
            fontSize: 16, width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&times;</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 16, color: detailPanel.color }}>{TYPE_ICONS[detailPanel.type] || '\u25CF'}</span>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: detailPanel.color, fontFamily: "'IBM Plex Mono', monospace" }}>{detailPanel.title}</span>
          </div>
          <div style={{ width: 40, height: 2, background: detailPanel.color, opacity: 0.4, borderRadius: 1, marginBottom: 20 }} />
          {detailPanel.text.split('\n\n').map((p, i) => (
            <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: '#b0b0c0', marginBottom: 14 }}>{p}</p>
          ))}
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 14, left: 14,
        fontSize: 10, color: '#2a2a3d', letterSpacing: '0.04em',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        scroll to zoom &middot; drag to pan &middot; click to expand &middot; hover for detail
      </div>

      {/* Injected keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
