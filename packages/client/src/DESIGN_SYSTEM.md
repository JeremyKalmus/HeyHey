# HeyHey Design System - Neubrutalist Style

This document describes the Neubrutalist design system used throughout the HeyHey application. All components should use these design tokens instead of hardcoded values.

## Neubrutalism Principles

The HeyHey design system follows Neubrutalist design principles:

1. **Bold Typography**: Large, heavy typography with strong, sans-serif typefaces (black/extrabold weights)
2. **Heavy Black Outlines**: Cards and buttons outlined with heavy black borders (3-5px)
3. **Clashing Colors with High Contrast**: Strong contrasts between colors for visual impact
4. **Offset Drop Shadows**: Neubrutalist shadows (4px 4px 0px black) instead of soft gradients
5. **Flat Colors**: No gradients - use flat, solid colors
6. **Raw Aesthetics**: Unpolished, bold, and unapologetic visual elements
7. **Unconventional Layouts**: Embrace asymmetry and irregular grids when appropriate

## Color Palette - High Contrast & Clashing Colors

### Primary Colors
- **Primary**: `#FF6B35` - Vibrant orange-red (main brand color)
- **Primary Dark**: `#E85528` - Darker variant
- **Secondary**: `#00FF88` - Bright neon green (high contrast accent)
- **Secondary Dark**: `#00CC6A` - Darker green

### Accent Colors - Bold & Clashing
- **Accent 1 (Yellow)**: `#FFD23F` - Bold yellow
- **Accent 2 (Purple)**: `#5E60CE` - Deep purple-blue
- **Accent 3 (Pink)**: `#FF006E` - Hot pink
- **Accent 4 (Cyan)**: `#00F5FF` - Bright cyan

### Semantic Colors - High Contrast
- **Error**: `#FF1744` - Bright red (high visibility)
- **Error Dark**: `#D50000` - Darker red
- **Warning**: `#FFC400` - Bright amber
- **Success**: `#00E676` - Bright green
- **Info**: `#00B0FF` - Bright blue

### Neutral Colors - Pure Contrast
- **Black**: `#000000` - Pure black (borders, text on light)
- **White**: `#FFFFFF` - Pure white (background, text on dark)
- **Gray Dark**: `#2A2A2A` - Dark gray
- **Gray**: `#555555` - Medium gray
- **Gray Light**: `#CCCCCC` - Light gray

**Note**: These colors are intentionally high-contrast and may "clash" when used together - this is intentional in Neubrutalism for maximum visual impact.

## Design Tokens

All design tokens are defined as CSS custom properties in `src/index.css` under the `:root` selector.

### Usage in Components

**CSS Modules:**
```css
.myComponent {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: var(--border-width-thick) solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: var(--shadow-neubrutalist);
  font-weight: var(--font-weight-black);
}
```

**Inline Styles (avoid when possible):**
```tsx
<div style={{ 
  color: 'var(--text-primary)',
  border: 'var(--border-width-thick) solid var(--border-color)',
  boxShadow: 'var(--shadow-neubrutalist)'
}}>
```

### Color Tokens

#### Background Colors - Flat, High Contrast
- `--bg-primary`: Main background (`var(--color-white)`)
- `--bg-secondary`: Secondary background (`var(--color-accent-1)`) - Yellow
- `--bg-tertiary`: Tertiary background (`var(--color-secondary)`) - Neon green
- `--bg-dark`: Dark background (`var(--color-black)`)
- `--bg-gray`: Light gray background (`#F5F5F5`)

#### Text Colors - Bold Contrast
- `--text-primary`: Primary text (`var(--color-black)`) - Black on light
- `--text-secondary`: Secondary text (`var(--color-gray-dark)`)
- `--text-inverse`: Inverse text (`var(--color-white)`) - White on dark
- `--text-accent`: Accent text (`var(--color-primary)`)

#### Border - Heavy Black Outlines
- `--border-width-thin`: 2px
- `--border-width-medium`: 3px
- `--border-width-thick`: 4px (default)
- `--border-width-xthick`: 5px (large elements)
- `--border-color`: Pure black (`#000000`)
- `--border-color-accent`: Accent color (`var(--color-primary)`)

### Spacing Scale
- `--space-xs`: 4px
- `--space-sm`: 8px
- `--space-md`: 12px
- `--space-lg`: 16px
- `--space-xl`: 24px
- `--space-2xl`: 32px
- `--space-3xl`: 48px

### Border Radius - Minimal Rounding
- `--radius-none`: 0 (square, very Neubrutalist)
- `--radius-sm`: 2px (slight rounding)
- `--radius-md`: 4px (standard, slight)
- `--radius-lg`: 8px (moderate)
- `--radius-irregular-1`: `4px 8px 4px 8px` (irregular, Neubrutalist)
- `--radius-irregular-2`: `8px 4px 8px 4px` (alternate irregular)

### Typography - Bold, Heavy, Large

#### Font Families
- `--font-family-base`: `'Inter', 'Helvetica Neue', Arial, sans-serif` (heavy sans-serif)
- `--font-family-bold`: `'Inter Black', 'Helvetica Neue', Arial, sans-serif` (black weight)
- `--font-family-mono`: `'Courier New', Courier, monospace` (bold monospace)

#### Font Sizes - Large Scale
- `--font-size-xs`: 0.75rem (12px)
- `--font-size-sm`: 0.875rem (14px)
- `--font-size-base`: 1rem (16px) - **default should be bold**
- `--font-size-lg`: 1.25rem (20px)
- `--font-size-xl`: 1.5rem (24px)
- `--font-size-2xl`: 2rem (32px)
- `--font-size-3xl`: 3rem (48px)
- `--font-size-4xl`: 4rem (64px)
- `--font-size-5xl`: 5rem (80px)
- `--font-size-6xl`: 6rem (96px)

#### Font Weights - Heavy Emphasis
- `--font-weight-normal`: 400 (rarely used)
- `--font-weight-medium`: 600
- `--font-weight-bold`: 700 (common)
- `--font-weight-extrabold`: 800 (common)
- `--font-weight-black`: 900 (default for headings)

#### Letter Spacing
- `--letter-spacing-tight`: -0.02em (headings, large text)
- `--letter-spacing-normal`: 0
- `--letter-spacing-wide`: 0.05em (labels, uppercase)
- `--letter-spacing-wider`: 0.1em (monospace, codes)

### Shadows - Offset Drop Shadows (Not Soft)

**No soft shadows in Neubrutalism!** Use offset drop shadows instead.

- `--shadow-neubrutalist`: `4px 4px 0px #000000` (standard)
- `--shadow-neubrutalist-lg`: `6px 6px 0px #000000` (large)
- `--shadow-neubrutalist-xl`: `8px 8px 0px #000000` (extra large)
- `--shadow-neubrutalist-pressed`: `2px 2px 0px #000000` (pressed/active state)
- `--shadow-colored-1`: `4px 4px 0px var(--color-primary)` (colored shadow)
- `--shadow-colored-2`: `4px 4px 0px var(--color-secondary)` (colored shadow)

**Important**: On hover, increase shadow offset. On press/active, reduce offset and translate element down.

### Transitions - Minimal & Snappy
- `--transition-none`: none (no animation)
- `--transition-fast`: 0.1s (snappy)
- `--transition-base`: 0.2s (standard)

**Note**: Neubrutalism favors instant feedback. Avoid slow, smooth transitions.

### Z-Index Scale
- `--z-base`: 1
- `--z-dropdown`: 100
- `--z-sticky`: 200
- `--z-overlay`: 300
- `--z-modal`: 400
- `--z-popover`: 500
- `--z-tooltip`: 600

## Component Guidelines - Neubrutalist Style

### Buttons
- **All variants**: Heavy black border (`--border-width-thick`), bold font weight (`--font-weight-black`)
- **Primary**: Flat `--color-primary` background, black text, offset shadow
- **Secondary**: Flat `--color-secondary` background, black text, offset shadow
- **Ghost**: White background, black border, black text
- **Hover**: Increase shadow offset, translate element up-left slightly
- **Active/Pressed**: Reduce shadow, translate element down-right (`transform: translate(2px, 2px)`)

**Example:**
```css
.button {
  border: var(--border-width-thick) solid var(--border-color);
  background: var(--color-primary);
  color: var(--color-black);
  font-weight: var(--font-weight-black);
  text-transform: uppercase;
  box-shadow: var(--shadow-neubrutalist);
}

.button:hover {
  box-shadow: var(--shadow-neubrutalist-lg);
  transform: translate(-1px, -1px);
}

.button:active {
  box-shadow: var(--shadow-neubrutalist-pressed);
  transform: translate(2px, 2px);
}
```

### Inputs
- **Default**: White background, thick black border, offset shadow
- **Focus**: Increase border width, increase shadow offset
- **Error**: Error color background, black text (high contrast)

### Cards
- **Face-up**: White background, thick black border, offset shadow
- **Card backs**: Use game-specific player colors with thick black borders
- **Hover**: Increase shadow offset, slight translate
- **Selected**: Extra thick border, colored outline shadow
- **Game colors** (red, blue, green, etc.) are NOT part of the UI design system - they're game mechanics

### Typography Rules
- **Headings (h1-h6)**: Use `--font-weight-black` (900), `--letter-spacing-tight`
- **Body text**: Use `--font-weight-bold` (700) minimum
- **Labels**: Uppercase, `--letter-spacing-wide`, `--font-weight-black`
- **Monospace (codes, numbers)**: Use `--font-family-mono`, `--font-weight-black`

## Neubrutalist Best Practices

### ✅ DO:
- Use heavy black borders (3-5px)
- Use offset drop shadows, not soft shadows
- Use flat colors, no gradients
- Use bold, black weight typography
- Use high contrast color combinations
- Use uppercase text for labels and buttons
- Keep transitions fast (0.1-0.2s) or none
- Use minimal border radius or none at all

### ❌ DON'T:
- Use soft, blurry shadows
- Use gradients or color transitions
- Use light font weights (400-600)
- Use subtle borders or transparent elements
- Use smooth, slow transitions
- Use heavily rounded corners
- Use muted or pastel colors
- Use subtle hover effects

## Storybook Integration

The design system is automatically loaded in Storybook via `../src/index.css` import in `.storybook/preview.ts`. All tokens are available in Storybook stories.

**View changes immediately**: Any updates to design tokens will be reflected in Storybook when it's running.

## Migration Notes

The design system has been completely redesigned for Neubrutalism:
- **Replaced**: Soft shadows → Offset drop shadows
- **Replaced**: Gradients → Flat colors
- **Replaced**: Subtle borders → Heavy black borders
- **Replaced**: Light weights → Bold/black weights
- **Added**: High contrast, clashing color palette
- **Added**: Bold, uppercase typography
- **Added**: Raw, unpolished aesthetic

All components should use design tokens instead of hardcoded values.

## Icon System

The icon system uses [Lucide React](https://lucide.dev/) with neubrutalist defaults.

### Icon Wrapper Component

```tsx
import { Icon, CheckIcon, XIcon, PlayIcon } from '@/components/ui/Icon';

// Basic usage - default size (24px) and strokeWidth (3)
<Icon icon={CheckIcon} />

// Size variants
<Icon icon={PlayIcon} size="sm" />  // 16px
<Icon icon={PlayIcon} size="md" />  // 20px
<Icon icon={PlayIcon} size="lg" />  // 24px (default)
<Icon icon={PlayIcon} size="xl" />  // 32px

// Custom size in pixels
<Icon icon={XIcon} size={28} />

// Custom stroke width (default is 3 for neubrutalist style)
<Icon icon={CheckIcon} strokeWidth={4} />

// Additional Lucide props
<Icon icon={AlertIcon} color="var(--color-error)" />
```

### Available Icon Categories

**User & Players**: `UserIcon`, `UsersIcon`, `UserPlusIcon`, `UserMinusIcon`

**Game Actions**: `PlayIcon`, `PauseIcon`, `RestartIcon`, `ShuffleIcon`, `SkipIcon`

**Navigation**: `HomeIcon`, `ArrowLeftIcon`, `ArrowRightIcon`, `ChevronLeftIcon`, etc.

**Actions & UI**: `CheckIcon`, `XIcon`, `PlusIcon`, `MinusIcon`, `SettingsIcon`, `MenuIcon`

**Status**: `AlertIcon`, `WarningIcon`, `InfoIcon`, `SuccessIcon`, `ErrorIcon`, `HelpIcon`

**Game Results**: `TrophyIcon`, `CrownIcon`, `MedalIcon`, `StarIcon`

**Audio**: `VolumeIcon`, `VolumeOffIcon`, `VolumeLowIcon`

**Misc**: `CopyIcon`, `ShareIcon`, `LoaderIcon`, `RefreshIcon`, `TrashIcon`, `ClockIcon`, `ZapIcon`

### Neubrutalist Icon Guidelines

1. **Use strokeWidth=3** (default) for bold, heavy lines
2. **Prefer larger sizes** (lg or xl) for standalone icons
3. **Use sm/md sizes** for inline icons in buttons or text
4. **Icons inherit `currentColor`** - set color via parent or `color` prop
5. **For animated loading**, use `LoaderIcon` with CSS animation:
   ```css
   .spinner {
     animation: spin 1s linear infinite;
   }
   @keyframes spin {
     from { transform: rotate(0deg); }
     to { transform: rotate(360deg); }
   }
   ```
