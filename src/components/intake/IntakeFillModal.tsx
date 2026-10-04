'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
};

/** Shown when Invullen cannot run because no intakeformulier is uploaded. */
export function IntakeFillModal({
  isOpen,
  onClose,
  message = 'Er is geen intakeformulier-document gevonden bij deze werknemer. Upload eerst een intakeformulier bij de documenten.',
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Geen intakeformulier"
      size="sm"
      footer={<Button onClick={onClose}>Sluiten</Button>}
    >
      <p className="text-sm text-gray-700">{message}</p>
    </Modal>
  );
}
