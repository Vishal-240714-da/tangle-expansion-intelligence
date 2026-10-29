import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AnalysisForm from './pages/AnalysisForm';
import AnalysisDashboard from './pages/AnalysisDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AnalysisForm />} />
        <Route path="/analysis/:id" element={<AnalysisDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
