import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  isLoading = false,
  disabled = false,
  icon: Icon,
  style,
}) => {
  const baseClass = `btn btn-${variant}`;

  return (
    <button
      type={type}
      className={baseClass}
      onClick={onClick}
      disabled={disabled || isLoading}
      style={style}
    >
      {isLoading && <Loader2 size={20} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
      {!isLoading && Icon && <Icon size={20} />}
      {children}
    </button>
  );
};