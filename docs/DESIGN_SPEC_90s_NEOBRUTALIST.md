# HeyHey Design Spec: 90s Arcade Neobrutalism

> **Purpose**: Convoy work spec for implementing the 90s video game neobrutalist redesign
> **Status**: DRAFT - Awaiting approval

## Vision

Jet Set Radio meets SNES UI. Bold, chunky, unapologetically retro. Think arcade cabinet
menus, fighting game character selects, and 16-bit RPG interfaces - but with modern
neobrutalist sensibilities.

## Core Aesthetic Pillars

### 1. 90s Video Game DNA
- **Pixel-influenced typography** (but readable - no actual pixel fonts for body text)
- **Arcade cabinet colors**: Electric blue, hot pink, toxic green, warning yellow
- **Chunky, tactile UI** that feels like pressing physical buttons
- **Score counter aesthetics** for numbers/stats
- **"Press Start" energy** throughout

### 2. Neobrutalist Foundation
- **4px black borders** on everything interactive
- **Hard offset shadows** (no blur, ever)
- **Flat colors** (no gradients)
- **Bold typography** (700-900 weight)
- **Snappy transitions** (100-150ms max)

### 3. No Emojis Policy
Replace all emoji usage with **Lucide React** icons or custom SVG icons where needed.

## Color Palette

### Primary Colors (Arcade Cabinet)
```css
--arcade-blue:     #00D4FF;  /* Electric cyan - primary actions */
--arcade-pink:     #FF2E97;  /* Hot pink - secondary/accent */
--arcade-green:    #39FF14;  /* Toxic green - success/go */
--arcade-yellow:   #FFE135;  /* Warning yellow - caution/highlight */
--arcade-orange:   #FF6B35;  /* Sunset orange - energy/action */
```

### Dark Mode Base (Default)
```css
--bg-dark:         #0D0D0F;  /* Near-black, slight blue tint */
--bg-panel:        #1A1A1F;  /* Panel backgrounds */
--bg-elevated:     #252530;  /* Cards, modals */
--text-primary:    #FFFFFF;  /* Pure white */
--text-secondary:  #A0A0B0;  /* Muted text */
```

### Card Colors (Game Mechanics - Not UI)
```css
--card-red:        #E63946;  /* Hearts/Diamonds */
--card-black:      #1D1D1D;  /* Clubs/Spades */
--card-back-1:     #2563EB;  /* Player 1 */
--card-back-2:     #DC2626;  /* Player 2 */
--card-back-3:     #059669;  /* Player 3 */
--card-back-4:     #7C3AED;  /* Player 4 */
```

### Semantic Colors
```css
--success:         #39FF14;  /* Arcade green */
--error:           #FF3366;  /* Bright red-pink */
--warning:         #FFE135;  /* Arcade yellow */
--info:            #00D4FF;  /* Arcade blue */
```

## Typography

### Font Stack
```css
/* Headings - Bold, condensed, impactful */
--font-display:    'Archivo Black', 'Impact', sans-serif;

/* Body - Clean, readable, still bold */
--font-body:       'Inter', 'Helvetica Neue', sans-serif;

/* Monospace - Scores, codes, stats */
--font-mono:       'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale (90s Arcade Style)
```css
/* Display - "GAME OVER", "PLAYER 1 WINS" */
--text-display:    4rem;     /* 64px - big announcements */
--text-title:      2.5rem;   /* 40px - screen titles */
--text-heading:    1.75rem;  /* 28px - section headers */
--text-subhead:    1.25rem;  /* 20px - card titles */
--text-body:       1rem;     /* 16px - readable body */
--text-caption:    0.875rem; /* 14px - labels, hints */
--text-tiny:       0.75rem;  /* 12px - badges, counters */
```

### Typography Rules
- **Headings**: ALL CAPS, letter-spacing: 0.05em, weight 900
- **Body**: Sentence case, weight 600-700
- **Labels**: UPPERCASE, letter-spacing: 0.1em, weight 800
- **Numbers/Scores**: Monospace, tabular figures, weight 700

## Borders & Shadows

### Border Weights
```css
--border-thin:     2px;   /* Subtle elements */
--border-medium:   3px;   /* Standard interactive */
--border-thick:    4px;   /* Primary buttons, cards */
--border-chunky:   5px;   /* Hero elements, selected states */
```

### Shadow System (Hard Offset Only)
```css
/* Standard shadows - always black, no blur */
--shadow-sm:       3px 3px 0 #000000;
--shadow-md:       4px 4px 0 #000000;
--shadow-lg:       6px 6px 0 #000000;
--shadow-xl:       8px 8px 0 #000000;

/* Colored shadows for emphasis */
--shadow-glow-blue:   4px 4px 0 var(--arcade-blue);
--shadow-glow-pink:   4px 4px 0 var(--arcade-pink);
--shadow-glow-green:  4px 4px 0 var(--arcade-green);

/* Interactive states */
--shadow-hover:    6px 6px 0 #000000;  /* Lift effect */
--shadow-pressed:  2px 2px 0 #000000;  /* Push effect */
```

## Spacing

```css
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-16:  64px;
```

## Border Radius

Minimal - neobrutalism prefers sharp corners:
```css
--radius-none:  0;
--radius-sm:    2px;   /* Slight softening */
--radius-md:    4px;   /* Standard (use sparingly) */
--radius-lg:    8px;   /* Cards, panels */
```

## Transitions

Snappy and immediate - no lazy animations:
```css
--transition-instant:  50ms;   /* Micro-interactions */
--transition-fast:     100ms;  /* Button states */
--transition-normal:   150ms;  /* Panel changes */
/* Never exceed 200ms */
```

## Icon System

### Library: Lucide React
Primary icon library. Stroke-width: 2.5-3px for neobrutalist weight.

```tsx
import { Play, Pause, RotateCcw, Users, Trophy, Settings } from 'lucide-react';

// Usage with thick stroke
<Play size={24} strokeWidth={3} />
```

### Icon Guidelines
- **Size**: Minimum 20px, prefer 24px for interactive
- **Stroke**: 2.5-3px (heavier than default)
- **Color**: Inherit from parent, use arcade colors for emphasis
- **Touch targets**: Minimum 44px for mobile

### Emoji Replacements
| Current Emoji | Lucide Replacement | Context |
|---------------|-------------------|---------|
| 🃏 | `<Layers />` or custom card icon | Card pile indicator |
| Player avatars | `<User />` + color badge OR custom avatar set | Player identity |
| ✓ | `<Check />` | Success/complete |
| ✗ | `<X />` | Error/close |
| ⚡ | `<Zap />` | Quick action |

### Custom Icons Needed
- **Card back pattern** - SVG for player-colored card backs
- **Nertz pile icon** - Custom stack indicator
- **HeyHey logo** - Game-specific branding

## Component Specifications

### Buttons

```css
.button {
  font-family: var(--font-display);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: var(--space-3) var(--space-6);
  border: var(--border-thick) solid #000;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
}

.button:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-hover);
}

.button:active {
  transform: translate(2px, 2px);
  box-shadow: var(--shadow-pressed);
}

.button-primary {
  background: var(--arcade-blue);
  color: #000;
}

.button-secondary {
  background: var(--arcade-pink);
  color: #000;
}

.button-ghost {
  background: transparent;
  color: var(--text-primary);
  border-color: var(--text-primary);
}
```

### Cards (Playing Cards)

```css
.card {
  border: var(--border-thick) solid #000;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  background: #fff;
}

.card-selected {
  border-width: var(--border-chunky);
  box-shadow: var(--shadow-glow-blue);
  transform: translateY(-4px);
}

.card-back {
  /* Player-specific color */
  background: var(--player-color);
  border: var(--border-thick) solid #000;
}
```

### Input Fields

```css
.input {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--text-body);
  padding: var(--space-3) var(--space-4);
  border: var(--border-medium) solid #000;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.input:focus {
  outline: none;
  border-color: var(--arcade-blue);
  box-shadow: var(--shadow-glow-blue);
}
```

### Panels & Cards (UI, not playing cards)

```css
.panel {
  background: var(--bg-panel);
  border: var(--border-thick) solid #000;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-6);
}
```

### Score/Stats Display (90s Arcade Feel)

```css
.score-display {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-heading);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--arcade-green);
  text-shadow: 2px 2px 0 #000;
}
```

## Avatar System (Replacing Emoji Avatars)

Instead of emoji avatars, use a set of **simple geometric avatar icons** with player colors:

```tsx
// Avatar options - simple shapes with personality
const AVATAR_SHAPES = [
  'circle',      // Classic
  'square',      // Bold
  'diamond',     // Flashy
  'hexagon',     // Tech
  'star',        // Champion
  'triangle',    // Sharp
] as const;

// Each player picks shape + their assigned color
<Avatar shape="star" color={playerColor} size={48} />
```

Or use Lucide's built-in avatar-friendly icons:
- `<User />` - Default
- `<Ghost />` - Spooky
- `<Bot />` - Robot
- `<Cat />` - Pet
- `<Skull />` - Edgy
- `<Smile />` - Happy

## Animation Patterns

### Button Press (Arcade Feel)
```css
@keyframes button-press {
  0%   { transform: translate(0, 0); box-shadow: var(--shadow-md); }
  50%  { transform: translate(2px, 2px); box-shadow: var(--shadow-pressed); }
  100% { transform: translate(0, 0); box-shadow: var(--shadow-md); }
}
```

### Score Increment (Number Tick Up)
```css
@keyframes score-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.2); color: var(--arcade-yellow); }
  100% { transform: scale(1); }
}
```

### Card Deal
```css
@keyframes card-deal {
  0%   { transform: translateY(-20px) rotate(-5deg); opacity: 0; }
  100% { transform: translateY(0) rotate(0); opacity: 1; }
}
```

## File Structure for Implementation

```
packages/client/src/
├── styles/
│   ├── tokens.css          # All CSS custom properties
│   ├── reset.css           # Minimal reset
│   ├── typography.css      # Font imports, type styles
│   └── animations.css      # Keyframe definitions
├── components/
│   └── ui/                 # Shared UI components
│       ├── Button/
│       ├── Input/
│       ├── Avatar/         # New - replaces emoji avatars
│       ├── Icon/           # Lucide wrapper with defaults
│       └── ScoreDisplay/   # 90s arcade number display
```

## Convoy Work Breakdown

### Phase 1: Foundation (MUST complete first)
1. **Design Tokens** - Implement all CSS custom properties in `tokens.css`
2. **Typography** - Font imports, type scale, text styles
3. **Icon System** - Lucide setup, wrapper component with neobrutalist defaults

### Phase 2: Core Components (Can parallelize)
4. **Button** - All variants with arcade interaction states
5. **Input** - Text inputs, focus states
6. **Avatar** - Replace emoji system with geometric/icon avatars
7. **Panel/Card UI** - Container components

### Phase 3: Game Components (Can parallelize)
8. **Playing Cards** - Card, CardFace, CardBack with new styling
9. **Pile Components** - NertzPile, WorkPiles, StockPile, WastePile
10. **Foundation Area** - Shared piles display
11. **Score Display** - 90s arcade number treatment

### Phase 4: Screens (Can parallelize)
12. **Lobby UI** - HomePage, RoomLobby, PlayerList
13. **Game Board** - Main game layout
14. **Opponent Mini** - Miniature opponent views

## Dependencies

```json
{
  "dependencies": {
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@fontsource/archivo-black": "^5.0.0",
    "@fontsource/inter": "^5.0.0",
    "@fontsource/jetbrains-mono": "^5.0.0"
  }
}
```

## Success Criteria

- [ ] Zero emoji usage in UI (player content excluded)
- [ ] All interactive elements have 4px black borders
- [ ] All shadows are hard offset (no blur)
- [ ] Typography uses 700+ weight throughout
- [ ] Color palette matches arcade aesthetic
- [ ] Transitions ≤150ms
- [ ] Lucide icons at 2.5-3px stroke weight
- [ ] Buttons have press/lift animations
- [ ] Score displays have 90s arcade feel

---

**Spec Version**: 1.0 DRAFT
**Author**: heyhey/crew/jeremy
**Date**: 2026-01-13
