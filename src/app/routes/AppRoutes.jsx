import { BrowserRouter, Routes, Route } from 'react-router-dom';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f3f4f6' }}>
              <h1 style={{ color: '#1e3a8a', marginBottom: '1rem' }}>Drogaria Torres Farma</h1>
              <p style={{ color: '#4b5563', fontSize: '1.2rem' }}>🚀 Sistema de Gestão de Caixas inicializado com sucesso!</p>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};