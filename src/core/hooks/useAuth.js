import { useContext } from 'react';
import { AuthContext } from '../../app/providers/AuthProvider';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
};