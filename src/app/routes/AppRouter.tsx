import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/home';

export function AppRouter() {
  return (
    <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
