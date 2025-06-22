import React, { useState, useEffect } from "react";
import {
  getOficinas,
  createOficina,
  updateOficina,
  deleteOficina,
  // getUsuarios, // Para o futuro
  createUsuario,
} from "../services/api";
import "./AdminPage.css"; // Lembre-se de criar este arquivo de CSS

const AdminPage = () => {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState("oficinas");
  const [oficinas, setOficinas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS DOS FORMULÁRIOS ---
  // Para criação de nova oficina
  const [newOficinaName, setNewOficinaName] = useState("");
  const [newOficinaCnpj, setNewOficinaCnpj] = useState("");

  // Para edição de oficina
  const [editingOficina, setEditingOficina] = useState(null); // Guarda a oficina sendo editada

  // Para criação de novo usuário
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("admin");
  const [newUserOficinaId, setNewUserOficinaId] = useState("");

  // --- LÓGICA DE DADOS ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const oficinasRes = await getOficinas();
        setOficinas(oficinasRes.data);
      } catch (error) {
        console.error("Erro ao buscar dados de administração:", error);
        alert(
          "Você não tem permissão para acessar esta página ou ocorreu um erro."
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- FUNÇÕES HANDLER PARA OFICINAS ---
  const handleCreateOficina = async (e) => {
    e.preventDefault();
    try {
      const novaOficina = await createOficina({
        nome_fantasia: newOficinaName,
        cnpj: newOficinaCnpj,
      });
      setOficinas([...oficinas, novaOficina.data]);
      setNewOficinaName("");
      setNewOficinaCnpj("");
      alert("Oficina criada com sucesso!");
    } catch (error) {
      console.error("Erro ao criar oficina:", error);
      alert("Erro ao criar oficina.");
    }
  };

  const handleUpdateOficina = async (e) => {
    e.preventDefault();
    if (!editingOficina) return;
    try {
      const res = await updateOficina(editingOficina.id, {
        nome_fantasia: editingOficina.nome_fantasia,
        cnpj: editingOficina.cnpj,
      });
      setOficinas(
        oficinas.map((o) => (o.id === editingOficina.id ? res.data : o))
      );
      setEditingOficina(null);
      alert("Oficina atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar oficina:", error);
      alert("Erro ao atualizar oficina.");
    }
  };

  const handleDeleteOficina = async (oficinaId) => {
    if (
      !window.confirm(
        "Tem certeza que deseja deletar esta oficina? Todos os seus checklists e usuários serão afetados."
      )
    )
      return;
    try {
      await deleteOficina(oficinaId);
      setOficinas(oficinas.filter((o) => o.id !== oficinaId));
      alert("Oficina deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar oficina:", error);
      alert("Erro ao deletar oficina.");
    }
  };

  // --- FUNÇÃO HANDLER PARA USUÁRIOS ---
  const handleCreateUsuario = async (e) => {
    e.preventDefault();
    try {
      const novoUsuario = await createUsuario({
        nome: newUserName,
        email: newUserEmail,
        senha: newUserPassword,
        role: newUserRole,
        oficina_id: parseInt(newUserOficinaId),
      });
      // Futuramente, atualizar a lista de usuários na tela
      // setUsuarios([...usuarios, novoUsuario.data.usuario]);
      alert("Usuário criado com sucesso!");
      // Limpar formulário
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("admin");
      setNewUserOficinaId("");
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      alert(
        `Erro ao criar usuário: ${
          error.response?.data?.message || "Erro desconhecido"
        }`
      );
    }
  };

  if (isLoading) {
    return <div>Carregando painel de administração...</div>;
  }

  return (
    <div className="admin-page">
      <h1>Painel do Superadmin</h1>
      <div className="admin-tabs">
        <button
          onClick={() => setView("oficinas")}
          className={view === "oficinas" ? "active" : ""}
        >
          Gerenciar Oficinas
        </button>
        <button
          onClick={() => setView("usuarios")}
          className={view === "usuarios" ? "active" : ""}
        >
          Gerenciar Usuários
        </button>
      </div>

      {view === "oficinas" && (
        <div className="admin-section">
          <h2>Oficinas Cadastradas</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome Fantasia</th>
                <th>CNPJ</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {oficinas.map((oficina) => (
                <tr key={oficina.id}>
                  <td>{oficina.id}</td>
                  <td>{oficina.nome_fantasia}</td>
                  <td>{oficina.cnpj || "N/A"}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => setEditingOficina(oficina)}
                        className="btn-edit"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteOficina(oficina.id)}
                        className="btn-delete"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editingOficina && (
            <div className="form-container edit-form">
              <h3>Editando Oficina: {editingOficina.nome_fantasia}</h3>
              <form onSubmit={handleUpdateOficina}>
                <input
                  type="text"
                  value={editingOficina.nome_fantasia}
                  onChange={(e) =>
                    setEditingOficina({
                      ...editingOficina,
                      nome_fantasia: e.target.value,
                    })
                  }
                  placeholder="Nome Fantasia"
                  required
                />
                <input
                  type="text"
                  value={editingOficina.cnpj || ""}
                  onChange={(e) =>
                    setEditingOficina({ ...editingOficina, cnpj: e.target.value })
                  }
                  placeholder="CNPJ (Opcional)"
                />
                <div className="form-actions">
                  <button type="submit">Salvar Alterações</button>
                  <button type="button" onClick={() => setEditingOficina(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {!editingOficina && (
            <div className="form-container">
              <h3>Cadastrar Nova Oficina</h3>
              <form onSubmit={handleCreateOficina}>
                <input
                  type="text"
                  value={newOficinaName}
                  onChange={(e) => setNewOficinaName(e.target.value)}
                  placeholder="Nome Fantasia"
                  required
                />
                <input
                  type="text"
                  value={newOficinaCnpj}
                  onChange={(e) => setNewOficinaCnpj(e.target.value)}
                  placeholder="CNPJ (Opcional)"
                />
                <button type="submit">Criar Oficina</button>
              </form>
            </div>
          )}
        </div>
      )}

      {view === "usuarios" && (
        <div className="admin-section">
          <h2>Usuários Cadastrados</h2>
          <p>A tabela de usuários será implementada em breve.</p>
          <div className="form-container">
            <h3>Cadastrar Novo Usuário</h3>
            <form onSubmit={handleCreateUsuario}>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nome Completo"
                required
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="E-mail (Login)"
                required
              />
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Senha Provisória"
                required
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="admin">Admin da Oficina</option>
                <option value="membro">Membro</option>
              </select>
              <select
                value={newUserOficinaId}
                onChange={(e) => setNewUserOficinaId(e.target.value)}
                required
              >
                <option value="">Selecione a Oficina</option>
                {oficinas.map((oficina) => (
                  <option key={oficina.id} value={oficina.id}>
                    {oficina.nome_fantasia}
                  </option>
                ))}
              </select>
              <button type="submit">Criar Usuário</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;