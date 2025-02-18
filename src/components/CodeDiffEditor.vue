<template>
  <vue-monaco-diff-editor
    theme="vs-dark"
    original="// the original code"
    modified="// the modified code"
    language="javascript"
    :options="OPTIONS"
    @mount="handleMount"
  />
</template>

<script lang="js" setup>
import { shallowRef } from 'vue'

const OPTIONS = {
  automaticLayout: true,
  formatOnType: true,
  formatOnPaste: true,
  defaultLanguage: 'javascript',
  semanticHighlighting: { enabled: true },
}

const diffEditor = shallowRef()
const handleMount = diffEditorInstance => (diffEditor.value = diffEditorInstance)

// get the original value
function getOriginalValue() {
  return diffEditor.value.getOriginalEditor().getValue()
}

// get the modified value
function getModifiedValue() {
  return diffEditor.value.getModifiedEditor().getValue()
}
</script>