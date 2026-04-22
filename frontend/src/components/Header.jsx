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
            
            {/* Link para Meu Perfil */}
            
           
          </nav>

          {/* User profile section */}
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{userName || "Usuário"}</span>
            </div>
            
            {/* Avatar placeholder - agora é apenas visual, não clicável */}

            <Link to="/perfil" className="nav-link">
            <div className="user-avatar">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            </Link>
           
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
