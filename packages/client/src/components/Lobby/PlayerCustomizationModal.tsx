import { Modal } from './Modal';
import { PlayerCustomization, type PlayerCustomizationData } from './PlayerCustomization';
import type { PlayerColor } from '../Card/CardBack';

export interface PlayerCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: PlayerCustomizationData;
  onChange: (data: PlayerCustomizationData) => void;
  onSave: () => void;
  disabledColors?: PlayerColor[];
}

export function PlayerCustomizationModal({
  isOpen,
  onClose,
  value,
  onChange,
  onSave,
  disabledColors = [],
}: PlayerCustomizationModalProps) {
  const handleSave = () => {
    if (value.name.trim().length >= 2) {
      onSave();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Player" size="medium">
      <PlayerCustomization
        value={value}
        onChange={onChange}
        disabledColors={disabledColors}
        nameError={value.name.trim().length < 2 ? 'Name must be at least 2 characters' : undefined}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '2px solid var(--color-black)',
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '2px solid var(--color-gray)',
            borderRadius: '4px',
            color: 'var(--color-white)',
            fontFamily: 'var(--font-family-base)',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          CANCEL
        </button>
        <button
          onClick={handleSave}
          disabled={value.name.trim().length < 2}
          style={{
            padding: '8px 16px',
            background: value.name.trim().length >= 2 ? 'var(--arcade-green)' : 'var(--color-gray)',
            border: '2px solid var(--color-black)',
            borderRadius: '4px',
            color: 'var(--color-black)',
            fontFamily: 'var(--font-family-base)',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            cursor: value.name.trim().length >= 2 ? 'pointer' : 'not-allowed',
            boxShadow: '2px 2px 0 var(--color-black)',
          }}
        >
          ✓ SAVE
        </button>
      </div>
    </Modal>
  );
}
