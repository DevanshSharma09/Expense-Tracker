import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. IP Address Configuration (Change this to your laptop's Local IP)
  const API_URL = 'npx expo start --webhttp://localhost:5000/api/auth';'; // <-- Apna Port 5000 wala forward link yahan dalo
  // Check if user is already logged in when app opens
  useEffect(() => {
    const isLoggedIn = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setUserToken(token);
        }
      } catch (e) {
        console.log(`SecureStore Error: ${e}`);
      } finally {
        setIsLoading(false);
      }
    };
    isLoggedIn();
  }, []);

  // Login Action
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      if (response.data.token) {
        await SecureStore.setItemAsync('userToken', response.data.token);
        setUserToken(response.data.token);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  // Register Action
  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_URL}/register`, { name, email, password });
      if (response.data.token) {
        await SecureStore.setItemAsync('userToken', response.data.token);
        setUserToken(response.data.token);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  // Logout Action
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      setUserToken(null);
    } catch (e) {
      console.log(`Logout Error: ${e}`);
    }
  };

  return (
    <AuthContext.Provider value={{ login, register, logout, userToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};