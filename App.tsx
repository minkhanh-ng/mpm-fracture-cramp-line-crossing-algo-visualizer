
import React, { useState, useEffect, useMemo } from 'react';
import { Node, Particle, Crack, SimulationStep, Point } from './types';
import { generateSimulationSteps, presets } from './utils';
import Visualizer from './components/Visualizer';
import DebuggerPanel from './components/DebuggerPanel';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Box } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<Node[]>(presets.case1.nodes);
  const [particles, setParticles] = useState<Particle[]>(presets.case1.particles);
  const [cracks, setCracks] = useState<Crack[]>(presets.case1.cracks);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);

  const simulationSteps: SimulationStep[] = useMemo(() => {
    return generateSimulationSteps(nodes, particles, cracks);
  }, [nodes, particles, cracks]);

  useEffect(() => {
    if (currentStepIndex >= simulationSteps.length) {
      setCurrentStepIndex(Math.max(0, simulationSteps.length - 1));
    }
  }, [simulationSteps, currentStepIndex]);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < simulationSteps.length - 1) return prev + 1;
          setIsPlaying(false);
          return prev;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, simulationSteps.length]);

  const handleUpdateNode = (id: number, pos: Point) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...pos } : n));
  };

  const handleUpdateParticle = (id: number, pos: Point) => {
    setParticles(prev => prev.map(p => p.id === id ? { ...p, ...pos } : p));
  };

  // Handle updating a specific point in a crack polyline
  const handleUpdateCrack = (id: number, pointIdx: number, pos: Point) => {
    setCracks(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newPoints = [...c.points];
      newPoints[pointIdx] = pos;
      return { ...c, points: newPoints };
    }));
  };

  // Handle splitting a crack segment by adding a point
  const handleSplitCrack = (id: number, segmentIdx: number, pos: Point) => {
    setCracks(prev => prev.map(c => {
        if (c.id !== id) return c;
        const newPoints = [...c.points];
        newPoints.splice(segmentIdx + 1, 0, pos);
        return { ...c, points: newPoints };
    }));
  };

  const loadPreset = (key: keyof typeof presets) => {
    setNodes(presets[key].nodes);
    setParticles(presets[key].particles);
    setCracks(presets[key].cracks);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const currentStep = simulationSteps[currentStepIndex] || simulationSteps[0];

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-200">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900 justify-between shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
             <Box size={18} className="text-white" />
           </div>
           <div>
             <h1 className="font-bold text-lg leading-tight">MPM Fracture Field</h1>
             <p className="text-xs text-slate-500">Algorithm Visualizer</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
             <button onClick={() => loadPreset('case1')} className="px-3 py-1.5 text-xs font-medium rounded hover:bg-slate-700 transition-colors">Case 1</button>
             <button onClick={() => loadPreset('case2')} className="px-3 py-1.5 text-xs font-medium rounded hover:bg-slate-700 transition-colors">Case 2</button>
             <button onClick={() => loadPreset('case3')} className="px-3 py-1.5 text-xs font-medium rounded hover:bg-slate-700 transition-colors">Case 3 (2 Cracks)</button>
           </div>
           <a href="#" className="text-xs text-blue-400 hover:text-blue-300">View Python Source</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left: Controls & Visualizer */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="flex-1 p-4 bg-slate-950 relative overflow-hidden flex items-center justify-center">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur p-3 rounded border border-slate-700 max-w-xs pointer-events-none">
              <h3 className="text-xs font-bold text-slate-300 mb-1">INTERACTIVE MODE</h3>
              <p className="text-[10px] text-slate-400">
                Drag nodes/particles. Drag crack points. <br/>
                <span className="text-amber-300">Double-click</span> a crack segment to add a point.
              </p>
            </div>
            
            <div className="w-full max-w-[600px] aspect-[6/5]">
               <Visualizer 
                 nodes={nodes}
                 particles={particles}
                 cracks={cracks}
                 currentStep={currentStep}
                 onUpdateNode={handleUpdateNode}
                 onUpdateParticle={handleUpdateParticle}
                 onUpdateCrack={handleUpdateCrack}
                 onSplitCrack={handleSplitCrack}
               />
            </div>
          </div>
          
          <div className="h-16 border-t border-slate-800 bg-slate-900 flex items-center px-4 gap-6 justify-between shrink-0">
             
             <div className="flex items-center gap-2">
               <button onClick={() => { setIsPlaying(false); setCurrentStepIndex(0); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Reset">
                 <RotateCcw size={16} />
               </button>
               <button onClick={() => { setIsPlaying(false); setCurrentStepIndex(Math.max(0, currentStepIndex - 1)); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                 <SkipBack size={16} />
               </button>
               <button onClick={() => setIsPlaying(!isPlaying)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-sm transition-colors min-w-[90px] justify-center ${isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                 {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Play</>}
               </button>
               <button onClick={() => { setIsPlaying(false); setCurrentStepIndex(Math.min(simulationSteps.length - 1, currentStepIndex + 1)); }} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                 <SkipForward size={16} />
               </button>
             </div>

             <div className="flex-1 flex items-center gap-3">
               <span className="text-xs font-mono text-slate-500 w-8 text-right">{currentStepIndex}</span>
               <input type="range" min="0" max={simulationSteps.length - 1} value={currentStepIndex} onChange={(e) => { setIsPlaying(false); setCurrentStepIndex(parseInt(e.target.value)); }} className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400" />
               <span className="text-xs font-mono text-slate-500 w-8">{simulationSteps.length - 1}</span>
             </div>

             <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
               <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Speed</span>
               <input type="range" min="50" max="1000" step="50" value={1050 - playbackSpeed} onChange={(e) => setPlaybackSpeed(1050 - parseInt(e.target.value))} className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-500 hover:accent-slate-400" />
             </div>
          </div>
        </div>

        <div className="w-96 shrink-0 border-l border-slate-800">
          <DebuggerPanel step={currentStep} totalSteps={simulationSteps.length} />
        </div>

      </main>
    </div>
  );
};

export default App;
