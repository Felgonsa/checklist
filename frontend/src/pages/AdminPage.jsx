import React, { useState, useEffect } from "react";
import {
  getOficinas,
  createOficina,
  updateOficina,
  deleteOficina,
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from "../services/api";
import OficinaModal from "../components/OficinaModal"; // Importa o modal que já criamos
import UsuarioModal from "../components/UsuarioModal"; // Importa o modal para usuários
import Header from "../components/Header";
import "./AdminPage.css";
import { toast } from 'react-toastify';

const AdminPage = () => {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState("oficinas");
  const [oficinas, setOficinas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ESTADOS PARA O MODAL ---
  const [isOficinaModalOpen, setIsOficinaModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOficina, setEditingOficina] = useState(null);
  const [isUsuarioModalOpen, setIsUsuarioModalOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("admin");
  const [newUserOficinaId, setNewUserOficinaId] = useState("");

  // --- LÓGICA DE DADOS ---
  useEffect(() => {
    // Função para buscar os dados iniciais
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const oficinasRes = await getOficinas();
        setOficinas(oficinasRes.data);
        const usuariosRes = await getUsuarios();
        setUsuarios(usuariosRes.data);
      } catch (error) {
        console.error("Erro ao buscar dados de administração:", error);
        toast.error(
          "Você não tem permissão para acessar esta página ou ocorreu um erro."
        );
      } finally {
        setIsLoading(false); // Garante que o loading termine
      }
    };
    fetchData();
  }, []); // O array vazio garante que rode só uma vez

  // --- FUNÇÕES HANDLER PARA O MODAL ---
  const handleOpenCreateModal = () => {
    setEditingOficina(null); // Garante que estamos no modo "criar"
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (oficina) => {
    setEditingOficina(oficina); // Define qual oficina estamos editando
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOficina(null);
  };

  // --- FUNÇÕES HANDLER PARA AÇÕES (CRIAR, EDITAR, DELETAR) ---
  const handleSaveOficina = async (formData) => {
    try {
      if (editingOficina) {
        // Lógica de Edição
        const res = await updateOficina(editingOficina.id, formData);
        setOficinas(
          oficinas.map((o) => (o.id === editingOficina.id ? res.data : o))
        );
        toast.success("Oficina atualizada com sucesso!");
      } else {
        // Lógica de Criação
        const res = await createOficina(formData);
        setOficinas([...oficinas, res.data]);
        toast.success("Oficina criada com sucesso!");
      }
      handleCloseModal(); // Fecha o modal após a ação
    } catch (error) {
      console.error("Erro ao salvar oficina:", error);
      toast.error("Erro ao salvar oficina.");
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
      toast.success("Oficina deletada com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar oficina:", error);
      toast.error("Erro ao deletar oficina.");
    }
  };

  const handleCreateUsuario = async (e) => {
    e.preventDefault();
    if (!newUserOficinaId) {
      toast.warning("Por favor, selecione uma oficina para o novo usuário.");
      return;
    }
    try {
      const res = await createUsuario({
        nome: newUserName,
        email: newUserEmail,
        senha: newUserPassword,
        role: newUserRole,
        oficina_id: parseInt(newUserOficinaId),
      });
      // Adiciona o novo usuário à lista na tela, buscando o nome da oficina
      const oficinaDoNovoUsuario = oficinas.find(
        (o) => o.id === parseInt(newUserOficinaId)
      );
      const usuarioParaExibir = {
        ...res.data.usuario,
        oficina_nome: oficinaDoNovoUsuario?.nome_fantasia,
      };
      setUsuarios([...usuarios, usuarioParaExibir]);

      toast.success("Usuário criado com sucesso!");
      // Limpa os campos do formulário
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("admin");
      setNewUserOficinaId("");
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast.error(
        `Erro ao criar usuário: ${
          error.response?.data?.message || "Erro desconhecido"
        }`
      );
    }
  };

  const handleSaveUsuario = async (formData) => {
    // Lógica para Criar ou Editar um usuário
    const dadosParaSalvar = { ...formData };
    if (!dadosParaSalvar.senha) {
      delete dadosParaSalvar.senha; // Remove o campo senha se estiver vazio
    }

    try {
      let res;
      if (editingUsuario) {
        res = await updateUsuario(editingUsuario.id, dadosParaSalvar);
        setUsuarios(
          usuarios.map((u) =>
            u.id === editingUsuario.id ? { ...u, ...res.data } : u
          )
        );
        toast.success("Usuário atualizado com sucesso!");
      } else {
        res = await createUsuario(dadosParaSalvar);
        // ... lógica para adicionar o novo usuário na lista ...
        toast.success("Usuário criado com sucesso!");
      }
      setIsUsuarioModalOpen(false);
      setEditingUsuario(null);
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast.error(
        `Erro ao salvar usuário: ${
          error.response?.data?.message || "Erro desconhecido"
        }`
      );
    }
  };

  const handleDeleteUsuario = async (usuarioId) => {
    if (!window.confirm("Tem certeza que deseja deletar este usuário?")) return;
    try {
      await deleteUsuario(usuarioId);
      setUsuarios(usuarios.filter((u) => u.id !== usuarioId));
      toast.success("Usuário deletado com sucesso!");
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      toast.error("Erro ao deletar usuário.");
    }
  };

  if (isLoading) return <div>Carregando painel de administração...</div>;

  return (
    <>
     <Header />
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
            <div className="section-header">
              <h2>Oficinas Cadastradas</h2>
              <button onClick={handleOpenCreateModal} className="btn-primary">
                Nova Oficina
              </button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome Fantasia</th>
                  <th>CNPJ</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {oficinas.map((oficina) => (
                  <tr key={oficina.id}>
                    <td>{oficina.id}</td>
                    <td>{oficina.nome_fantasia}</td>
                    <td>{oficina.cnpj || "N/A"}</td>
                    <td>{oficina.email || "N/A"}</td>
                    <td>{oficina.telefone || "N/A"}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleOpenEditModal(oficina)}
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
          </div>
        )}

        {view === "usuarios" && (
          <div className="admin-section">
            <div className="admin-section">
              <h2>Usuários Cadastrados</h2>
              <button
                onClick={() => {
                  setEditingUsuario(null);
                  setIsUsuarioModalOpen(true);
                }}
                className="btn-primary"
              >
                Novo Usuário
              </button>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>E-mail (Login)</th>
                    <th>Oficina</th>
                    <th>Cargo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.id}</td>
                      <td>{usuario.nome}</td>
                      <td>{usuario.email}</td>
                      <td>{usuario.oficina_nome || "N/A"}</td>
                      <td>{usuario.role}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setEditingUsuario(usuario);
                              setIsUsuarioModalOpen(true);
                            }}
                            className="btn-edit"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUsuario(usuario.id)}
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
            </div>
          </div>
        )}

        {/* O Modal é renderizado aqui, mas só aparece quando isModalOpen é true */}
        <OficinaModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveOficina}
          oficinaParaEditar={editingOficina}
        />
        <UsuarioModal
          isOpen={isUsuarioModalOpen}
          onClose={() => setIsUsuarioModalOpen(false)}
          onSave={handleSaveUsuario}
          usuarioParaEditar={editingUsuario}
          oficinas={oficinas}
        />
      </div>
    </>
  );
};

export default AdminPage;
