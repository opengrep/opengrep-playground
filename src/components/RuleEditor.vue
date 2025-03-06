<template>
    <vue-monaco-editor style="min-height: 0;" :options="MONACO_EDITOR_OPTIONS" :language="language" @mount="handleMount"
        @change="handleCodeChange" />
</template>

<script setup>
import { shallowRef, watch } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import yaml from 'js-yaml';
import { store } from '../store';
import { getLanguage } from '../language.mapper';

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
        vertical: 'auto',
        horizontal: 'hidden'
    }
};

const editorRef = shallowRef();
const handleMount = editor => (editorRef.value = editor);

watch(() => store.ruleEditorCode, (newCode) => {
    if (editorRef.value) {
        const model = editorRef.value.getModel();
        if (model && model.getValue() !== newCode.originalRule) {
            model.setValue(newCode.normalizedRule);
        }
    }
});

function handleCodeChange(code) {
    const parsedYamlCode = yaml.load(code);
    if (!parsedYamlCode || !parsedYamlCode.rules || parsedYamlCode.rules.length === 0) {
        return null;
    }
    const { paths, ...rest } = parsedYamlCode.rules[0];

    store.languageDetails = getLanguageDetails(rest);

    store.ruleEditorCode = {
        originalRule: code,
        normalizedRule: yaml.dump({
            ...parsedYamlCode,
            rules: [{ ...rest }]
        })
    };
    store.disableBinaryRun = !store.languageDetails;
    emit('ruleEditorUpdated');
};

function getLanguageDetails(yamlContent) {
    const languages = yamlContent?.languages
    if (!languages || languages.length === 0) {
        return null
    }

    if(languages.length > 1){
        return getLanguage('generic');
    }

    // Get the first supported language
    return getLanguage(languages[0]) ?? getLanguage('generic');
}

</script>