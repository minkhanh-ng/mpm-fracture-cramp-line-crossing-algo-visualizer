
export interface Point {
  x: number;
  y: number;
}

export interface Node extends Point {
  id: number;
}

export interface Particle extends Point {
  id: number;
}

export interface Crack {
  id: number;
  points: Point[]; // Ordered list of points forming the path
}

export enum FieldType {
  NONE = 1,
  ABOVE = 2,
  BELOW = 3
}

// Represents a single step in the algorithm execution for debugging
export interface SimulationStep {
  stepId: number;
  description: string;
  highlightNodeId?: number;
  highlightParticleId?: number;
  highlightCrackId?: number;
  
  // Multi-segment specific
  highlightSegmentIndex?: number; // Index of the segment being checked (0 means points[0] -> points[1])
  segmentCounts?: { f2: number; f3: number }; // Current accumulation
  
  // For visualizing the math
  triangleA?: Point[]; // Triangle (P, N, CrackStart)
  triangleB?: Point[]; // Triangle (P, N, CrackEnd)
  triangleC?: Point[]; // Triangle (CrackStart, CrackEnd, P)
  triangleD?: Point[]; // Triangle (CrackStart, CrackEnd, N)
  
  areas?: {
    area1: number;
    area2: number;
    area3: number;
    area4: number;
  };
  
  crossingResult?: number; // 0, 2, or 3
  
  // Consistency check specific data
  consistencyNodeId?: number;
  consistencyFields?: number[]; // The set of unique fields seen by the node
  normalizationAction?: string; // e.g., "1->3"
  
  // The state of the field matrix at this step
  currentFieldState: Record<string, number>; // key: "nodeId-particleId" -> field
}

export interface SimulationState {
  nodes: Node[];
  particles: Particle[];
  cracks: Crack[];
}
