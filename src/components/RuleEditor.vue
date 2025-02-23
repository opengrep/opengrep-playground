<template>
    <vue-monaco-editor :value="code" :options="MONACO_EDITOR_OPTIONS" :language="language" @mount="handleMount"
        @change="handleCodeChange" />
</template>

<script setup>
import { shallowRef, onMounted, onBeforeUnmount } from 'vue';
import yaml from 'js-yaml';
import { store } from '../store'

const emit = defineEmits(['ruleEditorUpdated']);
const language = 'yaml';

const MONACO_EDITOR_OPTIONS = {
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
    wordBasedSuggestionsOnlySameLanguage: true,
    semanticHighlighting: { enabled: 'configuredByTheme' },
    readOnly: false,
    wordWrap: "on",
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    renderWhitespace: "boundary",
    glyphMargin: true,
    lineNumbersMinChars: 3,
    scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden'
    }
};
const languageMappings = {
    js: { ext: "js", monaco: "javascript" },
    ts: { ext: "ts", monaco: "typescript" },
    javascript: { ext: "js", monaco: "javascript" },
    typescript: { ext: "ts", monaco: "typescript" },
    python: { ext: "py", monaco: "python" },
    go: { ext: "go", monaco: "go" },
    java: { ext: "java", monaco: "java" },
    c: { ext: "c", monaco: "c" },
    cpp: { ext: "cpp", monaco: "cpp" },
    php: { ext: "php", monaco: "php" },
    ruby: { ext: "rb", monaco: "ruby" },
    swift: { ext: "swift", monaco: "swift" },
    kotlin: { ext: "kt", monaco: "kotlin" },
    rust: { ext: "rs", monaco: "rust" },
    csharp: { ext: "cs", monaco: "csharp" },
    terraform: { ext: "tf", monaco: "terraform" },
    yaml: { ext: "yaml", monaco: "yaml" },
    yml: { ext: "yml", monaco: "yaml" },
    scala: { ext: "yml", monaco: "yaml" },
    json: { ext: "json", monaco: "json" },
    xml: { ext: "xml", monaco: "xml" },
    sql: { ext: "sql", monaco: "sql" },
    dockerfile: { ext: "dockerfile", monaco: "dockerfile" },
    plaintext: { ext: "txt", monaco: "plaintext" },
    dart: { ext: "dart", monaco: "dart" },
    elixir: { ext: "ex", monaco: "plaintext" },
    jsp: { ext: "jsp", monaco: "jsp" },
    html: { ext: "html", monaco: "html" },
    css: { ext: "css", monaco: "css" },
    scss: { ext: "scss", monaco: "scss" },
    less: { ext: "less", monaco: "less" },
    bash: { ext: "bash", monaco: "shell" },
    apex: { ext: "cls", monaco: "apex" },
    closure: { ext: "clj", monaco: "clojure" },
    libsonnet: { ext: "jsonnet", monaco: "jsonnet" },
    ocaml: { ext: "ml", monaco: "ocaml" },
    solidity: { ext: "sol", monaco: "solidity" },
    generic: { ext: null, monaco: "plaintext" },
    vue: { ext: "vue", monaco: "javascript" },
    react: { ext: "jsx", monaco: "javascript" },
    angular: { ext: "ts", monaco: "typescript" },
    svelte: { ext: "svelte", monaco: "javascript" },
};

const editorRef = shallowRef();
const handleMount = editor => (editorRef.value = editor);
onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});
onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

// Function to handle keydown events
function handleKeyDown(event) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const isSaveShortcut = (isMac && event.metaKey && event.key === 's') || (!isMac && event.ctrlKey && event.key === 's');

    if (isSaveShortcut) {
        event.preventDefault(); // Prevent the default save dialog
        const latestCode = editorRef.value.getValue(); // Get the latest value of the editor code
        emit('update:code', latestCode); // Emit the update:code event with the latest code
    }
}

function handleCodeChange(code) {
    store.languageDetails = getLanguageDetails(code);
    store.ruleEditorCode = code;
    emit('ruleEditorUpdated');
};

function getLanguageDetails(yamlContent) {
    try {
        const parsedYaml = yaml.load(yamlContent);

        if (!parsedYaml || !parsedYaml.rules || parsedYaml.rules.length === 0) {
            throw new Error("Invalid YAML format or missing rules.");
        }

        const languages = parsedYaml.rules[0].languages; // Take the first rule
        if (!languages || languages.length === 0) {
            throw new Error("No languages specified in YAML.");
        }

        // Get the first supported language
        const primaryLanguage = languages.find(lang => languageMappings[lang]);

        if (!primaryLanguage) {
            throw new Error("Unsupported language detected.");
        }

        let extension = languageMappings[primaryLanguage].ext;

        if(primaryLanguage === 'generic') {
           extension = parsedYaml.rules[0].paths.include[0].split('.').pop()
        }
        return {
            extension,
            monacoLanguage: languageMappings[primaryLanguage].monaco
        };
    } catch (error) {
        console.error("Error parsing YAML:", error);
        return null;
    }
}
</script>