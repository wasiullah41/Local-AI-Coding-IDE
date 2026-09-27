import axios from 'axios';

// Backend port is 3001
export const apiService = axios.create({
  baseURL: 'http://localhost:3001/api',
});
