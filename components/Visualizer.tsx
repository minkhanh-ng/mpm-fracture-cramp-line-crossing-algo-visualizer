
import React, { useRef, useEffect, useState } from 'react';
import { Node, Particle, Crack, SimulationStep, Point } from '../types';
import * as d3 from 'd3';

interface VisualizerProps {
  nodes: Node[];
  particles: Particle[];
  cracks: Crack[];
  currentStep: SimulationStep;
  onUpdateNode: (id: number, pos: Point) => void;
  onUpdateParticle: (id: number, pos: Point) => void;
  onUpdateCrack: (id: number, pointIdx: number, pos: Point) => void;
  onSplitCrack: (id: number, segmentIdx: number, pos: Point) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({
  nodes,
  particles,
  cracks,
  currentStep,
  onUpdateNode,
  onUpdateParticle,
  onUpdateCrack,
  onSplitCrack
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  // dragState now tracks which point index in the crack is being dragged
  const [dragState, setDragState] = useState<{type: 'node'|'particle'|'crack', id: number, pointIdx?: number} | null>(null);

  const width = 600;
  const height = 500;
  const scale = 40;
  const margin = 50;

  const toScreen = (p: Point) => ({
    x: p.x * scale + margin,
    y: height - (p.y * scale + margin)
  });

  const fromScreen = (x: number, y: number): Point => ({
    x: (x - margin) / scale,
    y: (height - y - margin) / scale
  });

  const handlePointerDown = (type: 'node'|'particle'|'crack', id: number, pointIdx?: number) => (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent triggering SVG click
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({ type, id, pointIdx });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = fromScreen(x, y);
    
    // Clamp
    point.x = Math.max(0, Math.min(12, point.x));
    point.y = Math.max(0, Math.min(10, point.y));

    if (dragState.type === 'node') onUpdateNode(dragState.id, point);
    if (dragState.type === 'particle') onUpdateParticle(dragState.id, point);
    if (dragState.type === 'crack' && dragState.pointIdx !== undefined) {
        onUpdateCrack(dragState.id, dragState.pointIdx, point);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragState(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSegmentDoubleClick = (crackId: number, segmentIdx: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const point = fromScreen(e.clientX - rect.left, e.clientY - rect.top);
    onSplitCrack(crackId, segmentIdx, point);
  };

  // Color generator for fields > 1
  const getFieldColor = (fieldVal: number) => {
    if (fieldVal === 1) return '#475569'; // Default Gray
    // Use a categorical scale
    const colors = [
       '#f59e0b', // 2 (Amber)
       '#8b5cf6', // 3 (Violet)
       '#ef4444', // 4 (Red)
       '#3b82f6', // 5 (Blue)
       '#10b981', // 6 (Emerald)
       '#ec4899', // 7 (Pink)
       '#14b8a6', // 8 (Teal)
       '#f97316', // 9 (Orange)
    ];
    return colors[(fieldVal - 2) % colors.length];
  };

  const renderTriangle = (points: Point[], color: string, label: string) => {
    if (!points || points.length !== 3) return null;
    const [p1, p2, p3] = points.map(toScreen);
    return (
      <g pointerEvents="none">
        <path 
          d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`} 
          fill={color} fillOpacity={0.2} 
          stroke={color} strokeWidth={1} strokeDasharray="4 2"
        />
        <text 
          x={(p1.x + p2.x + p3.x) / 3} y={(p1.y + p2.y + p3.y) / 3} 
          fill={color} fontSize="10" fontWeight="bold" textAnchor="middle"
        >{label}</text>
      </g>
    );
  };

  return (
    <svg 
      ref={svgRef}
      className="w-full h-full bg-slate-900 rounded-lg shadow-inner border border-slate-700 select-none cursor-crosshair"
      viewBox={`0 0 ${width} ${height}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <g opacity={0.1}>
        {d3.range(0, 13).map(i => (
           <line key={`v${i}`} x1={toScreen({x: i, y: 0}).x} y1={0} x2={toScreen({x: i, y: 0}).x} y2={height} stroke="white" strokeWidth={1}/>
        ))}
        {d3.range(0, 11).map(i => (
           <line key={`h${i}`} x1={0} y1={toScreen({x: 0, y: i}).y} x2={width} y2={toScreen({x: 0, y: i}).y} stroke="white" strokeWidth={1}/>
        ))}
      </g>

      {/* Connection Lines */}
      <g>
        {nodes.map(n => 
          particles.map(p => {
            const field = currentStep.currentFieldState[`${n.id}-${p.id}`];
            if (field === undefined) return null;

            const sn = toScreen(n);
            const sp = toScreen(p);
            
            const isActive = (currentStep.highlightNodeId === n.id && currentStep.highlightParticleId === p.id) || 
                             (currentStep.consistencyNodeId === n.id);
            
            let val = field;
            let allOnes = true;
            while(val > 0) {
                if (val % 3 !== 1) { allOnes = false; break; }
                val = Math.floor(val / 3);
            }
            if (field === 0) allOnes = false; // Should not happen with 1-based indexing

            const color = allOnes ? '#475569' : getFieldColor(field);
            
            return (
              <line 
                key={`${n.id}-${p.id}`}
                x1={sn.x} y1={sn.y}
                x2={sp.x} y2={sp.y}
                stroke={isActive ? '#facc15' : color}
                strokeWidth={isActive ? 3 : 1.5}
                strokeOpacity={isActive ? 1 : 0.4}
                strokeDasharray={allOnes ? "0" : "4 4"}
              />
            );
          })
        )}
      </g>

      {/* Debug Triangles */}
      {currentStep.triangleA && renderTriangle(currentStep.triangleA, '#f87171', 'Area1')}
      {currentStep.triangleB && renderTriangle(currentStep.triangleB, '#34d399', 'Area2')}
      {currentStep.triangleC && renderTriangle(currentStep.triangleC, '#60a5fa', 'Area3')}
      {currentStep.triangleD && renderTriangle(currentStep.triangleD, '#c084fc', 'Area4')}

      {/* Cracks */}
      {cracks.map((c) => {
        // Draw Segments
        return (
          <g key={`c${c.id}`}>
            {c.points.map((pt, i) => {
              if (i === c.points.length - 1) return null;
              const s = toScreen(pt);
              const e = toScreen(c.points[i+1]);
              const isHighlight = currentStep.highlightCrackId === c.id && 
                                  (currentStep.highlightSegmentIndex === undefined || currentStep.highlightSegmentIndex === i);

              return (
                <line 
                  key={`seg-${i}`}
                  x1={s.x} y1={s.y} x2={e.x} y2={e.y}
                  stroke={isHighlight ? '#ef4444' : '#dc2626'} 
                  strokeWidth={4} strokeLinecap="round"
                  className="cursor-pointer"
                  onDoubleClick={handleSegmentDoubleClick(c.id, i)}
                />
              );
            })}
            
            {/* Draw Points */}
            {c.points.map((pt, i) => {
              const s = toScreen(pt);
              return (
                <circle 
                  key={`pt-${i}`}
                  cx={s.x} cy={s.y} r={6} 
                  fill="#ef4444" 
                  className="cursor-move hover:stroke-white" 
                  strokeWidth={2} stroke="transparent"
                  onPointerDown={handlePointerDown('crack', c.id, i)}
                />
              );
            })}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((n, i) => {
        const s = toScreen(n);
        const isHighlight = currentStep.highlightNodeId === n.id;
        const isConsistency = currentStep.consistencyNodeId === n.id;
        
        let fillColor = '#3b82f6';
        let strokeColor = 'none';
        if (isConsistency) {
            fillColor = '#8b5cf6';
            strokeColor = 'white';
        } else if (isHighlight) {
            fillColor = '#60a5fa';
            strokeColor = 'white';
        }

        return (
          <g key={`n${n.id}`} onPointerDown={handlePointerDown('node', n.id)} className="cursor-move">
            <rect x={s.x - 8} y={s.y - 8} width={16} height={16} fill={fillColor} stroke={strokeColor} strokeWidth={2} />
            <text x={s.x} y={s.y - 12} fill="#93c5fd" textAnchor="middle" fontSize="10">N{i}</text>
            
            {/* Consistency Check Helper Text */}
            {isConsistency && currentStep.consistencyFields && (
                <g transform={`translate(${s.x}, ${s.y + 25})`}>
                    <rect x="-30" y="0" width="60" height="20" rx="4" fill="#8b5cf6" />
                    <text x="0" y="14" fill="white" textAnchor="middle" fontSize="10" fontWeight="bold">
                        Seen: [{currentStep.consistencyFields.join(',')}]
                    </text>
                </g>
            )}
          </g>
        );
      })}

      {/* Particles */}
      {particles.map((p, i) => {
        const s = toScreen(p);
        const isHighlight = currentStep.highlightParticleId === p.id;
        return (
          <g key={`p${p.id}`} onPointerDown={handlePointerDown('particle', p.id)} className="cursor-move">
            <circle cx={s.x} cy={s.y} r={8} fill={isHighlight ? '#4ade80' : '#22c55e'} stroke={isHighlight ? 'white' : 'none'} strokeWidth={2} />
            <text x={s.x} y={s.y + 20} fill="#86efac" textAnchor="middle" fontSize="10" fontWeight="bold">P{i}</text>
          </g>
        );
      })}

    </svg>
  );
};

export default Visualizer;
