import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import ChecklistPage from './pages/ChecklistPage.jsx';

import './App.css';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <img className='img-header' src="./LOGO.png" alt="" />
        <h1>OfiCheck</h1>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
        
          <Route path="/checklist/:id" element={<ChecklistPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;