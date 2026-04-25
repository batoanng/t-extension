import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { ReduxPage } from '@/pages/redux';
import { ReactQueryPage } from '@/pages/react-query';

export function AppRouter() {
  return (
    <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/redux" element={<ReduxPage />} />
    <Route path="/react-query" element={<ReactQueryPage />} />
    <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
