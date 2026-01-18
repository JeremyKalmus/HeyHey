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

/** Flying card state for animation tracking */
interface FlyingCardState {
  /** Unique key for the flying card */
  key: string;
  /** Target pile key (playerId-suit) */
  targetPile: string;
  /** CSS custom properties for animation */
  flyFromX: number;
  flyFromY: number;
  /** Timestamp when animation started */
  startTime: number;
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

/**
 * Calculate fly-from coordinates based on opponent position (ADR-009)
 * Uses actual DOM positions when opponentRefs are available, falls back to calculated positions
 * Returns CSS pixel values for --fly-from-x and --fly-from-y
 */
function calculateFlyFromPosition(
  opponentIndex: number = 0,
  totalOpponents: number = 1,
  playerId?: string,
  opponentRefs?: Map<string, HTMLDivElement>,
  foundationEl?: HTMLDivElement | null
): { x: number; y: number } {
  // Try to get actual DOM position if refs are available
  if (playerId && opponentRefs && foundationEl) {
    const opponentEl = opponentRefs.get(playerId);
    if (opponentEl) {
      const opponentRect = opponentEl.getBoundingClientRect();
      const foundationRect = foundationEl.getBoundingClientRect();

      // Calculate offset from foundation center to opponent center
      const opponentCenterX = opponentRect.left + opponentRect.width / 2;
      const opponentCenterY = opponentRect.top + opponentRect.height / 2;
      const foundationCenterX = foundationRect.left + foundationRect.width / 2;
      const foundationCenterY = foundationRect.top + foundationRect.height / 2;

      return {
        x: opponentCenterX - foundationCenterX,
        y: opponentCenterY - foundationCenterY,
      };
    }
  }

  // Fallback to calculated position when DOM refs not available
  // Opponents are laid out horizontally at the top of the screen
  const segmentWidth = 100 / Math.max(totalOpponents, 1);
  const centerX = segmentWidth * opponentIndex + segmentWidth / 2;

  // Convert to offset from center (foundation is roughly in center)
  const xOffset = (centerX - 50) * 3; // Scale factor for visible motion

  // Y is always negative (coming from top)
  const yOffset = -100 - Math.random() * 50; // Randomize slightly for visual variety

  return { x: xOffset, y: yOffset };
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
  opponentRefs,
  foundationRef,
}: MultiFoundationAreaProps) {
  // Track which pile is currently animating
  const [animatingPile, setAnimatingPile] = useState<string | null>(null);
  // Track flying cards for animation
  const [flyingCard, setFlyingCard] = useState<FlyingCardState | null>(null);
  const lastMoveTimestamp = useRef<number>(0);
  // Internal ref for foundation area (used if external ref not provided)
  const internalFoundationRef = useRef<HTMLDivElement>(null);
  const actualFoundationRef = foundationRef?.current ?? internalFoundationRef.current;

  // Handle new opponent moves - trigger animation and sound
  useEffect(() => {
    if (!lastOpponentMove) return;
    if (lastOpponentMove.timestamp <= lastMoveTimestamp.current) return;

    // New move detected
    lastMoveTimestamp.current = lastOpponentMove.timestamp;
    const pileKey = `${lastOpponentMove.playerId}-${lastOpponentMove.suit}`;
    setAnimatingPile(pileKey);

    // Calculate fly-from position (ADR-009: use actual DOM positions when available)
    const { x, y } = calculateFlyFromPosition(
      lastOpponentMove.opponentIndex,
      lastOpponentMove.totalOpponents,
      lastOpponentMove.playerId,
      opponentRefs,
      actualFoundationRef
    );

    // Set flying card state
    setFlyingCard({
      key: `${pileKey}-${lastOpponentMove.timestamp}`,
      targetPile: pileKey,
      flyFromX: x,
      flyFromY: y,
      startTime: lastOpponentMove.timestamp,
    });

    // Play sound
    if (enableOpponentSounds) {
      soundManager.play('opponentMove');
    }

    // Clear animation after it completes (300ms animation + buffer)
    const timer = setTimeout(() => {
      setAnimatingPile(null);
      setFlyingCard(null);
    }, 350);

    return () => clearTimeout(timer);
  }, [lastOpponentMove, enableOpponentSounds, opponentRefs, actualFoundationRef]);

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
            animatingPile={animatingPile}
            flyingCard={flyingCard}
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
  animatingPile: string | null;
  flyingCard: FlyingCardState | null;
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
  animatingPile,
  flyingCard,
}: PlayerFoundationRowProps) {
  // Create a map for easy lookup
  const pileMap = new Map(group.piles.map((p) => [p.suit, p]));

  return (
    <div className={styles.playerRow}>
      {/* Player indicator */}
      <div className={styles.playerIndicator}>
        <div
          className={styles.colorBadge}
          style={{ backgroundColor: getPlayerColorHex(group.playerColor) }}
          title={group.playerName}
        />
        <span className={styles.playerName}>{group.playerName}</span>
      </div>

      {/* Foundation piles */}
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
          const pileKey = `${group.playerId}-${suit}`;
          const isReceiving = animatingPile === pileKey;

          // Get fly-from position if this pile is receiving
          const flyFromX = flyingCard?.targetPile === pileKey ? flyingCard.flyFromX : 0;
          const flyFromY = flyingCard?.targetPile === pileKey ? flyingCard.flyFromY : 0;

          return (
            <DroppableFoundationPile
              key={pileKey}
              suit={suit}
              globalIndex={globalIndex}
              playerId={group.playerId}
              topCard={topCard}
              cardCount={cardCount}
              isValidTarget={isTarget}
              isHighlighted={isHighlighted}
              isClickable={isClickable}
              isReceiving={isReceiving}
              flyFromX={flyFromX}
              flyFromY={flyFromY}
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
  /** CSS custom property for fly-from X position (px) */
  flyFromX: number;
  /** CSS custom property for fly-from Y position (px) */
  flyFromY: number;
  getOwnerColor: (card: CardType) => PlayerColor | undefined;
  onPileClick?: (playerId: string, suit: Suit, globalIndex: number) => void;
}

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
  flyFromX,
  flyFromY,
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

  return (
    <div
      ref={setNodeRef}
      className={`${styles.pileWrapper} ${isClickable ? styles.clickable : ''} ${
        showHighlight ? styles.validTarget : ''
      } ${isOver ? styles.dragOver : ''} ${isReceiving ? styles.receiving : ''}`}
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
        style={isReceiving ? {
          '--fly-from-x': `${flyFromX}px`,
          '--fly-from-y': `${flyFromY}px`,
        } as React.CSSProperties : undefined}
      >
        {topCard ? (
          <Card
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

/* =============================================================================
   HELPER FUNCTIONS
   ============================================================================= */

/**
 * Convert PlayerColor to hex color for CSS
 */
function getPlayerColorHex(color: PlayerColor): string {
  const colorMap: Record<PlayerColor, string> = {
    red: '#FF1744',
    blue: '#2979FF',
    green: '#00E676',
    yellow: '#FFD23F',
    purple: '#D500F9',
    orange: '#FF9100',
    pink: '#FF4081',
    teal: '#00E5FF',
  };
  return colorMap[color];
}
