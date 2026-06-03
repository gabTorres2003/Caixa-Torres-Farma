import React from 'react';
import { Input } from '../inputs/Input';

export const FormInput = ({ 
  label, 
  id, 
  type = 'text', 
  placeholder, 
  register, 
  error,
  ...props // 1. Captura todas as propriedades extras
}) => {
  return (
    <Input
      label={label}
      id={id}
      type={type}
      placeholder={placeholder}
      error={error?.message} 
      {...register} 
      {...props} // 2. Repassa para o componente base
    />
  );
};