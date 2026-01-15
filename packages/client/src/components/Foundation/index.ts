export {
  FoundationArea,
  type FoundationAreaProps,
  type Suit,
  type CardOwnershipMap,
} from './FoundationArea';

// Re-export FoundationPile from shared for convenience
export type { FoundationPile } from '@heyhey/shared';

export {
  MultiFoundationArea,
  type MultiFoundationAreaProps,
  type PlayerFoundationGroup,
  type OpponentMove,
} from './MultiFoundationArea';
