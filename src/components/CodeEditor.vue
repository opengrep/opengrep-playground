<template>
    <vue-monaco-editor 
        :value="code" 
        :options="MONACO_EDITOR_OPTIONS" 
        :language="language" 
        defaultLanguage="javascript" 
        @mount="handleMount" 
        @change="handleChange" 
    />
</template>

<script setup>
import { shallowRef } from 'vue'

const props = defineProps(['language', 'code']);
const emit = defineEmits(['update:code']);

const MONACO_EDITOR_OPTIONS = {
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
    wordBasedSuggestionsOnlySameLanguage: true,
    semanticHighlighting: { enabled: 'configuredByTheme' },
    readOnly: false, // Allow editing
    wordWrap: "on", // Enable word wrapping
    minimap: { enabled: true }, // Show minimap
    fontSize: 14, // Adjust for readability
    lineNumbers: "on", // Show line numbers
    scrollBeyondLastLine: false, // Prevent excessive scrolling
    renderWhitespace: "boundary", // Show whitespace characters
}

const editorRef = shallowRef();
const handleMount = editor => (editorRef.value = editor);

function handleChange(value) {
    emit('update:code', value);
}

</script>