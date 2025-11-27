
import { Point, Node, Particle, Crack, SimulationStep } from './types';

// Matches Python: x1[0] * (x2[1] - x3[1]) + x2[0] * (x3[1] - x1[1]) + x3[0] * (x1[1] - x2[1])
export const triangleArea = (x1: Point, x2: Point, x3: Point): number => {
  return x1.x * (x2.y - x3.y) + x2.x * (x3.y - x1.y) + x3.x * (x1.y - x2.y);
};

const distSq = (p1: Point, p2: Point) => (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;

export const checkCrossing = (
  p: Point, 
  n: Point, 
  cStart: Point, 
  cEnd: Point
): { result: number, areas: { area1: number, area2: number, area3: number, area4: number } } => {
  
  const area1 = triangleArea(p, n, cStart);
  const area2 = triangleArea(p, n, cEnd);
  const area3 = triangleArea(cStart, cEnd, p);
  const area4 = triangleArea(cStart, cEnd, n);

  let result = 0;

  // Pattern [-,+,+,-] means crossed "above"
  if (area1 < 0 && area2 >= 0 && area3 >= 0 && area4 < 0) {
    result = 2;
  }
  // Pattern [+,-,-,+] means crossed "below"
  else if (area1 >= 0 && area2 < 0 && area3 < 0 && area4 >= 0) {
    result = 3;
  }

  return { result, areas: { area1, area2, area3, area4 } };
};

export const generateSimulationSteps = (
  nodes: Node[],
  particles: Particle[],
  cracks: Crack[]
): SimulationStep[] => {
  const steps: SimulationStep[] = [];
  let stepCounter = 0;

  // 1. Determine Connectivity (Simulate MPM Grid Cells)
  const particleToNodes: Record<number, number[]> = {};
  const nodeToParticles: Record<number, number[]> = {};

  nodes.forEach(n => nodeToParticles[n.id] = []);

  particles.forEach(p => {
    // Sort nodes by distance to particle, take closest 4
    const sortedNodes = [...nodes].sort((a, b) => distSq(p, a) - distSq(p, b));
    const connected = sortedNodes.slice(0, 4);
    
    particleToNodes[p.id] = connected.map(n => n.id);
    connected.forEach(n => {
      nodeToParticles[n.id].push(p.id);
    });
  });

  // Helper to compute combined base-3 field
  const computeCombinedField = (acc: Record<string, number[]>) => {
    const combined: Record<string, number> = {};
    Object.keys(acc).forEach(key => {
        let val = 0;
        acc[key].forEach((fieldVal, idx) => {
            val += fieldVal * (3 ** idx);
        });
        combined[key] = val;
    });
    return combined;
  };

  // Initialize accumulators
  // fieldAccumulator stores the field (1, 2, or 3) for EACH crack for each pair
  const fieldAccumulator: Record<string, number[]> = {};
  
  particles.forEach(p => {
    particleToNodes[p.id].forEach(nodeId => {
      const key = `${nodeId}-${p.id}`;
      fieldAccumulator[key] = new Array(cracks.length).fill(1);
    });
  });

  steps.push({
    stepId: stepCounter++,
    description: "Initialization: Connected pairs set to Field 1 (No Crossing).",
    currentFieldState: computeCombinedField(fieldAccumulator)
  });

  cracks.forEach((crack, crackIdx) => {
    steps.push({
      stepId: stepCounter++,
      description: `Processing Crack ${crack.id + 1}...`,
      highlightCrackId: crack.id,
      currentFieldState: computeCombinedField(fieldAccumulator)
    });

    // 2. Crossing Detection Phase
    particles.forEach(p => {
      const connectedNodeIds = particleToNodes[p.id];
      
      connectedNodeIds.forEach(nodeId => {
        const n = nodes.find(node => node.id === nodeId)!;
        const key = `${n.id}-${p.id}`;
        
        let field2_count = 0;
        let field3_count = 0;

        // Loop through crack segments
        for (let i = 0; i < crack.points.length - 1; i++) {
            const start = crack.points[i];
            const end = crack.points[i+1];
            
            const { result, areas } = checkCrossing(p, n, start, end);
            
            if (result === 2) field2_count++;
            if (result === 3) field3_count++;

            const step: SimulationStep = {
                stepId: stepCounter++,
                description: `Checking Node ${n.id}-P${p.id} vs Segment ${i}`,
                highlightNodeId: n.id,
                highlightParticleId: p.id,
                highlightCrackId: crack.id,
                highlightSegmentIndex: i,
                triangleA: [p, n, start],
                triangleB: [p, n, end],
                triangleC: [start, end, p],
                triangleD: [start, end, n],
                areas,
                crossingResult: result,
                segmentCounts: { f2: field2_count, f3: field3_count },
                currentFieldState: computeCombinedField(fieldAccumulator)
            };
            steps.push(step);
        }

        // Cancellation Logic
        let finalField = 1;
        
        if (field2_count > 0 && field3_count > 0) {
             const min = Math.min(field2_count, field3_count);
             field2_count -= min;
             field3_count -= min;
        }

        if (field2_count % 2 === 1) finalField = 2;
        else if (field3_count % 2 === 1) finalField = 3;

        // Update accumulator
        const changed = fieldAccumulator[key][crackIdx] !== finalField;
        fieldAccumulator[key][crackIdx] = finalField;

        if (changed || finalField !== 1) {
            steps.push({
                stepId: stepCounter++,
                description: `Result Node ${n.id}-P${p.id}: ${finalField === 1 ? 'No Net Crossing' : (finalField === 2 ? 'Net Above' : 'Net Below')}`,
                highlightNodeId: n.id,
                highlightParticleId: p.id,
                highlightCrackId: crack.id,
                crossingResult: finalField,
                currentFieldState: computeCombinedField(fieldAccumulator)
            });
        }
      });
    });

    // 3. Consistency Check & Normalization Phase
    steps.push({
        stepId: stepCounter++,
        description: `Consistency Check Phase for Crack ${crack.id + 1}`,
        highlightCrackId: crack.id,
        currentFieldState: computeCombinedField(fieldAccumulator)
    });

    nodes.forEach(n => {
        const connectedParticleIds = nodeToParticles[n.id];
        if (connectedParticleIds.length === 0) return;

        // Collect fields seen by this node from connected particles FOR CURRENT CRACK
        // We only look at fieldAccumulator[key][crackIdx] because the consistency check is per-crack.
        const seenFields = new Set<number>();
        connectedParticleIds.forEach(pid => {
            const val = fieldAccumulator[`${n.id}-${pid}`][crackIdx];
            seenFields.add(val);
        });
        
        // Ensure numeric sort for correct comparison [1, 2] vs [1, 3]
        const sortedFields = Array.from(seenFields).sort((a, b) => a - b);

        const step: SimulationStep = {
            stepId: stepCounter++,
            description: `Node ${n.id} sees fields: [${sortedFields.join(', ')}]`,
            highlightNodeId: n.id,
            consistencyNodeId: n.id,
            consistencyFields: sortedFields,
            currentFieldState: computeCombinedField(fieldAccumulator)
        };
        
        // Only push step if it's interesting (more than just field 1) or to be thorough
        // We'll push it to be thorough as requested ("step by step debug")
        steps.push(step);

        if (sortedFields.length === 3) {
            steps.push({
                stepId: stepCounter++,
                description: `WARNING: Node ${n.id} sees all 3 fields!`,
                highlightNodeId: n.id,
                consistencyNodeId: n.id,
                consistencyFields: sortedFields,
                currentFieldState: computeCombinedField(fieldAccumulator)
            });
        }

        if (sortedFields.length === 2) {
            let remapFrom = -1;
            let remapTo = -1;

            if (sortedFields.includes(1) && sortedFields.includes(2)) {
                remapFrom = 1; remapTo = 3;
            } 
            else if (sortedFields.includes(1) && sortedFields.includes(3)) {
                remapFrom = 1; remapTo = 2;
            }

            if (remapFrom !== -1) {
                connectedParticleIds.forEach(pid => {
                    const key = `${n.id}-${pid}`;
                    if (fieldAccumulator[key][crackIdx] === remapFrom) {
                        fieldAccumulator[key][crackIdx] = remapTo;
                    }
                });

                steps.push({
                    stepId: stepCounter++,
                    description: `Normalizing Node ${n.id}: Remapping Field ${remapFrom} -> ${remapTo}`,
                    highlightNodeId: n.id,
                    consistencyNodeId: n.id,
                    consistencyFields: sortedFields,
                    normalizationAction: `${remapFrom}->${remapTo}`,
                    currentFieldState: computeCombinedField(fieldAccumulator)
                });
            }
        }
    });
  });

  steps.push({
    stepId: stepCounter++,
    description: "Computation Complete. Final fields shown.",
    currentFieldState: computeCombinedField(fieldAccumulator)
  });

  return steps;
};

// Presets
export const presets = {
  case1: {
    nodes: [
      { id: 0, x: 2, y: 2 }, { id: 1, x: 8, y: 2 },
      { id: 2, x: 2, y: 8 }, { id: 3, x: 8, y: 8 }
    ],
    particles: [
      { id: 0, x: 5, y: 4 }, // Below
      { id: 1, x: 5, y: 6 }  // Above
    ],
    cracks: [
      { id: 0, points: [{ x: 1, y: 5 }, { x: 9, y: 5 }] }
    ]
  },
  case2: {
    nodes: [
      { id: 0, x: 2, y: 2 }, { id: 1, x: 5, y: 2 }, { id: 2, x: 8, y: 2 },
      { id: 3, x: 2, y: 5 }, { id: 4, x: 5, y: 5 }, { id: 5, x: 8, y: 5 },
      { id: 6, x: 2, y: 8 }, { id: 7, x: 5, y: 8 }, { id: 8, x: 8, y: 8 }
    ],
    particles: [
      { id: 0, x: 3.5, y: 3.5 }, { id: 1, x: 6.5, y: 3.5 },
      { id: 2, x: 3.5, y: 6.5 }, { id: 3, x: 6.5, y: 6.5 }
    ],
    cracks: [
      { id: 0, points: [{ x: 1, y: 1 }, { x: 9, y: 9 }] }
    ]
  },
  case3: { // Two Cracks
    nodes: [
      { id: 0, x: 2, y: 2 }, { id: 1, x: 5, y: 2 }, { id: 2, x: 8, y: 2 },
      { id: 3, x: 2, y: 5 }, { id: 4, x: 5, y: 5 }, { id: 5, x: 8, y: 5 },
      { id: 6, x: 2, y: 8 }, { id: 7, x: 5, y: 8 }, { id: 8, x: 8, y: 8 }
    ],
    particles: [
      { id: 0, x: 3.5, y: 3.5 }, { id: 1, x: 6.5, y: 3.5 },
      { id: 2, x: 3.5, y: 6.5 }, { id: 3, x: 6.5, y: 6.5 }
    ],
    cracks: [
      { id: 0, points: [{ x: 0, y: 5 }, { x: 10, y: 5 }] }, // Horizontal
      { id: 1, points: [{ x: 5, y: 0 }, { x: 5, y: 10 }] }  // Vertical
    ]
  }
}
