import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ChecklistPage from './pages/ChecklistPage';
import LoginPage from './pages/LoginPage'; // Importa a nova página
import ProtectedRoute from './components/ProtectedRoute'; // Importa a rota protegida
import './App.css';

// Em App.jsx

function App() {
  return (
    <Routes>
      {/* Rota raiz '/' agora é a página de login e é pública */}
      <Route path="/" element={<LoginPage />} />

      {/* As rotas protegidas começam aqui */}
      <Route element={<ProtectedRoute />}>
        {/* A HomePage agora é acessível em '/home' */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/checklist/:id" element={<ChecklistPage />} />
      </Route>
    </Routes>
  );
}

export default App;