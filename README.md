## Installation

Download binaries from the latest [release](https://github.com/opengrep/opengrep-playground/releases).

### MacOS Zip or Dmg Installation

1. Unpack the zip file (Zip download only)
2. Move the app to the applications folder
3. Execute the following code in terminal

    ``` shell
    xattr -c "/Applications/opengrep-playground.app/"
    ```

### Linux Rpm Installation

1. Open terminal and go to the download location
2. Execute the following code in terminal

    Fedora installation
    ``` shell
    sudo dnf install ./opengrep-playground.rpm
    ```

    Other linux
    ``` shell
    sudo yum install ./opengrep-playground.rpm
    ```

### Linux Deb Installation

1. Open terminal and go to the download location
2. Execute the following code in terminal

    ``` shell
    sudo apt install ./opengrep-playground.deb
    ```

### Windows Zip Installation

1. Unpack the zip file
2. Run the app

## Versioning

The playground uses calendar versioning, `YYYY.M.PATCH` (for example `2026.10.0`), independent of the Opengrep version it bundles. The footer of the app shows both versions.

The bundled Opengrep release is set by `opengrepVersion` in `package.json`. CI downloads `opengrep-core` from the [opengrep/opengrep](https://github.com/opengrep/opengrep/releases) release tagged `v<opengrepVersion>`.
