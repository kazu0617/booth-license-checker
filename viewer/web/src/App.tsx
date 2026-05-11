import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './routes/Dashboard';
import { ProductList } from './routes/ProductList';
import { ProductDetail } from './routes/ProductDetail';
import { ManualRegister } from './routes/ManualRegister';
import { Settings } from './routes/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="manual" element={<ManualRegister />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
