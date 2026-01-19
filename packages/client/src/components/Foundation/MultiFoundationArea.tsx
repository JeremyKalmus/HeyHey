// MultiFoundationArea - Multiplayer Foundation Piles UI Component
// Displays N×4 foundation piles for multiplayer games, grouped by owner

import type { Card as CardType, FoundationPile } from '@heyhey/shared';
import { useState, useEffect, useRef, type ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { Card } from '../Card';
import type { PlayerColor } from '../Card/CardBack';
import {
  Icon,
  SuitHeartIcon,
  SuitDiamondIcon,
  SuitClubIcon,
  SuitSpadeIcon,
} from '../ui/Icon';
import { createDropId } from '../../hooks/useDragAndDrop';
import { soundManager } from '../../audio/SoundManager';
import type { Suit, CardOwnershipMap } from './FoundationArea';
import styles from './MultiFoundationArea.module.css';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const SUIT_ICONS: Record<Suit, ComponentType<LucideProps>> = {
  hearts: SuitHeartIcon,
  diamonds: SuitDiamondIcon,
  clubs: SuitClubIcon,
  spades: SuitSpadeIcon,
};

/**
 * Player foundation group - 4 foundation piles belonging to one player
 */
export interface PlayerFoundationGroup {
  /** Player's unique ID */
  playerId: string;
  /** Player's display name */
  playerName: string;
  /** Player's card back color */
  playerColor: PlayerColor;
  /** The 4 foundation piles for this player */
  piles: FoundationPile[];
}

/** Information about the most recent opponent move for animation */
export interface OpponentMove {
  /** Player who made the move */
  playerId: string;
  /** Index of the foundation pile that received the card */
  foundationIndex: number;
  /** Suit of the foundation pile that received the card */
  suit: Suit;
  /** Rank of the card that was played */
  rank: number;
  /** Timestamp to detect new moves */
  timestamp: number;
  /** Index of the opponent in the layout (for fly-from position calculation) */
  opponentIndex?: number;
  /** Total number of opponents (for fly-from position calculation) */
  totalOpponents?: number;
}

export interface MultiFoundationAreaProps {
  /** Foundation groups organized by player */
  playerGroups: PlayerFoundationGroup[];
  /** Currently selected card (if any) for placement */
  selectedCard?: CardType | null;
  /** Called when a foundation pile is clicked */
  onPileClick?: (playerId: string, suit: Suit, globalIndex: number) => void;
  /** Whether placement is currently allowed */
  canPlace?: boolean;
  /** Map of card ownership for showing who played each card */
  cardOwnership?: CardOwnershipMap;
  /** Whether there are pending unconfirmed moves */
  hasPendingMoves?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether to show valid move destination hints (Easy Mode) */
  showMoveHints?: boolean;
  /** Most recent opponent move (triggers animation) */
  lastOpponentMove?: OpponentMove | null;
  /** Whether to play sounds for opponent moves */
  enableOpponentSounds?: boolean;
  /** Whether a drag is currently in progress */
  isDragging?: boolean;
  /** Foundation indices that are valid drag targets (global indices across all players) */
  validDragFoundations?: number[];
  /** Map of opponent refs for dynamic animation positioning (ADR-009) */
  opponentRefs?: Map<string, HTMLDivElement>;
  /** Ref to the foundation area element for position calculation */
  foundationRef?: React.RefObject<HTMLDivElement>;
}

function makeCardKey(card: CardType): string {
  return `${card.suit}-${card.rank}`;
}

export function MultiFoundationArea({
  playerGroups,
  selectedCard,
  onPileClick,
  canPlace = false,
  cardOwnership,
  hasPendingMoves = false,
  error,
  showMoveHints = false,
  lastOpponentMove,
  enableOpponentSounds = true,
  isDragging = false,
  validDragFoundations = [],
  opponentRefs: _opponentRefs,
  foundationRef: _foundationRef,
}: MultiFoundationAreaProps) {
  // Track which foundation index is animating, when, and what color
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null);
  const [animatingColor, setAnimatingColor] = useState<PlayerColor | null>(null);
  const [animationTimestamp, setAnimationTimestamp] = useState<number>(0);
  const lastMoveTimestamp = useRef<number>(0);
  // Internal ref for foundation area
  const internalFoundationRef = useRef<HTMLDivElement>(null);

  // Handle new opponent moves - trigger simple animation
  useEffect(() => {
    if (!lastOpponentMove) return;
    if (lastOpponentMove.timestamp <= lastMoveTimestamp.current) return;

    // New move detected - find the player's color
    const playerGroup = playerGroups.find(g => g.playerId === lastOpponentMove.playerId);
    const playerColor = playerGroup?.playerColor ?? 'blue';

    console.log('Opponent move detected:', lastOpponentMove.foundationIndex, 'color:', playerColor, lastOpponentMove);
    lastMoveTimestamp.current = lastOpponentMove.timestamp;
    setAnimatingIndex(lastOpponentMove.foundationIndex);
    setAnimatingColor(playerColor);
    setAnimationTimestamp(lastOpponentMove.timestamp);

    // Play sound
    if (enableOpponentSounds) {
      soundManager.play('opponentMove');
    }

    // Clear animation after it completes
    const timer = setTimeout(() => {
      setAnimatingIndex(null);
      setAnimatingColor(null);
    }, 800);

    return () => clearTimeout(timer);
  }, [lastOpponentMove, enableOpponentSounds, playerGroups]);

  // Get owner color for a card
  const getOwnerColor = (card: CardType): PlayerColor | undefined => {
    if (!cardOwnership) return undefined;
    const key = makeCardKey(card);
    return cardOwnership.get(key)?.color;
  };

  // Check if a foundation is a valid placement target (for click selection)
  const isValidClickTarget = (pile: FoundationPile): boolean => {
    if (!canPlace || !selectedCard) return false;

    // Card must match the suit
    if (selectedCard.suit !== pile.suit) return false;

    const topCard = pile.cards[pile.cards.length - 1];

    if (!topCard) {
      // Empty pile: only Ace (rank 1) can be placed
      return selectedCard.rank === 1;
    }

    // Must be exactly one rank higher
    return selectedCard.rank === topCard.rank + 1;
  };

  // Calculate global index for a pile (across all players)
  const getGlobalIndex = (playerIndex: number, suitIndex: number): number => {
    return playerIndex * 4 + suitIndex;
  };

  // Check if a foundation is a valid target (click OR drag)
  const isValidTarget = (pile: FoundationPile, globalIndex: number): boolean => {
    // During drag, check if this foundation is in valid drag targets
    if (isDragging) {
      return validDragFoundations.includes(globalIndex);
    }
    // For click selection
    return isValidClickTarget(pile);
  };

  // Determine grid layout based on player count
  const playerCount = playerGroups.length;
  const layoutClass = playerCount <= 2 ? styles.twoPlayers :
                      playerCount <= 4 ? styles.fourPlayers :
                      playerCount <= 6 ? styles.sixPlayers :
                      styles.eightPlayers;

  return (
    <div
      ref={internalFoundationRef}
      className={`${styles.multiFoundationArea} ${layoutClass} ${hasPendingMoves ? styles.pending : ''}`}
    >
      {hasPendingMoves && <div className={styles.header}><span className={styles.syncIndicator}>Syncing...</span></div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.playersGrid}>
        {playerGroups.map((group, playerIndex) => (
          <PlayerFoundationRow
            key={group.playerId}
            group={group}
            playerIndex={playerIndex}
            selectedCard={selectedCard}
            canPlace={canPlace}
            showMoveHints={showMoveHints}
            isValidTarget={isValidTarget}
            getOwnerColor={getOwnerColor}
            getGlobalIndex={getGlobalIndex}
            onPileClick={onPileClick}
            animatingIndex={animatingIndex}
            animatingColor={animatingColor}
            animationTimestamp={animationTimestamp}
          />
        ))}
      </div>
    </div>
  );
}

export default MultiFoundationArea;

/* =============================================================================
   PLAYER FOUNDATION ROW COMPONENT
   Shows one player's 4 foundation piles with their color indicator
   ============================================================================= */

interface PlayerFoundationRowProps {
  group: PlayerFoundationGroup;
  playerIndex: number;
  selectedCard?: CardType | null;
  canPlace: boolean;
  showMoveHints: boolean;
  isValidTarget: (pile: FoundationPile, globalIndex: number) => boolean;
  getOwnerColor: (card: CardType) => PlayerColor | undefined;
  getGlobalIndex: (playerIndex: number, suitIndex: number) => number;
  onPileClick?: (playerId: string, suit: Suit, globalIndex: number) => void;
  animatingIndex: number | null;
  animatingColor: PlayerColor | null;
  animationTimestamp: number;
}

function PlayerFoundationRow({
  group,
  playerIndex,
  selectedCard,
  canPlace,
  showMoveHints,
  isValidTarget,
  getOwnerColor,
  getGlobalIndex,
  onPileClick,
  animatingIndex,
  animatingColor,
  animationTimestamp,
}: PlayerFoundationRowProps) {
  // Create a map for easy lookup
  const pileMap = new Map(group.piles.map((p) => [p.suit, p]));

  return (
    <div className={styles.playerRow}>
      {/* Foundation piles - shared by all players, not owned */}
      <div className={styles.pilesRow}>
        {SUITS.map((suit, suitIndex) => {
          const pile = pileMap.get(suit);
          const cards = pile?.cards ?? [];
          const topCard = cards[cards.length - 1];
          const cardCount = cards.length;
          const globalIndex = getGlobalIndex(playerIndex, suitIndex);
          const isTarget = pile ? isValidTarget(pile, globalIndex) : false;
          const isHighlighted = showMoveHints && isTarget;
          const isClickable = canPlace && !!selectedCard;
          // Simple animation: is this the pile that's animating?
          const isReceiving = animatingIndex === globalIndex;
          // Use timestamp as key to force remount and trigger animation
          const animationKey = isReceiving ? `anim-${animationTimestamp}` : undefined;

          return (
            <DroppableFoundationPile
              key={`foundation-${globalIndex}`}
              suit={suit}
              globalIndex={globalIndex}
              playerId={group.playerId}
              topCard={topCard}
              cardCount={cardCount}
              isValidTarget={isTarget}
              isHighlighted={isHighlighted}
              isClickable={isClickable}
              isReceiving={isReceiving}
              highlightColor={isReceiving ? animatingColor : null}
              animationKey={animationKey}
              getOwnerColor={getOwnerColor}
              onPileClick={onPileClick}
            />
          );
        })}
      </div>
    </div>
  );
}

/* =============================================================================
   DROPPABLE FOUNDATION PILE COMPONENT
   ============================================================================= */

interface DroppableFoundationPileProps {
  suit: Suit;
  globalIndex: number;
  playerId: string;
  topCard: CardType | undefined;
  cardCount: number;
  isValidTarget: boolean;
  isHighlighted: boolean;
  isClickable: boolean;
  isReceiving: boolean;
  /** Player color to highlight with when receiving (temporary flash that fades) */
  highlightColor?: PlayerColor | null;
  /** Unique key that changes on animation to force Card remount */
  animationKey?: string;
  getOwnerColor: (card: CardType) => PlayerColor | undefined;
  onPileClick?: (playerId: string, suit: Suit, globalIndex: number) => void;
}

// Map player colors to hex values for CSS variable
const PLAYER_COLOR_HEX: Record<PlayerColor, string> = {
  red: '#FF1744',
  blue: '#2979FF',
  green: '#00E676',
  yellow: '#FFD23F',
  purple: '#D500F9',
  orange: '#FF9100',
  pink: '#FF4081',
  teal: '#00E5FF',
};

function DroppableFoundationPile({
  suit,
  globalIndex,
  playerId,
  topCard,
  cardCount,
  isValidTarget: _isValidTarget,
  isHighlighted,
  isClickable,
  isReceiving,
  highlightColor,
  animationKey,
  getOwnerColor,
  onPileClick,
}: DroppableFoundationPileProps) {
  // Set up droppable - all piles are valid drop targets
  const dropId = createDropId('foundation', globalIndex);
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
  });

  // Visual highlight: show when hints enabled OR when dragging over
  const showHighlight = isHighlighted || isOver;

  const handleClick = () => {
    onPileClick?.(playerId, suit, globalIndex);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isClickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  // Get the hex color for the highlight (used as CSS variable)
  const highlightHex = highlightColor ? PLAYER_COLOR_HEX[highlightColor] : null;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.pileWrapper} ${isClickable ? styles.clickable : ''} ${
        showHighlight ? styles.validTarget : ''
      } ${isOver ? styles.dragOver : ''} ${isReceiving ? styles.receiving : ''}`}
      style={highlightHex ? { '--highlight-color': highlightHex } as React.CSSProperties : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={`${suit} foundation - ${cardCount} cards${
        topCard ? `, top card: ${topCard.rank}` : ''
      }`}
    >
      <div
        className={`${styles.pile} ${isReceiving ? styles.flying : ''}`}
      >
        {topCard ? (
          <Card
            key={animationKey ?? `${topCard.suit}-${topCard.rank}`}
            card={topCard}
            faceUp={true}
            ownerColor={getOwnerColor(topCard)}
            className={isReceiving ? styles.flyingCard : undefined}
          />
        ) : (
          <div className={`${styles.emptySlot} ${styles[suit]}`}>
            <Icon
              icon={SUIT_ICONS[suit]}
              size="lg"
              strokeWidth={3}
              className={styles.suitIcon}
            />
          </div>
        )}
      </div>
    </div>
  );
}
