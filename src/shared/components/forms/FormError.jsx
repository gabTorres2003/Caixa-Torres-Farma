import React from 'react';
import { AlertCircle } from 'lucide-react';

export const FormError = ({ message }) => {
  if (!message) return null;

  return (
    <div className="form-alert-error">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  );
};