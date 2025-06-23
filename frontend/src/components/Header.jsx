// ARQUIVO: frontend/src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../services/api';

const Header = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole'); // Pega a role do usuário
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <nav>
        <Link to="/home">Início</Link>

        {/* SÓ MOSTRA O MENU DE ADMIN SE A ROLE FOR 'superadmin' */}
        {userRole === 'superadmin' && (
          <Link to="/admin">Admin</Link>
        )}

        <Link to="/perfil">Alterar Senha</Link>
      </nav>
      <button onClick={handleLogout} className="btn-logout">Sair</button>
    </header>
  );
};

export default Header;