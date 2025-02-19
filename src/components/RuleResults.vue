<template>
     <button @click="handleRunBinary">Run Binary</button>
    <div v-if="state.isLoading" class="containers">
        <div class="loading-container">
            <div class="loading-circle"></div>
        </div>
    </div>
    <div class="results-container" v-else>
        <div v-if="state.parsedResult">
            <div v-for="run in state.parsedResult.runs" :key="run.tool.driver.name" class="run-card">
                <h3>{{ run.tool.driver.name }}</h3>
                <div v-for="result in run.results" :key="result.ruleId" class="result-card">
                    <h4>Rule: {{ result.ruleId }}</h4>
                    <p>{{ result.message.text }}</p>
                    <div v-for="location in result.locations" :key="location.physicalLocation.artifactLocation.uri" class="location-card">
                        <p><strong>File:</strong> {{ location.physicalLocation.artifactLocation.uri }}</p>
                        <p><strong>Snippet:</strong> {{ location.physicalLocation.region.snippet.text }}</p>
                    </div>
                </div>
            </div>
        </div>
        <pre v-else>{{ state.result }}</pre>
    </div>
</template>

<script setup>
import { ref, inject, onMounted, defineProps, defineEmits, reactive } from 'vue';

const props = defineProps({
    language: {
        type: String,
        required: true
    },
});

const emit = defineEmits(['binaryEnded']);

const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');

const state = reactive({
    result: '',
    isLoading: false,
    parsedResult: null,
    rulesPath: '',
    codeSamplePath: '',
    rootDir: ''
});

onMounted(async () => {
    await initializePaths();
});

async function initializePaths() {
    try {
        state.rootDir = await getRootDir();
        state.rulesPath = await joinPath(state.rootDir, 'rules');
        state.codeSamplePath = await joinPath(state.rootDir, 'code', props.language);
    } catch (error) {
        console.error("Error initializing paths:", error);
    }
}

async function handleRunBinary() {
    try {
        state.isLoading = true;
        const binaryPath = await joinPath(state.rootDir, 'opengrep_osx_arm64'); // TODO: detect depending on OS
        const response = await runBinary(binaryPath, ["scan -f", state.rulesPath, state.codeSamplePath, "--sarif", "--dataflow-traces"]);
        state.result = response.output;
        state.parsedResult = JSON.parse(response.output);
        emit('binaryEnded', state.parsedResult);
    } catch (error) {
        console.error("Error running binary:", error);
    } finally {
        state.isLoading = false;
    }
}
</script>

<style  scoped lang="scss">
pre {
    background-color: #f5f5f5;
    border-radius: 5px;
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    height: 100%;
}

.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.loading-circle {
    border: 8px solid #f3f3f3;
    border-top: 8px solid #3498db;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 2s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.run-card {
    border: 1px solid #ddd;
    border-radius: 5px;
    padding: 15px;
    margin-bottom: 20px;
    background-color: #f9f9f9;
    font-family: 'Arial', sans-serif;
}

.results-container {
    flex: 1;
}

.result-card {
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 10px;
    margin-bottom: 15px;
    background-color: #fff;
    font-family: 'Arial', sans-serif;
}

.location-card {
    border: 1px solid #eee;
    border-radius: 5px;
    padding: 8px;
    margin-bottom: 10px;
    background-color: #fefefe;
    font-family: 'Arial', sans-serif;
}

h3, h4 {
    color: #3498db;
    font-family: 'Arial', sans-serif;
}

button {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    align-self: flex-start;
}

button:hover {
    background-color: #2980b9;
}
</style>
