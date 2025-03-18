const path = require('path');

module.exports = {
  devServer: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    client: {
      webSocketURL: {
        hostname: '0.0.0.0',
        pathname: '/ws',
        port: 3000,
      },
    },
    webSocketServer: {
      options: {
        path: '/ws',
        maxPayload: 512 * 1024, // 512KB
      },
    },
    watchOptions: {
      poll: false,
      aggregateTimeout: 300,
    },
  },
}; 