'use client';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}: ButtonProps) {
  const baseStyles = {
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  };

  const variantStyles = {
    primary: { background: '#0070f3', color: 'white' },
    secondary: { background: '#eaeaea', color: '#333' },
  };

  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '14px' },
    md: { padding: '12px 24px', fontSize: '16px' },
    lg: { padding: '16px 32px', fontSize: '18px' },
  };

  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      style={{ ...baseStyles, ...variantStyles[variant], ...sizeStyles[size] }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
