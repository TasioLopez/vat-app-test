'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  saving?: boolean;
}

export default function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  saving = false,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Niet-opgeslagen wijzigingen</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Er zijn niet-opgeslagen wijzigingen. Wil je ze opslaan of doorgaan zonder op te slaan?
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuleren
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={saving}
          >
            Doorgaan zonder opslaan
          </Button>
          <Button
            onClick={() => onSave()}
            disabled={saving}
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
