import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          api.get('/auth/me')
            .then(res => {
               const userData = res.data.data;
               setUser({
                 ...userData,
                 tenantId: userData.tenant?.id || userData.tenantId,
                 avatarUrl: userData.avatar_url || userData.avatarUrl || ''
               });
            })
            .catch(() => logout())
            .finally(() => setLoading(false));
        }
      } catch (error) {
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password, subdomain, requiredRole) => {
    try {
      const res = await api.post('/auth/login', { 
        email, 
        password, 
        tenantSubdomain: subdomain,
        requiredRole 
      });
      const newToken = res.data.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(res.data.data.user); 
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (data) => {
    try {
      await api.post('/auth/register-tenant', data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;