import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import api, { changePassword, logout } from "../services/api";
import "./PerfilPage.css";

const PerfilPage = () => {
  const [perfilData, setPerfilData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [senhaAntiga, setSenhaAntiga] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        setLoading(true);
        // A API já adiciona o token automaticamente via interceptor
        const response = await api.get("/perfil");
        setPerfilData(response.data);
        setError("");
      } catch (err) {
        console.error("Erro ao buscar perfil:", err);
        setError(
          err.response?.data?.message || "Erro ao carregar dados do perfil."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (novaSenha !== confirmarNovaSenha) {
      setPasswordError("A nova senha e a confirmação não são iguais.");
      return;
    }

    const dadosParaEnviar = { senhaAntiga, novaSenha };
    console.log("Dados que serão enviados para a API:", dadosParaEnviar);

    try {
      const response = await changePassword({ senhaAntiga, novaSenha });
      setPasswordMessage(response.data.message);
      setSenhaAntiga("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "Ocorreu um erro ao alterar a senha."
      );
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="perfil-page">
          <div className="loading-container">
            <p>Carregando dados do perfil...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="perfil-page">
          <div className="error-container">
            <p className="error-message">{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="perfil-page">
        <h1>Meu Perfil</h1>
        
        <div className="perfil-container">
          {/* Bloco 1: Dados do Usuário */}
          <div className="perfil-section">
            <h2>Dados do Usuário</h2>
            <div className="perfil-info-grid">
              <div className="info-item">
                <span className="info-label">Nome:</span>
                <span className="info-value">{perfilData.usuario.nome}</span>
              </div>
              <div className="info-item">
                <span className="info-label">E-mail:</span>
                <span className="info-value">{perfilData.usuario.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Cargo:</span>
                <span className="info-value">{perfilData.usuario.role}</span>
              </div>
              {perfilData.usuario.cpf && (
                <div className="info-item">
                  <span className="info-label">CPF:</span>
                  <span className="info-value">{perfilData.usuario.cpf}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bloco 2: Dados da Oficina */}
          <div className="perfil-section">
            <h2>Dados da Oficina</h2>
            {perfilData.oficina ? (
              <div className="perfil-info-grid">
                <div className="info-item">
                  <span className="info-label">Nome Fantasia:</span>
                  <span className="info-value">{perfilData.oficina.nome_fantasia}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">CNPJ:</span>
                  <span className="info-value">{perfilData.oficina.cnpj || "Não informado"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Telefone:</span>
                  <span className="info-value">{perfilData.oficina.telefone || "Não informado"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">E-mail:</span>
                  <span className="info-value">{perfilData.oficina.email || "Não informado"}</span>
                </div>
                {/* Nota: O campo 'endereco' não existe no schema atual */}
                {/* <div className="info-item">
                  <span className="info-label">Endereço:</span>
                  <span className="info-value">{perfilData.oficina.endereco || "Não informado"}</span>
                </div> */}
              </div>
            ) : (
              <div className="no-oficina">
                <p>Nenhuma oficina vinculada ao seu usuário.</p>
              </div>
            )}
          </div>

          {/* Bloco 3: Alterar Senha */}
          <div className="perfil-section password-section">
            <h2>Alterar Senha</h2>
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <div className="form-group">
                <label>Senha Atual</label>
                <input
                  type="password"
                  value={senhaAntiga}
                  onChange={(e) => setSenhaAntiga(e.target.value)}
                  required
                  className="password-input"
                />
              </div>
              <div className="form-group">
                <label>Nova Senha (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  className="password-input"
                />
              </div>
              <div className="form-group">
                <label>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  required
                  className="password-input"
                />
              </div>

              {passwordMessage && (
                <p className="password-success">{passwordMessage}</p>
              )}
              {passwordError && <p className="password-error">{passwordError}</p>}

              <button type="submit" className="password-submit-btn">
                Salvar Nova Senha
              </button>
            </form>
          </div>
        </div>

        {/* Botão de Logoff com Touch Targets para mobile */}
        <div className="logout-section">
          <button 
            onClick={handleLogout} 
            className="logout-btn-large"
            title="Sair do sistema"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default PerfilPage;