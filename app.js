// Entry point for HostGator cPanel Node.js Application Manager
// This file executes the compiled production bundle
process.env.NODE_ENV = 'production';
require('./dist/server.cjs');
