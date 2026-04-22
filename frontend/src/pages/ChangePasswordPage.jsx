import React, { useState } from "react";
import { changePassword } from "../services/api"; // Importa a função correta
import "./AdminPage.css"; // Reutilizando o CSS
import Header from "../components/Header";

const ProfilePage = () => {
  const [senhaAntiga, setSenhaAntiga] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (novaSenha !== confirmarNovaSenha) {
      setError("A nova senha e a confirmação não são iguais.");
      return;
    }

    const dadosParaEnviar = { senhaAntiga, novaSenha };
    console.log("Dados que serão enviados para a API:", dadosParaEnviar);

    try {
      const response = await changePassword({ senhaAntiga, novaSenha });
      setMessage(response.data.message);
      setSenhaAntiga("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch (err) {
      setError(
        err.response?.data?.message || "Ocorreu um erro ao alterar a senha."
      );
      console.error(err);
    }
  };

  return (
    <>
      <Header />
      <div className="admin-page">
        <h1>Meu Perfil</h1>
        <div className="admin-section">
          <div className="form-container">
            <h3>Alterar Minha Senha</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Senha Atual</label>
                <input
                  type="password"
                  value={senhaAntiga}
                  onChange={(e) => setSenhaAntiga(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nova Senha (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  required
                />
              </div>

              {message && (
                <p style={{ color: "green", textAlign: "center" }}>{message}</p>
              )}
              {error && <p className="error-message">{error}</p>}

              <button type="submit">Salvar Nova Senha</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
