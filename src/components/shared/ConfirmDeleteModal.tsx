"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ConfirmDeleteModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  open,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verwijdering bevestigen</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Weet u zeker dat u dit item wilt verwijderen?
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Verwijderen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
