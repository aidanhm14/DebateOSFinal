import { useRef, useEffect, useState, useCallback } from 'react'
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

export default function MindMap({ result, motion, colors, onClose }) {
  const svgRef = useRef(null)
  const miniRef = useRef(null)
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)
  const [dimensions, setDimensions] = useState({ w: 900, h: 700 })

  const drawMinimap = useCallback((root, transform) => {
    if (!miniRef.current) return
    const mini = d3.select(miniRef.current)
    mini.selectAll('*').remove()
    const mW = 120, mH = 90, scale = 0.08
    const mg = mini.append('g').attr('transform', `translate(${mW/2},${mH/2}) scale(${scale})`)
    const linkGen = d3.linkRadial().angle(d => d.x).radius(d => d.y)
    mg.selectAll('.mlink').data(root.links()).join('path').attr('fill', 'none').attr('stroke', '#ffffff15').attr('stroke-width', 2).attr('d', linkGen)
    mg.selectAll('.mnode').data(root.descendants()).join('circle')
      .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .attr('r', d => d.depth === 0 ? 12 : 6)
      .attr('fill', d => (TYPE_COLORS[d.data.type] || '#555') + '80')
  }, [])

  const draw = useCallback(() => {
    if (!result || !svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const W = dimensions.w, H = dimensions.h, CX = W / 2, CY = H / 2
    const radius = Math.min(W, H) / 2 - 100
    const treeData = caseToTree(result, motion)
    const root = d3.hierarchy(treeData)
    d3.tree().size([2 * Math.PI, radius]).separation((a, b) => (a.parent === b.parent ? 1 : 1.5) / (a.depth || 1))(root)
    const g = svg.append('g').attr('transform', `translate(${CX},${CY})`)
    const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
      g.attr('transform', `translate(${CX + event.transform.x},${CY + event.transform.y}) scale(${event.transform.k})`)
      drawMinimap(root, event.transform)
    })
    svg.call(zoom)
    const defs = svg.append('defs')
    const glow = defs.append('filter').attr('id', 'glow')
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur')
    glow.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).join('feMergeNode').attr('in', d => d)
    const linkGen = d3.linkRadial().angle(d => d.x).radius(d => d.y)
    const links = g.selectAll('.link').data(root.links()).join('path')
      .attr('class', 'link').attr('fill', 'none')
      .attr('stroke', d => (TYPE_COLORS[d.target.data.type] || '#444') + '50')
      .attr('stroke-width', d => Math.max(1, 3 - d.target.depth * 0.5))
      .attr('d', linkGen)
    links.attr('stroke-dasharray', function() { return this.getTotalLength() })
      .attr('stroke-dashoffset', function() { return this.getTotalLength() })
      .transition().duration(800).delay((d, i) => i * 60).attr('stroke-dashoffset', 0)
    const nodes = g.selectAll('.node').data(root.descendants()).join('g')
      .attr('class', 'node')
      .attr('transform', d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
      .style('cursor', d => d.data.detail ? 'pointer' : 'default')
      .style('opacity', 0)
    nodes.transition().duration(500).delay((d, i) => 200 + i * 50).style('opacity', 1)
    nodes.append('circle')
      .attr('r', d => d.depth === 0 ? 18 : d.children ? 10 : 7)
      .attr('fill', d => (TYPE_COLORS[d.data.type] || '#555') + '25')
      .attr('stroke', d => TYPE_COLORS[d.data.type] || '#555')
      .attr('stroke-width', d => d.depth === 0 ? 2.5 : 1.5)
      .attr('filter', d => d.depth <= 1 ? 'url(#glow)' : null)
    nodes.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('font-size', d => d.depth === 0 ? 14 : 10)
      .attr('fill', d => TYPE_COLORS[d.data.type] || '#888')
      .text(d => TYPE_ICONS[d.data.type] || '●')
    nodes.append('text').attr('dy', '0.31em')
      .attr('x', d => { const a = d.x * 180 / Math.PI; return d.depth === 0 ? 0 : a < 180 ? 16 : -16 })
      .attr('y', d => d.depth === 0 ? -28 : 0)
      .attr('text-anchor', d => { if (d.depth === 0) return 'middle'; return d.x * 180 / Math.PI < 180 ? 'start' : 'end' })
      .attr('transform', d => { if (d.depth === 0) return ''; return d.x * 180 / Math.PI >= 180 ? 'rotate(180)' : '' })
      .attr('fill', d => TYPE_COLORS[d.data.type] || '#999')
      .attr('font-size', d => d.depth === 0 ? 14 : d.depth === 1 ? 12 : 11)
      .attr('font-weight', d => d.depth <= 1 ? 700 : 500)
      .attr('font-family', "'Inter','system-ui',sans-serif")
      .text(d => d.data.name.length > 30 ? d.data.name.slice(0, 28) + '...' : d.data.name)
    nodes.on('mouseenter', (event, d) => {
      if (!d.data.detail) return
      const [mx, my] = d3.pointer(event, containerRef.current)
      setTooltip({ x: mx, y: my, title: d.data.name, text: d.data.detail, color: TYPE_COLORS[d.data.type] })
    }).on('mouseleave', () => setTooltip(null))
    .on('click', (event, d) => {
      if (!d.data.detail) return; event.stopPropagation()
      const [mx, my] = d3.pointer(event, containerRef.current)
      setTooltip(prev => prev && prev.title === d.data.name ? null : { x: mx, y: my, title: d.data.name, text: d.data.detail, color: TYPE_COLORS[d.data.type], pinned: true })
    })
    svg.on('click', () => setTooltip(null))
    drawMinimap(root, d3.zoomIdentity)
  }, [result, motion, dimensions, drawMinimap])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDimensions({ w: width, h: height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { draw() }, [draw])
  if (!result) return null

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '70vh', minHeight: 500, background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 18px', background: 'linear-gradient(180deg, #0d0d14 60%, transparent)', zIndex: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors?.primary || '#818cf8' }}>Argument Map</span>
        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
          {[['Mechanism','mechanism'],['Argument','argument'],['Impact','impact'],['Turn','turn'],['Ballot','ballot']].map(([label, type]) => (
            <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#6b6b80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[type] }} />
              {label}
            </span>
          ))}
        </div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: '1px solid #2a2a3d', borderRadius: 6, color: '#6b6b80', fontSize: 18, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>}
      </div>
      <svg ref={svgRef} width={dimensions.w} height={dimensions.h} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', bottom: 12, right: 12, background: '#0d0d1480', border: '1px solid #1e1e2e', borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
        <svg ref={miniRef} width={120} height={90} style={{ display: 'block' }} />
      </div>
      {tooltip && (
        <div style={{ position: 'absolute', maxWidth: 300, padding: '12px 16px', background: '#1a1a28', border: `1px solid ${tooltip.color}40`, borderRadius: 10, zIndex: 20, pointerEvents: 'none', boxShadow: '0 8px 32px #00000060', left: Math.min(tooltip.x + 12, dimensions.w - 300), top: Math.min(tooltip.y - 10, dimensions.h - 200) }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, color: tooltip.color }}>{tooltip.title}</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#b0b0be', margin: 0 }}>{tooltip.text}</p>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: '#3a3a4d', letterSpacing: '0.03em' }}>scroll to zoom &middot; drag to pan &middot; hover nodes for detail</div>
    </div>
  )
}
