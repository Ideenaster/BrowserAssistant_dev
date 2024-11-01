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
    permissions: ['storage'],
  },
});
