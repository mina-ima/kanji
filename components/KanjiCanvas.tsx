import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface KanjiCanvasProps {
  onDraw: () => void;
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
  guideCharacter?: string; // New prop for the guide character
}

export interface KanjiCanvasRef {
  clear: () => void;
  getCanvasData: () => string | null;
  isCanvasEmpty: () => boolean;
}

const KanjiCanvas = forwardRef<KanjiCanvasRef, KanjiCanvasProps>(({ onDraw, onStrokeStart, onStrokeEnd, guideCharacter }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Initialize Drawing Canvas and Guide Canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const guideCanvas = guideCanvasRef.current;

    if (container && canvas && guideCanvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      // Use the container's size. Assumes container is constrained by CSS.
      const rect = container.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * ratio;

      // Set dimensions for both canvases
      canvas.width = size;
      canvas.height = size;
      guideCanvas.width = size;
      guideCanvas.height = size;

      // Initialize drawing context
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio); // Scale context to match device pixel ratio
        
        // Re-setting width clears context, so set styles after
        ctx.strokeStyle = '#1e293b'; // slate-800
        ctx.fillStyle = '#1e293b';
        ctx.lineWidth = 5; // Base line width
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
      }
    }
  }, []); // Run once on mount

  // Draw Guide Character and Grid
  useEffect(() => {
    const guideCanvas = guideCanvasRef.current;
    if (guideCanvas) {
      const ctx = guideCanvas.getContext('2d');
      if (ctx) {
        const width = guideCanvas.width;
        const height = guideCanvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // --- Draw Grid (Masu) ---
        ctx.save();
        ctx.strokeStyle = '#cbd5e1'; // slate-300
        // Responsive styling based on canvas width
        ctx.lineWidth = Math.max(1, width * 0.005); 
        ctx.setLineDash([width * 0.02, width * 0.02]); 
        
        // Vertical center line
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
        
        // Horizontal center line
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        ctx.restore();
        // ------------------------

        // --- Draw Guide Character ---
        if (guideCharacter) {
            ctx.save();
            // Use a font that is available.
            ctx.font = `${width * 0.8}px 'Mochiy Pop One', 'Noto Sans JP', sans-serif`;
            ctx.fillStyle = '#e2e8f0'; // slate-200 (Very light gray)
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Center text with slight offset adjustment
            ctx.fillText(guideCharacter, width / 2, height / 2 + (width * 0.05)); 
            
            ctx.restore();
        }
      }
    }
  }, [guideCharacter]); // Re-run when guide character changes

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    getCanvasData: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      
      // Create a temporary canvas to flatten the image with a WHITE background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // 1. Fill with white
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 2. Draw the user's strokes on top
        tempCtx.drawImage(canvas, 0, 0);
        
        // 3. Export as JPEG
        return tempCanvas.toDataURL('image/jpeg', 0.9);
      }
      return null;
    },
    isCanvasEmpty: () => {
      const canvas = canvasRef.current;
      if (!canvas) return true;
      return false; 
    }
  }));

  const startDrawing = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (event.cancelable && event.type !== 'mousedown') event.preventDefault(); 
    if (onStrokeStart) onStrokeStart();
    
    const { offsetX, offsetY } = getCoordinates(event);
    if (context) {
      setIsDrawing(true);
      lastPos.current = { x: offsetX, y: offsetY };

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const scaledX = offsetX * ratio;
      const scaledY = offsetY * ratio;

      context.lineWidth = 5 * ratio;
      
      context.beginPath();
      context.arc(scaledX, scaledY, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      
      context.beginPath();
      context.moveTo(scaledX, scaledY);
      
      lastPos.current = { x: scaledX, y: scaledY };
    }
  };

  const draw = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || !context || !lastPos.current) return;
    if (event.cancelable) event.preventDefault();
    
    const { offsetX, offsetY } = getCoordinates(event);
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const scaledX = offsetX * ratio;
    const scaledY = offsetY * ratio;
    
    context.beginPath();
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(scaledX, scaledY);
    context.stroke();
    
    lastPos.current = { x: scaledX, y: scaledY };
  };

  const stopDrawing = () => {
    if (isDrawing) {
        setIsDrawing(false);
        lastPos.current = null;
        onDraw();
        if (onStrokeEnd) onStrokeEnd();
    }
  };

  const getCoordinates = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return { offsetX: 0, offsetY: 0 };
    
    const rect = container.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in event) {
        const touch = (event as unknown as React.TouchEvent).touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        const mouseEvent = event as unknown as React.MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
    }
    
    return {
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top
    };
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full touch-none select-none cursor-crosshair bg-white rounded-xl border-4 border-slate-200 shadow-inner"
        style={{ aspectRatio: '1/1' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
    >
        {/* Guide Canvas (Background) */}
        <canvas 
            ref={guideCanvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
        {/* Drawing Canvas (Foreground) */}
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full"
        />
    </div>
  );
});

KanjiCanvas.displayName = "KanjiCanvas";

export default KanjiCanvas;