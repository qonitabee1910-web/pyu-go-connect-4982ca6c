import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Paintbrush, 
  Eraser, 
  Type, 
  Smile, 
  RotateCcw, 
  Download, 
  Palette,
  Car as CarIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
interface CanvasElement {
  id: string;
  type: 'text' | 'sticker' | 'accessory';
  content: string;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  rotation?: number;
  scale?: number;
}

const CAR_PARTS = [
  { id: 'body', name: 'Karoseri', color: '#3b82f6' },
  { id: 'roof', name: 'Atap', color: '#3b82f6' },
  { id: 'windows', name: 'Jendela', color: '#93c5fd' },
  { id: 'wheels', name: 'Roda', color: '#1f2937' },
  { id: 'rims', name: 'Velg', color: '#9ca3af' },
  { id: 'headlights', name: 'Lampu Depan', color: '#fef3c7' },
  { id: 'taillights', name: 'Lampu Belakang', color: '#fca5a5' },
  { id: 'bumpers', name: 'Bumper', color: '#4b5563' },
];

const STICKERS = ["🔥", "⭐", "🚀", "⚡", "🏎️", "🏁", "🏆", "❤️"];

export default function CarCanvasBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | 'text' | 'sticker' | 'part-color'>('part-color');
  const [selectedPart, setSelectedPart] = useState(CAR_PARTS[0].id);
  const [partColors, setPartColors] = useState<Record<string, string>>(
    CAR_PARTS.reduce((acc, part) => ({ ...acc, [part.id]: part.color }), {})
  );
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Drawing the Car Template
  const drawCarTemplate = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const carWidth = w * 0.7;
    const carHeight = h * 0.3;

    ctx.save();
    ctx.translate(centerX - carWidth / 2, centerY - carHeight / 4);

    // 1. Body Lower
    ctx.fillStyle = partColors['body'];
    ctx.beginPath();
    ctx.roundRect(0, carHeight * 0.4, carWidth, carHeight * 0.4, 20);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Body Upper (Roof & Pillars)
    ctx.fillStyle = partColors['roof'];
    ctx.beginPath();
    ctx.moveTo(carWidth * 0.2, carHeight * 0.4);
    ctx.lineTo(carWidth * 0.3, 0);
    ctx.lineTo(carWidth * 0.7, 0);
    ctx.lineTo(carWidth * 0.85, carHeight * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Windows
    ctx.fillStyle = partColors['windows'];
    // Front Window
    ctx.beginPath();
    ctx.moveTo(carWidth * 0.25, carHeight * 0.35);
    ctx.lineTo(carWidth * 0.32, carHeight * 0.05);
    ctx.lineTo(carWidth * 0.5, carHeight * 0.05);
    ctx.lineTo(carWidth * 0.5, carHeight * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Back Window
    ctx.beginPath();
    ctx.moveTo(carWidth * 0.52, carHeight * 0.05);
    ctx.lineTo(carWidth * 0.7, carHeight * 0.05);
    ctx.lineTo(carWidth * 0.8, carHeight * 0.35);
    ctx.lineTo(carWidth * 0.52, carHeight * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Wheels & Rims
    const drawWheel = (x: number, y: number) => {
      // Outer Tire
      ctx.fillStyle = partColors['wheels'];
      ctx.beginPath();
      ctx.arc(x, y, carHeight * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Rim
      ctx.fillStyle = partColors['rims'];
      ctx.beginPath();
      ctx.arc(x, y, carHeight * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Center
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    };

    drawWheel(carWidth * 0.2, carHeight * 0.8);
    drawWheel(carWidth * 0.8, carHeight * 0.8);

    // 5. Lights
    // Headlight
    ctx.fillStyle = partColors['headlights'];
    ctx.beginPath();
    ctx.ellipse(carWidth - 10, carHeight * 0.5, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Taillight
    ctx.fillStyle = partColors['taillights'];
    ctx.beginPath();
    ctx.roundRect(0, carHeight * 0.5, 12, 20, 4);
    ctx.fill();
    ctx.stroke();

    // 6. Bumpers
    ctx.fillStyle = partColors['bumpers'];
    ctx.beginPath();
    ctx.roundRect(-5, carHeight * 0.7, carWidth * 0.15, 10, 5);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(carWidth - carWidth * 0.1, carHeight * 0.7, carWidth * 0.15, 10, 5);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [partColors]);

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Grid (Decorative)
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw Car
    drawCarTemplate(ctx);

    // Draw Elements (Text, Stickers)
    elements.forEach(el => {
      ctx.save();
      ctx.translate(el.x, el.y);
      ctx.rotate((el.rotation || 0) * Math.PI / 180);
      ctx.scale(el.scale || 1, el.scale || 1);

      if (el.type === 'text') {
        ctx.font = `${el.fontSize || 20}px bold sans-serif`;
        ctx.fillStyle = el.color || '#000';
        ctx.textAlign = 'center';
        ctx.fillText(el.content, 0, 0);
      } else if (el.type === 'sticker') {
        ctx.font = '40px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.content, 0, 0);
      }
      ctx.restore();
    });
  }, [drawCarTemplate, elements]);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        // Backup current drawing if any? Raw canvas loses data on resize
        // For simplicity, we just resize. In a real app we'd use an offscreen canvas.
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        renderAll();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [renderAll]);

  // Effect to re-render when state changes
  useEffect(() => {
    renderAll();
  }, [renderAll]);

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'draw' || activeTool === 'erase') {
      setIsDrawing(true);
      setLastPos({ x, y });
    } else {
      // Check if clicking on an element (simple hit detection)
      const clickedElement = [...elements].reverse().find(el => {
        const dx = x - el.x;
        const dy = y - el.y;
        return Math.sqrt(dx * dx + dy * dy) < 30; // 30px radius hit area
      });

      if (clickedElement) {
        setDraggedElementId(clickedElement.id);
        setLastPos({ x, y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDrawing) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = activeTool === 'erase' ? '#ffffff' : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.stroke();
      setLastPos({ x, y });
    } else if (draggedElementId) {
      setElements(prev => prev.map(el => 
        el.id === draggedElementId 
          ? { ...el, x, y } 
          : el
      ));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDraggedElementId(null);
  };

  const addText = () => {
    const text = prompt("Masukkan teks:");
    if (!text) return;
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'text',
      content: text,
      x: canvasRef.current!.width / 2,
      y: 50,
      color: brushColor,
      fontSize: 24
    };
    setElements([...elements, newElement]);
  };

  const addSticker = (emoji: string) => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'sticker',
      content: emoji,
      x: canvasRef.current!.width / 2,
      y: canvasRef.current!.height / 2,
    };
    setElements([...elements, newElement]);
    toast.success("Stiker ditambahkan! Geser untuk memindahkan.");
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `my-custom-car-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast.success("Gambar berhasil disimpan!");
  };

  const resetCanvas = () => {
    setElements([]);
    setPartColors(CAR_PARTS.reduce((acc, part) => ({ ...acc, [part.id]: part.color }), {}));
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    renderAll();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-4 p-4">
      <div className="flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button 
              variant={activeTool === 'part-color' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTool('part-color')}
              className="h-8 gap-2"
            >
              <CarIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Warna Part</span>
            </Button>
            <Button 
              variant={activeTool === 'draw' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTool('draw')}
              className="h-8 gap-2"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="hidden sm:inline">Gambar</span>
            </Button>
            <Button 
              variant={activeTool === 'text' ? "default" : "ghost"} 
              size="sm" 
              onClick={addText}
              className="h-8 gap-2"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Teks</span>
            </Button>
            <Button 
              variant={activeTool === 'erase' ? "default" : "ghost"} 
              size="sm" 
              onClick={() => setActiveTool('erase')}
              className="h-8 gap-2"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Hapus</span>
            </Button>
          </div>
          
          <div className="h-6 w-px bg-border mx-2" />
          
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Warna</Label>
            <Input 
              type="color" 
              value={activeTool === 'part-color' ? partColors[selectedPart] : brushColor} 
              onChange={(e) => {
                if (activeTool === 'part-color') {
                  setPartColors(prev => ({ ...prev, [selectedPart]: e.target.value }));
                } else {
                  setBrushColor(e.target.value);
                }
              }}
              className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetCanvas} className="h-8 gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="default" size="sm" onClick={saveCanvas} className="h-8 gap-2 bg-primary">
            <Download className="w-4 h-4" />
            Simpan PNG
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-64 flex flex-col gap-4 overflow-y-auto pr-2">
          {activeTool === 'part-color' && (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Bagian Mobil
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-1">
                {CAR_PARTS.map(part => (
                  <button
                    key={part.id}
                    onClick={() => setSelectedPart(part.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors",
                      selectedPart === part.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    <span>{part.name}</span>
                    <div 
                      className="w-4 h-4 rounded-full border border-white/20" 
                      style={{ backgroundColor: partColors[part.id] }}
                    />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Smile className="w-4 h-4" />
                Stiker & Dekorasi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 grid grid-cols-4 gap-2">
              {STICKERS.map(sticker => (
                <button
                  key={sticker}
                  onClick={() => addSticker(sticker)}
                  className="h-10 flex items-center justify-center bg-accent rounded-lg hover:scale-110 transition-transform text-xl"
                >
                  {sticker}
                </button>
              ))}
            </CardContent>
          </Card>

          {activeTool === 'draw' && (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Paintbrush className="w-4 h-4" />
                  Ukuran Kuas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-4">
                  <Input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-6">{brushSize}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 bg-white rounded-2xl border shadow-inner relative overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full cursor-crosshair"
          />
          
          <div className="absolute bottom-4 left-4 flex gap-2">
             <Badge variant="outline" className="bg-white/80 backdrop-blur-sm">
               Interactive Mode: {activeTool.toUpperCase()}
             </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
