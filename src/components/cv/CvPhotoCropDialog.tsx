'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CvPhotoCrop } from '@/types/cv';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  initialCrop?: CvPhotoCrop | undefined;
  onSave: (crop: CvPhotoCrop) => void | Promise<void>;
};

export default function CvPhotoCropDialog({
  open,
  onOpenChange,
  imageSrc,
  initialCrop,
  onSave,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!open) return;
    setZoom(initialCrop?.zoom ?? 1);
    setCrop({ x: 0, y: 0 });
    setCroppedArea(null);
  }, [open, imageSrc, initialCrop?.zoom]);

  const onCropComplete = useCallback((_z: Area, area: Area) => {
    setCroppedArea(area);
  }, []);

  const handleSave = async () => {
    const area = croppedArea ?? { x: 0, y: 0, width: 100, height: 100 };
    const next: CvPhotoCrop = {
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      zoom,
    };
    await onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Foto uitsnede</DialogTitle>
        </DialogHeader>
        {imageSrc ? (
          <>
            <div className="relative mx-auto h-72 w-full max-w-sm overflow-hidden rounded-lg bg-neutral-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                initialCroppedAreaPercentages={
                  initialCrop &&
                  initialCrop.width > 0 &&
                  initialCrop.height > 0
                    ? {
                        x: initialCrop.x,
                        y: initialCrop.y,
                        width: initialCrop.width,
                        height: initialCrop.height,
                      }
                    : undefined
                }
              />
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-muted-foreground">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer accent-[#00A3CC]"
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Geen afbeelding geladen.</p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="button" onClick={handleSave} disabled={!imageSrc}>
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
