import React from 'react';

interface ButtonSIGLProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function ButtonSIGL({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  style = {},
}: ButtonSIGLProps) {
  const variantStyles: Record<NonNullable<ButtonSIGLProps['variant']>, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? '#9CA3AF' : '#003DA5',
      color: '#FFFFFF',
      border: 'none',
    },
    secondary: {
      backgroundColor: disabled ? '#E5E7EB' : '#F3F4F6',
      color: disabled ? '#9CA3AF' : '#1F2937',
      border: '1px solid #D1D5DB',
    },
    danger: {
      backgroundColor: disabled ? '#9CA3AF' : '#DC2626',
      color: '#FFFFFF',
      border: 'none',
    },
    success: {
      backgroundColor: disabled ? '#9CA3AF' : '#059669',
      color: '#FFFFFF',
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: disabled ? '#9CA3AF' : '#003DA5',
      border: `1px solid ${disabled ? '#D1D5DB' : '#003DA5'}`,
    },
    link: {
      backgroundColor: 'transparent',
      color: disabled ? '#9CA3AF' : '#003DA5',
      border: 'none',
    },
  };

  const sizeStyles: Record<NonNullable<ButtonSIGLProps['size']>, React.CSSProperties> = {
    sm: { height: '32px', padding: '0 8px', fontSize: 12 },
    md: { height: '40px', padding: '0 16px', fontSize: 14 },
    lg: { height: '48px', padding: '0 24px', fontSize: 16 },
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease-in-out',
    outline: 'none',
    width: fullWidth ? '100%' : undefined,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  const hoverClass = !disabled
    ? variant === 'link'
      ? 'hover:underline'
      : 'hover:opacity-90 hover:scale-[1.02]'
    : '';

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`${hoverClass} ${className}`}
      style={baseStyles}
    >
      {icon && iconPosition === 'left' && <span>{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span>{icon}</span>}
    </button>
  );
}
