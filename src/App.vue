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
            <select class="select-container" v-model="selectedRuleFile" @change="loadSelectedRuleFile">
              <option v-for="file in ruleFiles" :key="file" :value="file">{{ file }}</option>
            </select>
          </div>
          <div class="code-editor-container">
            <CodeEditor :language="'yaml'" :code="state.yamlExample" />
          </div>
        </div>

        <!-- Code Viewer -->
        <div class="column-view">
          <div class="editor-header">
            <h3>Language Editor</h3>
            <select class="select-container" v-model="selectedCodeSampleFile" @change="loadCodeSampleFiles">
              <option v-for="file in codeSampleFiles" :key="file" :value="file">{{ file }}</option>
            </select>
          </div>
          <div class="code-editor-container">
            <CodeEditor ref="codeEditor" :language="language" :code="state.javascriptExample"
              :jsonresult="state.jsonResult" @update:code="handleCodeUpdate" />
          </div>
        </div>

        <!-- Results Viewer -->
        <div class="column-view">
          <h3>Results</h3>
          <RuleResults :style="{flex: 1, display: 'grid', gap: '12px'}" :language="language"
            :ruleFile="selectedRuleFile" :codeSampleFile="selectedCodeSampleFile" @binaryEnded="handleBinaryEnded"
            @showDataFlows="handleShowDataFlows" />
        </div>
      </div>
       <!-- Debug Rule Area -->
       <div class="debug-section">
          <DebugSection ref="debugSection" :ruleFile="selectedRuleFile" :codeSampleFile="selectedCodeSampleFile" />
        </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, inject, ref } from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import RuleResults from './components/RuleResults.vue';
import DebugSection from './components/DebugSection.vue';

const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const readFile = inject('$readFile');
const writeFile = inject('$writeFile');
const readDir = inject('$readDir');

const state = reactive({
  yamlExample: '',
  javascriptExample: '',
  jsonResult: null,
  rootDir: '',
});

const ruleFiles = ref([]);
const selectedRuleFile = ref('');
const codeSampleFiles = ref([]);
const selectedCodeSampleFile = ref('');

// TODO make language coming from user input
const language = 'javascript';

const codeEditor = ref(null);
const debugSection = ref(null);

onMounted(async () => {
  state.rootDir = await getRootDir();

  await initializeFiles(state.rootDir);
});

async function initializeFiles(rootDir) {
  await loadRuleFiles(rootDir);
  await loadCodeSampleFiles(rootDir);
}

async function loadRuleFiles(rootDir) {
  const rulesDir = await joinPath(rootDir, 'rules');
  ruleFiles.value = await readDir(rulesDir);

  if (ruleFiles.value.length > 0) {
    selectedRuleFile.value = ruleFiles.value[0];
    await loadSelectedRuleFile();
  }
}

async function loadCodeSampleFiles(rootDir) {
  const languageDir = await joinPath(rootDir, 'code', language);
  codeSampleFiles.value = await readDir(languageDir);

  if (codeSampleFiles.value.length > 0) {
    selectedCodeSampleFile.value = codeSampleFiles.value[0];
    await loadSelectedCodeSampleFile();
  }
}

async function loadFile(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    console.error("Failed to read file:", error);
  }
}

async function loadSelectedRuleFile() {
  const yamlPath = await joinPath(state.rootDir, 'rules', selectedRuleFile.value);
  state.yamlExample = await loadFile(yamlPath);
}

async function loadSelectedCodeSampleFile() {
  const languagePath = await joinPath(state.rootDir, 'code', language, selectedCodeSampleFile.value);
  state.javascriptExample = await loadFile(languagePath);
}

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
  console.log('Code updated:', code);
  try{
  const codeSampleFile = await joinPath(state.rootDir, 'code', language, selectedCodeSampleFile.value);
    await writeFile(codeSampleFile, code);
    
  }catch(error) {
    console.error("Error saving code:", error);
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

  .debug-section{
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
