const path = require('path');
const fs = require('fs');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

// Ensure binaries are executable before packaging
const binaries = ['bin/linux/opengrep-cli']; // Add all necessary binaries here
binaries.forEach((bin) => {
  const binPath = path.resolve(__dirname, bin);
  if (fs.existsSync(binPath) && fs.statSync(binPath).isFile()) {
    fs.chmodSync(binPath, 0o755); // Ensure execute permissions
  }
});

module.exports = {
  packagerConfig: {
    asar: {
      unpack: '**/bin/**', // Ensure binaries are outside ASAR
    },
    extraResource: [path.join(__dirname, 'bin')], // Include binary folder
    win32metadata: {
      CompanyName: 'Opengrep',
      FileDescription: 'Opengrep Playground Editor',
      OriginalFilename: 'opengrep-playground.exe',
      ProductName: 'Opengrep Playground',
    },
    ignore: [
      /^\/\.git/,
      /^\/\.github/,
      /^\/coverage/,
      /^\/dist/,
      /^\/out/,
      /^\/\.vscode/,
      /^\/.*\.log$/,
      /^\/node_modules\/\.cache/,
      /^\/node_modules\/\.vite/,
      /^\/node_modules\/\.bin/,
      /^\/node_modules\/monaco-editor\/dev/,
      /^\/node_modules\/monaco-editor\/min-maps/,
    ],
    icon: path.join(__dirname, 'src', 'images', 'icon')
  },
  rebuildConfig: {},
  makers: [
    // Linux DEB and RPM Packages
    ...(isLinux
      ? [
        {
          name: '@electron-forge/maker-deb',
          config: {
            options: {
              maintainer: 'Opengrep',
              categories: ['Utility'],
              fpmOptions: {
                '--deb-user': 'root',
                '--deb-group': 'root',
              },
              icon: path.join(__dirname, 'src', 'images', 'icon.png')
            },
          },
        },
        {
          name: '@electron-forge/maker-rpm',
          config: {
            options: {
              maintainer: 'Opengrep',
              categories: ['Utility'],
              fpmOptions: {
                '--rpm-attr': [
                  '755,root,root:bin/linux/opengrep-cli',
                ],
                icon: path.join(__dirname, 'src', 'images', 'icon.png')
              },
            },
          },
        },
      ]
      : []),
    ...(isMac
      ? [
        {
          name: '@electron-forge/maker-dmg',
          config: {
            format: 'ULFO',
            icon: path.join(__dirname, 'src', 'images', 'icon.icns')
          },
        },
      ]
      : []),
    // ZIP for all platforms
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
            config: 'config/vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'config/vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'config/vite.renderer.config.mjs',
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
