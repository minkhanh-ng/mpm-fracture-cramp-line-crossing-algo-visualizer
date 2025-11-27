
import React from 'react';
import { SimulationStep } from '../types';

interface DebuggerPanelProps {
  step: SimulationStep;
  totalSteps: number;
}

const DebuggerPanel: React.FC<DebuggerPanelProps> = ({ step, totalSteps }) => {
  
  const getLineClass = (lineKey: string) => {
    if (step.description.includes("Initialization") && lineKey === 'init') return "bg-blue-900/50 text-blue-100";
    if (step.highlightSegmentIndex !== undefined) {
        if (lineKey === 'loop') return "bg-blue-900/50 text-blue-100";
        if (lineKey === 'check') return "bg-blue-900/50 text-blue-100";
        if (step.crossingResult === 2 && lineKey === 'inc2') return "bg-green-900/50 text-green-100";
        if (step.crossingResult === 3 && lineKey === 'inc3') return "bg-green-900/50 text-green-100";
    }
    
    // Cancellation
    if (step.description.includes("Result Node")) return "bg-yellow-900/50 text-yellow-100";

    // Consistency check lines
    if (step.consistencyNodeId !== undefined && lineKey === 'consistency_loop') return "bg-blue-900/50 text-blue-100";
    if (step.consistencyFields?.length === 3 && lineKey === 'warn') return "bg-red-900/50 text-red-100";
    if (step.normalizationAction && lineKey === 'norm') return "bg-purple-900/50 text-purple-100";

    return "text-gray-400";
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Debugger</h2>
        <div className="flex justify-between items-center mt-2">
           <span className="text-xs text-slate-500">Step {step.stepId + 1} / {totalSteps}</span>
           <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-white truncate max-w-[200px]" title={step.description}>
             {step.description}
           </span>
        </div>
      </div>

      {/* Variables View */}
      <div className="p-4 border-b border-slate-700 space-y-4 overflow-y-auto max-h-[40%]">
        <h3 className="text-xs font-bold text-slate-500 mb-2">VARIABLES</h3>
        
        {step.segmentCounts ? (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-2">
             <div className="p-2 bg-slate-800 rounded">
                <span className="text-amber-400 block mb-1">Field 2 Count (Above)</span>
                <span className="text-xl font-bold">{step.segmentCounts.f2}</span>
             </div>
             <div className="p-2 bg-slate-800 rounded">
                <span className="text-violet-400 block mb-1">Field 3 Count (Below)</span>
                <span className="text-xl font-bold">{step.segmentCounts.f3}</span>
             </div>
          </div>
        ) : null}

        {step.areas ? (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 bg-slate-800 rounded">
              <span className="text-red-400 block mb-1">Area 1</span>
              <span className={step.areas.area1 < 0 ? "text-yellow-400" : "text-slate-300"}>
                {step.areas.area1.toFixed(1)}
              </span>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <span className="text-green-400 block mb-1">Area 2</span>
              <span className={step.areas.area2 < 0 ? "text-yellow-400" : "text-slate-300"}>
                {step.areas.area2.toFixed(1)}
              </span>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <span className="text-blue-400 block mb-1">Area 3</span>
              <span className={step.areas.area3 < 0 ? "text-yellow-400" : "text-slate-300"}>
                {step.areas.area3.toFixed(1)}
              </span>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <span className="text-purple-400 block mb-1">Area 4</span>
              <span className={step.areas.area4 < 0 ? "text-yellow-400" : "text-slate-300"}>
                {step.areas.area4.toFixed(1)}
              </span>
            </div>
          </div>
        ) : step.consistencyNodeId !== undefined ? (
          <div className="text-xs font-mono">
            <div className="p-2 bg-slate-800 rounded mb-2">
               <span className="text-slate-400 block mb-1">Checking Node</span>
               <span className="text-white font-bold">Node {step.consistencyNodeId}</span>
            </div>
            <div className="p-2 bg-slate-800 rounded mb-2">
               <span className="text-slate-400 block mb-1">Fields Seen</span>
               <div className="flex gap-1 flex-wrap">
                 {step.consistencyFields?.map(f => (
                   <span key={f} className={`px-2 py-1 rounded text-xs font-bold bg-slate-700 text-slate-300`}>
                     {f}
                   </span>
                 ))}
               </div>
            </div>
          </div>
        ) : null}

        {step.crossingResult !== undefined && (
          <div className="p-2 bg-slate-800 rounded text-center">
            <span className="text-xs text-slate-400 block">Current Result</span>
            <span className={`font-bold text-lg ${
              step.crossingResult === 0 ? 'text-gray-400' : 
              step.crossingResult === 2 ? 'text-amber-400' : 'text-violet-400'
            }`}>
              {step.crossingResult === 0 ? 'NONE' : 
               step.crossingResult === 2 ? 'ABOVE (2)' : 'BELOW (3)'}
            </span>
          </div>
        )}
      </div>

      {/* Code View */}
      <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-xs leading-6">
        <div className={getLineClass('init')}>field_split = ones(nodes, particles)</div>
        <div className="text-gray-600">for crack in cracks:</div>
        
        <div className={`pl-4 ${getLineClass('loop')}`}>for seg in crack.segments:</div>
        <div className={`pl-8 ${getLineClass('check')}`}>res = check_crossing(seg)</div>
        <div className={`pl-8 ${getLineClass('inc2')}`}>if res == 2: f2++</div>
        <div className={`pl-8 ${getLineClass('inc3')}`}>elif res == 3: f3++</div>

        <div className="text-gray-600 pl-4 mt-2"># Cancellation</div>
        <div className={step.description.includes("Result") ? "bg-yellow-900/50 text-yellow-100 pl-4" : "text-gray-600 pl-4"}>
           if f2 > 0 and f3 > 0: min...
           <br/>if f2 % 2 == 1: field = 2
           <br/>elif f3 % 2 == 1: field = 3
        </div>

        <div className="text-gray-600 pl-4 mt-4"># Consistency Check</div>
        <div className={`pl-8 ${getLineClass('consistency_loop')}`}>
           fields = unique(node_particles)
        </div>
        <div className={`pl-8 ${getLineClass('warn')}`}>
           if len(fields) == 3: warning
        </div>
        <div className={`pl-8 ${getLineClass('norm')}`}>
           remap fields [1, 2] -> [3, 2]
        </div>

      </div>

    </div>
  );
};

export default DebuggerPanel;
