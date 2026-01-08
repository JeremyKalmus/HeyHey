import styles from './Input.module.css';

export interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  id?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  disabled = false,
  error,
  id,
  autoFocus,
  onKeyDown,
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`${styles.input} ${error ? styles.error : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
