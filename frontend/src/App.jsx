import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { logout } from './services/api'; // Importa nossa nova função

import HomePage from './pages/HomePage';
import ChecklistPage from './pages/ChecklistPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  // Este useEffect roda apenas uma vez, quando o aplicativo carrega
  useEffect(() => {
    const token = localStorage.getItem('authToken');

    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decodedToken.exp < currentTime) {
          // Se o token já estiver expirado, desloga imediatamente
          logout();
        } else {
          // Se for válido, calcula o tempo restante em milissegundos
          const timeToExpire = (decodedToken.exp - currentTime) * 1000;
          console.log(`Token expira em ${Math.round(timeToExpire / 1000 / 60)} minutos.`);

          // Programa o logout automático para o momento exato da expiração
          const logoutTimer = setTimeout(() => {
            alert("Seu token expirou, você será deslogado.");
            logout();
          }, timeToExpire);

          // Limpa o timer se o componente for desmontado (boa prática)
          return () => clearTimeout(logoutTimer);
        }
      } catch (error) {
       
        logout();
      }
    }
  }, []); // O array vazio garante que isso rode só na inicialização

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/checklist/:id" element={<ChecklistPage />} />
      </Route>
    </Routes>
  );
}

export default App;