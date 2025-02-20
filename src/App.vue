<template>
  <div class="container">
    <!-- Main Editor Section -->
    <div class="editor">
      <div class="header">
        <span class="title">untitled_rule</span>
      </div>

      <!-- Rules Editor -->
      <div class="code-area">
        <div class="column-view">
          <div class="editor-header">
            <h3>Rule Editor</h3>
          </div>
          <div class="code-editor-container">
            <RuleEditor @update:code="handleRuleUpdate" @languageDetermined="handleCodeEditorLanguage" />
          </div>
        </div>

        <!-- Code Viewer -->
        <div class="column-view">
          <div class="editor-header">
            <h3>Language Editor</h3>
          </div>
          <div class="code-editor-container">
            <CodeEditor ref="codeEditor" :language="state.languageDetails?.monacoLanguage"
              :jsonresult="state.jsonResult" @update:code="handleCodeUpdate" />
          </div>
        </div>

        <!-- Results Viewer -->
        <div class="column-view">
          <h3>Results</h3>
          <RuleResults :style="{flex: 1, display: 'grid', gap: '12px'}" :language="language"
            :ruleFile="state.selectedRuleFilePath" :codeSampleFile="state.selectedCodeSampleFilePath" @binaryEnded="handleBinaryEnded"
            @showDataFlows="handleShowDataFlows" />
        </div>
      </div>
      <!-- Debug Rule Area -->
      <div class="debug-section">
        <DebugSection ref="debugSection" :ruleFile="state.selectedRuleFilePath" :codeSampleFile="state.selectedCodeSampleFilePath"
          @inspectLocationChanged="handleInspectLocationChanged" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, inject, ref } from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import RuleResults from './components/RuleResults.vue';
import DebugSection from './components/DebugSection.vue';
import RuleEditor from './components/RuleEditor.vue';

const getSafeDir = inject('$getSafeDir');
const joinPath = inject('$joinPath');
const writeFile = inject('$writeFile');

const state = reactive({
  jsonResult: null,
  safeDir: '',
  languageDetails: null,
  selectedRuleFilePath: null,
  selectedCodeSampleFilePath: null,
});

// TODO make language coming from user input
const codeEditor = ref(null);
const debugSection = ref(null);
const languageCode = ref('');

onMounted(async () => {
  state.safeDir = await getSafeDir();
});

async function handleBinaryEnded(result) {
  state.jsonResult = result;
  await debugSection.value.generateDebuggingInfo();
};

function handleShowDataFlows() {
  if (codeEditor.value) {
    codeEditor.value.determineCodeFlowInformation();
  }
};

async function handleCodeUpdate(code) {
  try {
    languageCode.value = code;
    const codeSampleFilePath = await joinPath(state.safeDir, `untitled_code.${state.languageDetails?.extension ?? 'txt'}`);
    await writeFile(codeSampleFilePath, code, { flag: 'w' }); // 'w' flag to create or overwrite the file
    state.selectedCodeSampleFilePath = codeSampleFilePath;
  } catch (error) {
    console.error("Error saving code:", error);
  }
}

async function handleRuleUpdate(code) {
  try {
    const ruleFilePath = await joinPath(state.safeDir, 'untitled_rule.yaml');
    await writeFile(ruleFilePath, code, { flag: 'w' }); // 'w' flag to create or overwrite the file
    state.selectedRuleFilePath = ruleFilePath;
    await handleCodeUpdate(languageCode.value);
  } catch (error) {
    console.error("Error saving code:", error);
  }
}

function handleInspectLocationChanged(debugCodeLocation) {
  if (codeEditor.value) {
    codeEditor.value.highlightDebugLocationCode(debugCodeLocation);
  }
}

function handleCodeEditorLanguage(details) {
  console.log("Language determined:", details);
  state.languageDetails = details;
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
    flex: 1;
    overflow: auto;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .debug-section {
    padding: 15px;
    overflow: auto;
    font-family: monospace;
    flex: 1;
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
