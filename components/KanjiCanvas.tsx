
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface KanjiCanvasProps {
  onDraw: () => void;
}

export interface KanjiCanvasRef {
  clear: () => void;
  getCanvasData: () => string | null;
  isCanvasEmpty: () => boolean;
}

const KanjiCanvas = forwardRef<KanjiCanvasRef, KanjiCanvasProps>(({ onDraw }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      // Set internal resolution to match display size * pixel ratio
      // Use the larger dimension to keep it square internally if aspect ratio is slightly off
      const size = Math.max(canvas.offsetWidth, canvas.offsetHeight) * ratio;
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e293b'; // slate-800 (Dark ballpoint ink)
        ctx.fillStyle = '#1e293b';   // Match fill for dots
        ctx.lineWidth = 5 * ratio;     // Medium thickness (Sign pen / Gel pen style)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setContext(ctx);
      }
    }
  }, []);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (event.cancelable) event.preventDefault();
    
    const { offsetX, offsetY } = getCoordinates(event);
    if (context) {
      setIsDrawing(true);
      lastPos.current = { x: offsetX, y: offsetY };

      // Draw a dot for the initial touch/click to mimic a ballpoint pen touching paper
      context.beginPath();
      context.arc(offsetX, offsetY, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
      
      // Prepare path for movement
      context.beginPath();
      context.moveTo(offsetX, offsetY);
    }
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context || !lastPos.current) return;
    if (event.cancelable) event.preventDefault();
    
    const { offsetX, offsetY } = getCoordinates(event);
    
    // Draw segment from last position to current position
    // This prevents "stacking" of strokes and ensures uniform width regardless of direction
    context.beginPath();
    context.moveTo(lastPos.current.x, lastPos.current.y);
    context.lineTo(offsetX, offsetY);
    context.stroke();
    
    lastPos.current = { x: offsetX, y: offsetY };
  };

  const stopDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    lastPos.current = null;
    onDraw();
  };

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in event) {
        const touch = (event as unknown as React.TouchEvent).touches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        const mouse = event as unknown as React.MouseEvent;
        clientX = mouse.clientX;
        clientY = mouse.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Map display coordinates to internal canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        offsetX: x * scaleX,
        offsetY: y * scaleY
    };
  }

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (context && canvasRef.current) {
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
    getCanvasData: () => {
        const canvas = canvasRef.current;
        if (!canvas || isCanvasEmpty()) return null;
        return canvas.toDataURL('image/png');
    },
    isCanvasEmpty: isCanvasEmpty,
  }));
  
  const isCanvasEmpty = (): boolean => {
    const canvas = canvasRef.current;
    if (!context || !canvas) return true;
    const pixelBuffer = new Uint32Array(
      context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  };


  return (
    <div className="w-full aspect-square bg-white rounded-2xl shadow-lg p-2 relative">
      <div className="absolute inset-2 pointer-events-none">
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -translate-y-1/2"></div>
        {/* Vertical line */}
        <div className="absolute top-0 left-1/2 h-full w-[2px] bg-gray-200 -translate-x-1/2"></div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
});

export default KanjiCanvas;
