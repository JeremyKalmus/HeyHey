import type { ReactNode, HTMLAttributes } from 'react';
import styles from './Panel.module.css';

export type PanelSize = 'sm' | 'md' | 'lg' | 'xl';
export type PanelVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type PanelAccent = 'primary' | 'secondary' | 'warning' | 'error';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Panel size (affects padding) */
  size?: PanelSize;
  /** Visual variant */
  variant?: PanelVariant;
  /** Border accent color */
  accent?: PanelAccent;
  /** Enable hover/click interactions */
  interactive?: boolean;
  /** Panel content */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Panel component for containing content with neubrutalist styling.
 *
 * Features dark background, 4px black border, large hard offset shadow, and 8px border radius.
 *
 * @example
 * ```tsx
 * <Panel>
 *   <p>Basic panel content</p>
 * </Panel>
 *
 * <Panel size="lg" variant="elevated" accent="primary">
 *   <p>Elevated panel with accent</p>
 * </Panel>
 *
 * <Panel interactive onClick={() => console.log('clicked')}>
 *   <p>Clickable panel</p>
 * </Panel>
 * ```
 */
export function Panel({
  size = 'md',
  variant = 'default',
  accent,
  interactive = false,
  children,
  className,
  ...props
}: PanelProps) {
  const classNames = [
    styles.panel,
    styles[`size-${size}`],
    styles[`variant-${variant}`],
    accent && styles[`accent-${accent}`],
    interactive && styles.interactive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
}

/* =============================================================================
   PANEL.HEADER - Header section with title
   ============================================================================= */

export interface PanelHeaderProps {
  /** Header title */
  title?: string;
  /** Additional content (e.g., actions) */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Panel header with title and optional action area.
 *
 * @example
 * ```tsx
 * <Panel.Header title="Settings">
 *   <Button size="sm">Edit</Button>
 * </Panel.Header>
 * ```
 */
export function PanelHeader({ title, children, className }: PanelHeaderProps) {
  const classNames = [styles.header, className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {children}
    </div>
  );
}

/* =============================================================================
   PANEL.BODY - Main content area
   ============================================================================= */

export interface PanelBodyProps {
  /** Body content */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Panel body for main content.
 *
 * @example
 * ```tsx
 * <Panel.Body>
 *   <p>Main content goes here</p>
 * </Panel.Body>
 * ```
 */
export function PanelBody({ children, className }: PanelBodyProps) {
  const classNames = [styles.body, className].filter(Boolean).join(' ');

  return <div className={classNames}>{children}</div>;
}

/* =============================================================================
   PANEL.FOOTER - Footer section with actions
   ============================================================================= */

export interface PanelFooterProps {
  /** Footer content */
  children?: ReactNode;
  /** Additional CSS class */
  className?: string;
}

/**
 * Panel footer for actions.
 *
 * @example
 * ```tsx
 * <Panel.Footer>
 *   <Button variant="secondary">Cancel</Button>
 *   <Button>Save</Button>
 * </Panel.Footer>
 * ```
 */
export function PanelFooter({ children, className }: PanelFooterProps) {
  const classNames = [styles.footer, className].filter(Boolean).join(' ');

  return <div className={classNames}>{children}</div>;
}

/* =============================================================================
   COMPOUND COMPONENT NAMESPACE
   ============================================================================= */

/**
 * Panel compound component for neubrutalist content containers.
 *
 * @example
 * ```tsx
 * <Panel size="lg" variant="elevated">
 *   <Panel.Header title="Game Settings" />
 *   <Panel.Body>
 *     <p>Configure your game options</p>
 *   </Panel.Body>
 *   <Panel.Footer>
 *     <Button>Save</Button>
 *   </Panel.Footer>
 * </Panel>
 * ```
 */
const PanelNamespace = Object.assign(Panel, {
  Header: PanelHeader,
  Body: PanelBody,
  Footer: PanelFooter,
});

export { PanelNamespace as Panel };
export default PanelNamespace;
