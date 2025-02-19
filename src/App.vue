<template>
  <div class="container">
    <!-- Main Editor Section -->
    <div class="editor">
      <div class="header">
        <span class="title">untitled_rule</span>
      </div>

      <!-- Rule Editor -->
      <div class="code-area">
        <div class="rule-editor">
          <h3>Rule Editor</h3>
          <div class="code-editor-container">
            <CodeEditor :language="'yaml'" :code="state.yamlExample" />
          </div>
        </div>

        <!-- Code Viewer -->
        <div class="code-view">
          <h3>Language Editor</h3>
          <div class="code-editor-container">
            <CodeEditor :language="language" :code="state.javascriptExample" :jsonresult="state.jsonResult" />
          </div>
        </div>

        <div class="results-view">
          <h3>Results</h3>
          <RuleResults :style="{flex: 1, display: 'grid', gap: '12px'}" :language="language" @binaryEnded="handleBinaryEnded" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, inject } from 'vue';
import CodeEditor from './components/CodeEditor.vue';
import RuleResults from './components/RuleResults.vue';

const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const readFile = inject('$readFile');

const state = reactive({
  yamlExample: '',
  javascriptExample: '',
  jsonResult: null
});
const language = 'javascript';

onMounted(async () => {
  const rootDir = await getRootDir();
  const yamlPath = await joinPath(rootDir, 'rules', 'demo-javascript-md5.yaml');
  state.yamlExample = await loadFile(yamlPath);

  const languagePath = await joinPath(rootDir, 'code', language, 'main.js');
  state.javascriptExample = await loadFile(languagePath);
});

async function loadFile(filePath) {
  try {
    return await readFile(filePath);
  } catch (error) {
    console.error("Failed to read file:", error);
  }
}

const handleBinaryEnded = (result) => {
  state.jsonResult = result;
};
</script>

<style lang="scss">
$border-color: #3c3c3c;


/* Layout */
.container {
  display: flex;
  height: 100vh;
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
  }

  .code-area {
    display: flex;
    flex: 1;
  }

  .rule-editor {
    width: 300px;
    padding: 15px;
    border-right: 1px solid $border-color;
    flex: 1;
    padding: 15px;
    overflow: auto;
    font-family: monospace;
    display: flex;
    flex-direction: column;
  }

  .code-view {
    flex: 1;
    padding: 15px;
    border-right: 1px solid $border-color;
    overflow: auto;
    font-family: monospace;
    display: flex;
    flex-direction: column;
  }

  .results-view {
    width: 300px;
    padding: 15px;
    border-right: 1px solid $border-color;
    flex: 1;
    padding: 15px;
    overflow: auto;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    gap: 12px;
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
