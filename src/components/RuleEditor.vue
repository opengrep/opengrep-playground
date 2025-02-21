<template>
    <vue-monaco-editor :value="code" :options="MONACO_EDITOR_OPTIONS" :language="language" @mount="handleMount"
        @change="handleCodeChange" />
</template>

<script setup>
import { shallowRef, onMounted, onBeforeUnmount } from 'vue';
import yaml from 'js-yaml';

const emit = defineEmits(['update:code', 'languageDetermined']);
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
    csharp: { ext: "cs", monaco: "csharp" }
};

const editorRef = shallowRef();
const handleMount = editor => (editorRef.value = editor);


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
    emit('languageDetermined', getLanguageDetails(code));
    emit('update:code', code);
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

        return {
            extension: languageMappings[primaryLanguage].ext,
            monacoLanguage: languageMappings[primaryLanguage].monaco
        };
    } catch (error) {
        console.error("Error parsing YAML:", error);
        return null;
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});
</script>