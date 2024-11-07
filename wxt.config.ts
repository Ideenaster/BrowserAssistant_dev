import { defineConfig } from 'wxt';
import packageJson from './package.json';
// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    manifest_version: 3,
    name: 'Chrome Extension',
    description: 'Chrome Extension',
    version: packageJson.version,
    permissions: [
      'storage',
      'alarms',
      'notifications',
      'background',
      'tabs'
    ],
    web_accessible_resources: [{
      resources: ['assets/*'],  // 允许访问资源文件
      matches: ['<all_urls>']
    }],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval' http://localhost:3000; object-src 'self';"
    },
  }
});
