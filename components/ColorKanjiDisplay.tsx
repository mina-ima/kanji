
import React, { useEffect, useState } from 'react';

interface ColorKanjiDisplayProps {
  character: string;
  className?: string;
}

const STROKE_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
];

const ColorKanjiDisplay: React.FC<ColorKanjiDisplayProps> = ({ character, className }) => {
  const [paths, setPaths] = useState<string[]>([]);
  
  useEffect(() => {
    if (!character) return;
    
    const fetchKanjiData = async () => {
      try {
        const code = character.charCodeAt(0).toString(16).toLowerCase().padStart(5, '0');
        const url = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Kanji data not found');
        
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        // Select all paths ensuring we don't pick up structural groups
        const pathElements = Array.from(doc.querySelectorAll('path'))
            .filter(p => !p.getAttribute('id')?.includes('kvg:'));
        
        setPaths(pathElements.map(p => p.getAttribute('d') || ''));
      } catch (e) {
        setPaths([]); // Fallback
      }
    };

    fetchKanjiData();
  }, [character]);

  // Fallback to font display if no paths
  if (paths.length === 0) {
    return <div className={`font-yuji flex items-center justify-center text-slate-800 ${className}`} style={{fontSize: '8rem'}}>{character}</div>;
  }

  return (
    <svg viewBox="0 0 109 109" className={className}>
      <g>
        {paths.map((d, i) => (
             <path key={`bg-${i}`} d={d} stroke="#e2e8f0" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
      <g>
         {paths.map((d, i) => (
             <path key={`fg-${i}`} d={d} stroke={STROKE_COLORS[i % STROKE_COLORS.length]} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  );
};

export default ColorKanjiDisplay;
