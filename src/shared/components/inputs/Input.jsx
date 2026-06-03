import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  id,
  type = 'text',
  error,
  placeholder,
  ...props
}, ref) => {
  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        placeholder={placeholder}
        className={`input-field ${error ? 'error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';