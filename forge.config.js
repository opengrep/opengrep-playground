const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const isLinux = process.platform === 'linux';

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/bin/**', // Ensure binaries are outside ASAR
    },
    extraResource: ['bin'], // Ensure 'bin' folder is included in the package
    icon: {
      win32: 'assets/app-icon.ico', // Windows icon
      darwin: 'assets/app-icon.icns', // macOS icon
      linux: 'assets/app-icon.png', // Linux icon
    },
  },
  rebuildConfig: {},
  makers: [
    // ✅ Linux DEB Package (For Ubuntu/Debian)
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Your Name',
          homepage: 'https://yourwebsite.com',
          categories: ['Utility'],
        },
      },
    },
    // ✅ Linux RPM Package (For Fedora/RHEL)
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Your Name',
          homepage: 'https://yourwebsite.com',
          categories: ['Utility'],
        },
      },
    },
    // ✅ Windows Installer (Squirrel)
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'your-app-name',
        setupIcon: 'assets/app-icon.ico',
        loadingGif: 'assets/loading.gif',
        authors: 'Your Company',
        exe: 'your-app-name.exe',
      },
    },
    // ✅ Windows ZIP Package (Portable)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin'],
    },
    // ✅ Windows MSI Installer (WiX)
    {
      name: '@electron-forge/maker-wix',
      config: {
        language: 1033, // English
        manufacturer: 'Your Company',
        upgradeCode: '4e29d7a3-62b5-4e2f-91e3-2c4370b53a2e', // Replace with a unique UUID
        icon: 'assets/app-icon.ico',
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};