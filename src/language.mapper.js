const languageMappings = {
    js: { ext: "js", monaco: "javascript" },
    ts: { ext: "ts", monaco: "typescript" },
    javascript: { ext: "js", monaco: "javascript" },
    typescript: { ext: "ts", monaco: "typescript" },
    python: { ext: "py", monaco: "python" },
    py: { ext: "py", monaco: "python" },
    go: { ext: "go", monaco: "go" },
    java: { ext: "java", monaco: "java" },
    c: { ext: "c", monaco: "c" },
    cpp: { ext: "cpp", monaco: "cpp" },
    php: { ext: "php", monaco: "php" },
    ruby: { ext: "rb", monaco: "ruby" },
    rb: { ext: "rb", monaco: "ruby" },
    swift: { ext: "swift", monaco: "swift" },
    kotlin: { ext: "kt", monaco: "kotlin" },
    kt: { ext: "kt", monaco: "kotlin" },
    rust: { ext: "rs", monaco: "rust" },
    rs: { ext: "rs", monaco: "rust" },
    csharp: { ext: "cs", monaco: "csharp" },
    cs: { ext: "cs", monaco: "csharp" },
    terraform: { ext: "tf", monaco: "terraform" },
    tf: { ext: "tf", monaco: "terraform" },
    yaml: { ext: "yaml", monaco: "yaml" },
    yml: { ext: "yml", monaco: "yaml" },
    scala: { ext: "scala", monaco: "scala" },
    json: { ext: "json", monaco: "json" },
    xml: { ext: "xml", monaco: "xml" },
    sql: { ext: "sql", monaco: "sql" },
    dockerfile: { ext: "dockerfile", monaco: "dockerfile" },
    plaintext: { ext: "txt", monaco: "plaintext" },
    txt: { ext: "txt", monaco: "plaintext" },
    dart: { ext: "dart", monaco: "dart" },
    elixir: { ext: "ex", monaco: "elixir" },
    ex: { ext: "ex", monaco: "elixir" },
    jsp: { ext: "jsp", monaco: "jsp" },
    html: { ext: "html", monaco: "html" },
    css: { ext: "css", monaco: "css" },
    scss: { ext: "scss", monaco: "scss" },
    less: { ext: "less", monaco: "less" },
    bash: { ext: "bash", monaco: "shell" },
    apex: { ext: "cls", monaco: "apex" },
    cls: { ext: "cls", monaco: "apex" },
    closure: { ext: "clj", monaco: "clojure" },
    clj: { ext: "clj", monaco: "clojure" },
    libsonnet: { ext: "jsonnet", monaco: "jsonnet" },
    jsonnet: { ext: "jsonnet", monaco: "jsonnet" },
    ocaml: { ext: "ml", monaco: "ocaml" },
    ml: { ext: "ml", monaco: "ocaml" },
    solidity: { ext: "sol", monaco: "solidity" },
    sol: { ext: "sol", monaco: "solidity" },
    generic: { ext: 'txt', monaco: "plaintext" },
    vue: { ext: "vue", monaco: "javascript" },
    react: { ext: "jsx", monaco: "javascript" },
    jsx: { ext: "jsx", monaco: "javascript" },
    angular: { ext: "ts", monaco: "typescript" },
    svelte: { ext: "svelte", monaco: "javascript" },
};

export function getLanguage(language) {
    const mappedLanguage =  languageMappings[language];

    if(!mappedLanguage){
        return;
    }

    return {
        extension: mappedLanguage.ext,
        monacoLanguage: mappedLanguage.monaco
    };
}