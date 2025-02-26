<br />
<p align="center">
    <a href="https://github.com/opengrep">
        <picture>
            <source media="(prefers-color-scheme: light)" srcset="images/opengrep-modern-banner-dark.png">
            <source media="(prefers-color-scheme: dark)" srcset="images/opengrep-modern-banner-dark.png">
            <img src="https://raw.githubusercontent.com/opengrep/opengrep-playground/main/images/opengrep-modern-banner-dark.png" width="100%" alt="Opengrep logo"/>
        </picture>
    </a>
</p>

### Welcome to Opengrep Playground

_Opengrep is a fork of Semgrep, created by Semgrep Inc. Opengrep is not affiliated with or endorsed by Semgrep Inc._

Opengrep aims to make secure software development a shared standard by providing open and advanced static code analysis for developers and organizations. Initiated by a collective of AppSec organizations, including Aikido.dev, Arnica, Amplify, Endor, Jit, Kodem, Mobb, and Orca Security, Opengrep is open to any individual or organization to leverage and contribute.


This playground is for testing SAST (Static Application Security Testing) security rules written in YAML with corresponding code snippets in various programming languages.  
The playground can be used for:
- Testing new SAST security rules
- Debugging and troubleshooting existing rules
- Learning and practicing writing security rules
- Analyzing code snippets for security vulnerabilities

Usage:
- Copy and paste your YAML rules and code snippets into the playground
- Run the script to see the output and debug any issues
- Review the test results and code flow information to refine your rules

## Installation

Download binaries from the latest alpha [release](https://github.com/opengrep/opengrep-playground/releases).

### MacOS Zip Installation

1. Unpack the zip file
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

## More

TODO
<!-- - [Contributing](CONTRIBUTING.md)
- [License (LGPL-2.1)](LICENSE) -->
