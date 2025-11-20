
import React, { useEffect, useState } from 'react';

interface ColorKanjiDisplayProps {
  character: string;
  className?: string;
}

interface StrokeData {
  d: string;
  transform: string;
  label: string;
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
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  
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
        
        // KanjiVG structure usually has <path> for strokes and <text> for numbers.
        // They correspond by index (1st path is 1st stroke, 1st text is number "1").
        const pathElements = Array.from(doc.querySelectorAll('path[d]'));
        const textElements = Array.from(doc.querySelectorAll('text'));

        const combinedData: StrokeData[] = pathElements.map((path, i) => ({
          d: path.getAttribute('d') || '',
          // Get transform from corresponding text element, or empty if missing
          transform: textElements[i]?.getAttribute('transform') || '',
          // Get text content (number), or empty if missing
          label: textElements[i]?.textContent || '',
        }));
        
        setStrokes(combinedData);
      } catch (e) {
        console.error("Failed to load kanji SVG:", e);
        setStrokes([]); // Fallback
      }
    };

    fetchKanjiData();
  }, [character]);

  // Fallback to font display if no paths
  if (strokes.length === 0) {
    return <div className={`font-klee flex items-center justify-center text-slate-800 ${className}`} style={{fontSize: '8rem'}}>{character}</div>;
  }

  return (
    <svg viewBox="0 0 109 109" className={className}>
      {/* Background Strokes (Guide) */}
      <g>
        {strokes.map((s, i) => (
             <path key={`bg-${i}`} d={s.d} stroke="#e2e8f0" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
      
      {/* Colored Foreground Strokes */}
      <g>
         {strokes.map((s, i) => (
             <path 
                key={`fg-${i}`} 
                d={s.d} 
                stroke={STROKE_COLORS[i % STROKE_COLORS.length]} 
                strokeWidth="5" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
        ))}
      </g>

      {/* Stroke Numbers */}
      <g>
        {strokes.map((s, i) => (
            s.label && (
                <text
                    key={`num-${i}`}
                    transform={s.transform}
                    fill={STROKE_COLORS[i % STROKE_COLORS.length]}
                    fontSize="8"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                >
                    {s.label}
                </text>
            )
        ))}
      </g>
    </svg>
  );
};

export default ColorKanjiDisplay;
