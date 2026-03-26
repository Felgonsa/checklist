// ARQUIVO: frontend/src/components/Header.jsx
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
    <header className="modern-header">
      <div className="header-container">
        {/* Left side: Workshop name/logo */}
        <div className="header-left">
          <div className="workshop-name">
            {userOficina || "Oficina"}
          </div>
        </div>

        {/* Right side: User info and navigation */}
        <div className="header-right">
          {/* Navigation menu */}
          <nav className="header-nav">
            <Link to="/home" className="nav-link">Início</Link>
            
            {/* SÓ MOSTRA O MENU DE ADMIN SE A ROLE FOR 'superadmin' */}
            {userRole === "superadmin" && <Link to="/admin" className="nav-link">Admin</Link>}
           
          </nav>

          {/* User profile section */}
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{userName || "Usuário"}</span>
            </div>
            
            {/* Avatar placeholder */}

            <Link to="/perfil" className="nav-link">
            <div className="user-avatar">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            </Link>
            
            
            {/* Logout button - modern and discreet */}
            <button onClick={handleLogout} className="logout-btn" title="Sair">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
