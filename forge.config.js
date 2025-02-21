const path = require('path');
const fs = require('fs');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';


module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/bin/**', // Ensure binaries are outside ASAR
    },
    extraResource: ['bin'],
    win32metadata: {
      CompanyName: 'Your Company',
      FileDescription: 'Your App Description',
      OriginalFilename: 'your-app-name.exe',
      ProductName: 'Your App Name',
    },
  },
  rebuildConfig: {},
  makers: [
    // ✅ Linux DEB Package (For Ubuntu/Debian)
    ...(isLinux
      ? [
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
        ]
      : []),
    // ✅ Windows Installer (Squirrel)
    ...(isWindows
      ? [
          {
            name: '@electron-forge/maker-squirrel',
            config: {
              name: 'your-app-name',
              authors: 'Your Company',
              exe: 'your-app-name.exe',
            },
          },
          {
            name: '@electron-forge/maker-wix',
            config: {
              language: 1033, // English
              manufacturer: 'Your Company',
              upgradeCode: '', // Use a valid UUID todo
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
    // ✅ macOS & Windows - ZIP (Portable)
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