// ARQUIVO: frontend/src/components/Header.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/api";

const Header = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole");
  const userName = localStorage.getItem("userName");
  const userOficina = localStorage.getItem("userOficina");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="app-header">
      <div className="user-info">
        <span className="user-name">{userName}</span>
        <span className="user-oficina">{userOficina}</span>
      </div>
      <nav>
        <Link to="/home">Início</Link>

        {/* SÓ MOSTRA O MENU DE ADMIN SE A ROLE FOR 'superadmin' */}
        {userRole === "superadmin" && <Link to="/admin">Admin</Link>}

        <Link to="/perfil">Alterar Senha</Link>
      </nav>
      <button onClick={handleLogout} className="btn-logout">
        Sair
      </button>
    </header>
  );
};

export default Header;
