import type { PlayerColor } from '../Card/CardBack';
import styles from './ColorSelector.module.css';

export interface ColorSelectorProps {
  value: PlayerColor;
  onChange: (color: PlayerColor) => void;
  disabledColors?: PlayerColor[];
  label?: string;
}

const COLORS: PlayerColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'teal',
];

const COLOR_VALUES: Record<PlayerColor, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  purple: '#9333ea',
  orange: '#ea580c',
  pink: '#db2777',
  teal: '#0891b2',
};

export function ColorSelector({
  value,
  onChange,
  disabledColors = [],
  label = 'Deck Color',
}: ColorSelectorProps) {
  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.grid}>
        {COLORS.map((color) => {
          const isSelected = value === color;
          const isDisabled = disabledColors.includes(color);

          return (
            <button
              key={color}
              type="button"
              className={`${styles.swatch} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
              style={{ backgroundColor: COLOR_VALUES[color] }}
              onClick={() => !isDisabled && onChange(color)}
              disabled={isDisabled}
              title={isDisabled ? `${color} is taken` : color}
              aria-label={`Select ${color} color`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <svg className={styles.checkmark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
