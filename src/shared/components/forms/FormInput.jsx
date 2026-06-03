import React from 'react';
import { Input } from '../inputs/Input';

export const FormInput = ({ 
  label, 
  id, 
  type = 'text', 
  placeholder, 
  register, 
  error 
}) => {
  return (
    <Input
      label={label}
      id={id}
      type={type}
      placeholder={placeholder}
      error={error?.message} // Extrai apenas a mensagem de erro do objeto
      {...register} // Espalha as funções onChange, onBlur e name 
    />
  );
};