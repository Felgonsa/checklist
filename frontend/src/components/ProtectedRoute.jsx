import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 

const ProtectedRoute = () => {
  const token = localStorage.getItem('authToken');

  // Se não houver token, redireciona para o login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    // Decodifica o token para acessar suas informações (como a data de expiração)
    const decodedToken = jwtDecode(token);

    // O 'exp' vem em segundos, então multiplicamos por 1000 para comparar com milissegundos
    const currentTime = Date.now() / 1000;

    
    

    // Se o tempo de expiração do token for menor que o tempo atual, ele está expirado
    if (decodedToken.exp < currentTime) {
   
      localStorage.removeItem('authToken'); // Limpa o token expirado
      return <Navigate to="/" replace />; // Redireciona para o login
    }
  } catch (error) {
    // Se o token for inválido ou malformado, também desloga
  
    localStorage.removeItem('authToken');
    return <Navigate to="/" replace />;
  }

  // Se o token existe e não está expirado, permite o acesso à página
  return <Outlet />;
};

export default ProtectedRoute;