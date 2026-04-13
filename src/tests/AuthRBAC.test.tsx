import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import * as useAuthHook from '../hooks/useAuth';

// Mock useAuth hook
vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock useRBAC hook
vi.mock('../hooks/useRBAC', () => ({
  useRBAC: () => ({
    checkPermission: vi.fn().mockReturnValue(true),
    checkAnyPermission: vi.fn().mockReturnValue(true),
  }),
}));

describe('ProtectedRoute RBAC Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should redirect unauthenticated users to login', async () => {
    (useAuthHook.useAuth as any).mockReturnValue({
      user: null,
      isLoading: false,
      role: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path='/auth' element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute requiredRole='admin' />}>
            <Route path='/admin' element={<div>Admin Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeDefined();
  });

  it('should allow admin role to access admin route', async () => {
    (useAuthHook.useAuth as any).mockReturnValue({
      user: { id: 'admin-id' },
      isLoading: false,
      role: 'admin',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<ProtectedRoute requiredRole='admin' />}>
            <Route path='/admin' element={<div>Admin Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Dashboard')).toBeDefined();
  });

  it('should redirect non-admin users to forbidden page', async () => {
    (useAuthHook.useAuth as any).mockReturnValue({
      user: { id: 'user-id' },
      isLoading: false,
      role: 'user',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path='/forbidden' element={<div>Forbidden Page</div>} />
          <Route element={<ProtectedRoute requiredRole='admin' />}>
            <Route path='/admin' element={<div>Admin Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Forbidden Page')).toBeDefined();
  });
});
