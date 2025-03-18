module.exports = {
  allowedHosts: 'all',
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    },
    '/ws': {
      target: process.env.REACT_APP_API_URL || 'ws://localhost:5000',
      ws: true,
      secure: false
    }
  },
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
  }
}; 