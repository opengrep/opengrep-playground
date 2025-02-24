<template>
  <div class="container">
    <!-- Main Editor Section -->
    <div class="editor">
      <!-- Rules Editor -->
      <div class="code-area">
        <div class="column-view">
          <div class="editor-header">
            <h3>Rule Editor</h3>
          </div>
          <div class="code-editor-container">
            <RuleEditor @ruleEditorUpdated="handleRuleEditorUpdate" />
          </div>
        </div>

        <!-- Code Viewer -->
        <div class="column-view">
          <div class="editor-header">
            <h3>Language Editor</h3>
          </div>
          <div class="code-editor-container">
            <CodeEditor ref="codeEditor" @codeEditorUpdated="handleCodeEditorUpdate" />
          </div>
        </div>

        <!-- Results Viewer -->
        <div class="column-view" style="flex: 1;">
          <RuleResults style="flex: 1; display: 'grid'; gap: '12px'" @showDataFlows="handleShowDataFlows" />
        </div>
      </div>
      <!-- Debug Rule Area -->
      <div class="meta-section">
        <DebugSection style="flex: 3" />
        <!-- HISTORY SECTION -->
        <div style="flex: 1">
          <h3>History</h3>
          <ul class="history-list">
            <li v-for="(entry, index) in store.history" :key="index" @click="handleHistoryClick(entry)"
              class="history-entry">
              <strong>{{ entry.editorType }}</strong> - <em>({{ entry.timestamp }})</em>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import RuleResults from './components/RuleResults.vue';
import DebugSection from './components/DebugSection.vue';
import RuleEditor from './components/RuleEditor.vue';
import { store } from './store';

const getRootDir = inject('$getRootDir');
const getSafeDir = inject('$getSafeDir');
const joinPath = inject('$joinPath');
const writeFile = inject('$writeFile');

const codeEditor = ref(null);

onMounted(async () => {
  store.safeDir = await getSafeDir();
  store.rootDir = await getRootDir();
  store.findingsPath = await joinPath(store.safeDir, "findings.json");
});

function handleShowDataFlows(ruleResult) {
  if (codeEditor.value) {
    codeEditor.value.determineCodeFlowInformation(ruleResult);
  }
};

async function handleCodeEditorUpdate() {
  try {
    if (store.ruleEditorCode === '') {
      return;
    }

    const codeSampleFilePath = await joinPath(store.safeDir, `untitled_code.${store.languageDetails?.extension ?? 'txt'}`);
    await writeFile(codeSampleFilePath, store.codeEditorCode, { flag: 'w' }); // 'w' flag to create or overwrite the file
    store.codeSampleFilePath = codeSampleFilePath;

  } catch (error) {
    console.error("Error saving code:", error);
  }
}

async function handleRuleEditorUpdate() {
  try {
    const ruleFilePath = await joinPath(store.safeDir, 'untitled_rule.yaml');
    await writeFile(ruleFilePath, store.ruleEditorCode, { flag: 'w' }); // 'w' flag to create or overwrite the file
    store.ruleFilePath = ruleFilePath;
    await handleCodeEditorUpdate();
  } catch (error) {
    console.error("Error saving code:", error);
  }
}

function handleHistoryClick(entry) {
  console.log('clicked')
  if (entry.editorType === 'code-editor') {
    store.codeEditorCode = entry.content;
  } else if (entry.editorType === 'rule-editor') {
    store.ruleEditorCode = entry.content;
  }
}
</script>

<style lang="scss">
$border-color: #3c3c3c;
$primary-color: #3498db;
$secondary-color: #2ecc71;

/* Layout */
.container {
  display: flex;
  height: 100vh;
  overflow: auto;
}

/* Main Content */
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;

  .header {
    padding: 10px;
    border-bottom: 1px solid $border-color;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .code-area {
    display: flex;
    flex: 3;
    max-height: 70%;
  }

  .column-view {
    width: 300px;
    padding: 15px;
    border-right: 1px solid $border-color;
    flex: 2;
    overflow: auto;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .meta-section {
    padding: 15px;
    overflow: auto;
    font-family: monospace;
    flex: 1;
    display: flex;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    gap: 16px;

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .history-entry {
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 8px;
        border-radius: 4px;


        &:hover {
          background: #e9ecef;
        }
      }
    }
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    select {
      background-color: $primary-color;
      border: none;
      color: white;
      padding: 10px;
      border-radius: 5px;
      cursor: pointer;
      outline: none;
      transition: background-color 0.3s ease;
    }
  }

  .code-editor-container {
    flex: 1;
  }

  .textarea-container {
    position: relative;
    height: 100%;
    width: 100%;
  }
}
</style>
