import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LiveMonitoring from './pages/LiveMonitoring';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveMonitoring />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

/* 
// ALTERNATIVE: Temporary version without routing (uncomment to use)
// import Layout from './components/Layout';
// import LiveMonitoring from './pages/LiveMonitoring';
// 
// function App() {
//   return (
//     <Layout>
//       <LiveMonitoring />
//     </Layout>
//   );
// }
// export default App;
*/
