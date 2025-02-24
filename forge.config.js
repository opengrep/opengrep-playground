const path = require('path');
const fs = require('fs');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// ✅ Ensure binaries are executable before packaging
const binaries = ['bin/opengrep_manylinux_x86']; // Add all necessary binaries here
binaries.forEach((bin) => {
  const binPath = path.resolve(__dirname, bin);
  if (fs.existsSync(binPath)) {
    fs.chmodSync(binPath, 0o755); // Ensure execute permissions
  }
});

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/bin/**', // Ensure binaries are outside ASAR
    },
    extraResource: ['bin'], // Include binary folder
    win32metadata: {
      CompanyName: 'Opengrep',
      FileDescription: 'Opengrep Playground Editor',
      OriginalFilename: 'opengrep-playground.exe',
      ProductName: 'Opengrep Playground',
    },
  },
  rebuildConfig: {},
  makers: [
    // ✅ Linux DEB and RPM Packages
    ...(isLinux
      ? [
          {
            name: '@electron-forge/maker-deb',
            config: {
              options: {
                maintainer: 'Opengrep',
                homepage: 'https://yourwebsite.com',
                categories: ['Utility'],
              },
            },
          },
          {
            name: '@electron-forge/maker-rpm',
            config: {
              options: {
                maintainer: 'Opengrep',
                homepage: 'https://yourwebsite.com',
                categories: ['Utility'],
              },
              scripts: {
                post: './postinstall.sh', // ✅ Add post-install script
              },
            },
          },
        ]
      : []),
    // ✅ Windows Installers
    ...(isWindows
      ? [
          {
            name: '@electron-forge/maker-squirrel',
            config: {
              name: 'opengrep-playground',
              setupExe: 'opengrep-playground-setup.exe',
              authors: 'Opengrep',
              exe: 'opengrep-playground.exe',
            },
          },
          {
            name: '@electron-forge/maker-wix',
            config: {
              language: 1033, // English
              manufacturer: 'Opengrep',
              upgradeCode: '', // Use a valid UUID
            },
          },
        ]
      : []),
    // ✅ macOS - DMG
    ...(isMac
      ? [
          {
            name: '@electron-forge/maker-dmg',
            config: {
              format: 'ULFO',
            },
          },
        ]
      : []),
    // ✅ ZIP for all platforms
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'darwin', 'linux'],
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