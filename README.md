# Sistema de Checklist Veicular

Este é um sistema completo de checklist para vistoria de veículos, construído com o stack PERN (PostgreSQL, Express, React, Node.js).

## 🚀 Funcionalidades

* **Gerenciamento de Ordens de Serviço:** Crie, liste, edite e delete Checklist.
* **Busca em Tempo Real:** Filtre a lista de OS por cliente, placa ou modelo do veículo.
* **Checklist Dinâmico:** Preencha um checklist detalhado com diferentes tipos de input (opções, texto, número, slider).
* **Gerenciamento de Mídia:** Faça upload, visualize e delete fotos para cada checklist.
* **Relatórios em PDF:** Gere um relatório profissional em PDF para cada vistoria, incluindo os dados, itens, fotos e assinatura.
* **Assinatura Digital:** Capture a assinatura do cliente diretamente na tela.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React (com Vite), Axios
* **Backend:** Node.js, Express.js
* **Banco de Dados:** PostgreSQL
* **Geração de PDF:** `pdfkit`
* **Upload de Arquivos:** `multer`
* **Assinatura:** `react-signature-canvas`

## ⚙️ Como Rodar Localmente

Siga os passos abaixo para configurar e rodar o projeto na sua máquina.

### Pré-requisitos

* Node.js (versão 18 ou superior)
* PostgreSQL instalado e rodando.
* Um cliente de banco de dados (DBeaver, pgAdmin, etc.).

### 1. Configuração do Backend

```bash
# Navegue para a pasta do backend
cd backend

# Instale as dependências
npm install

# Crie um arquivo .env na raiz da pasta 'backend' e preencha com suas credenciais.
# Use o arquivo 'env.example' como modelo:
```

**Arquivo `backend/.env.example` (exemplo):**
```
DB_USER=seu_usuario_postgres
DB_HOST=localhost
DB_DATABASE=checklist
DB_PASSWORD=sua_senha_do_postgres
DB_PORT=5432
```

```bash
# Depois de configurar o .env e criar o banco 'checklist' no seu PostgreSQL,
# execute o script SQL mais recente para criar as tabelas e popular os itens.

# Inicie o servidor do backend
node app.js
```
O servidor estará rodando em `http://localhost:3001`.

### 2. Configuração do Frontend

```bash
# Em um NOVO terminal, navegue para a pasta do frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento do React
npm run dev
```
A aplicação estará acessível em `http://localhost:5173` (ou a porta que o Vite indicar).

---

