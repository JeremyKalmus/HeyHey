import styles from './Card.module.css';

export type PlayerColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'teal';

export interface CardBackProps {
  color: PlayerColor;
  className?: string;
}

function getColorClass(color: PlayerColor): string {
  switch (color) {
    case 'red': return styles.cardBackRed ?? '';
    case 'blue': return styles.cardBackBlue ?? '';
    case 'green': return styles.cardBackGreen ?? '';
    case 'yellow': return styles.cardBackYellow ?? '';
    case 'purple': return styles.cardBackPurple ?? '';
    case 'orange': return styles.cardBackOrange ?? '';
    case 'pink': return styles.cardBackPink ?? '';
    case 'teal': return styles.cardBackTeal ?? '';
  }
}

export function CardBack({ color, className }: CardBackProps) {
  const colorClass = getColorClass(color);

  return (
    <div className={`${styles.cardBack} ${colorClass} ${className ?? ''}`}>
      <div className={styles.cardBackPattern} />
    </div>
  );
}

export default CardBack;
