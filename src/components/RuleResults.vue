<template>
    <button @click="handleRunBinary">Run Binary</button>
    
    <div v-if="state.isLoading" class="loading-container">
        <div class="loading-circle"></div>
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

            <div class="test-results">
                <h3>{{ passedTests }} / {{ totalTests }} Tests Passed</h3>
                <div v-for="(fileResults, filePath) in state.testResults.results" :key="filePath" class="test-file">
                    <h4>File: {{ filePath }}</h4>

                    <div 
                        v-for="(check, ruleId) in fileResults.checks" 
                        :key="ruleId"
                        class="test-result-card"
                        :class="{ 'passed': check.passed, 'failed': !check.passed }"
                    >
                        <span class="status-badge" :class="{ 'pass': check.passed, 'fail': !check.passed }">
                            {{ check.passed ? 'PASS' : 'FAIL' }}
                        </span>
                        
                        <h4 class="rule-title">Rule: {{ ruleId }}</h4>

                        <div style="display: flex; justify-content: space-between;">
                            <div v-for="(matches, codePath) in check.matches" :key="codePath" class="match-info">
                                <p><strong>Expected Lines:</strong> 
                                    <span v-for="(line, index) in matches.expected_lines" :key="line" :class="getLineClass(line, matches.reported_lines)">
                                         {{ ' ' + line }}<span v-if="index < matches.expected_lines.length - 1">, </span>
                                    </span>
                                </p>
                                <p><strong>Reported Lines:</strong> {{ matches.reported_lines.join(', ') }}</p>
                            </div>

                            <div v-if="check.errors.length" class="error-section">
                                <h5>Errors:</h5>
                                <ul>
                                    <li v-for="(error, index) in check.errors" :key="index" class="error-message">
                                        {{ error }}
                                    </li>
                                </ul>
                            </div>
                            <button class="small" @click="handleShowDataFlows">Show dataflows</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <pre v-else>{{ state.result }}</pre>
    </div>
</template>

<script setup>
import { inject, defineProps, defineEmits, reactive, watch, computed } from 'vue';

const props = defineProps({
    language: {
        type: String,
        required: true
    },
    ruleFile: {
        type: String,
        required: true
    },
    codeSampleFile: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['binaryEnded', 'showDataFlows']);

const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');

const state = reactive({
    result: '',
    isLoading: false,
    parsedResult: null,
    testResults: [],
    rulesPath: '',
    codeSamplePath: '',
    rootDir: ''
});

// Compute total & passed tests dynamically
const totalTests = computed(() => {
    return Object.values(state.testResults.results || {})
        .flatMap(fileResults => Object.values(fileResults.checks))
        .length;
});

const passedTests = computed(() => {
    return Object.values(state.testResults.results || {})
        .flatMap(fileResults => Object.values(fileResults.checks))
        .filter(check => check.passed).length;
});

watch(
    () => [props.language, props.ruleFile, props.codeSampleFile],
    async (newValues) => {
        if (newValues.every(value => value)) {
            await initializePaths();
        }
    },
    { immediate: true }
);

async function initializePaths() {
    try {
        state.rootDir = await getRootDir();
        state.rulesPath = await joinPath(state.rootDir, 'rules', props.ruleFile);
        state.codeSamplePath = await joinPath(state.rootDir, 'code', props.language, props.codeSampleFile);
    } catch (error) {
        console.error("Error initializing paths:", error);
    }
}

async function handleRunBinary() {

    try {
        state.isLoading = true;
       
        const binaryPath = await joinPath(state.rootDir, 'opengrep_osx_arm64');
        const response = await runBinary(binaryPath, ["scan -f", state.rulesPath, state.codeSamplePath, "--sarif", "--dataflow-traces", "--matching-explanations", "--json-output=tmp/findings.json"]);
        state.result = response.output;
        state.parsedResult = JSON.parse(response.output);

        const testResponse = await runBinary(binaryPath, ["scan", "--test", `-f ${state.rulesPath} ${state.codeSamplePath}`, "--dataflow-traces --json"]);
        state.testResults = JSON.parse(testResponse.output);

        emit('binaryEnded', {
            parsedResult: state.parsedResult,
            testResults: state.testResults
        });
    } catch (error) {
        console.error("Error running binary:", error);
    } finally {
        state.isLoading = false;
    }
}

function getLineClass(line, reportedLines) {
    return reportedLines.includes(line) ? '' : 'reported';
}

function handleShowDataFlows() {
    emit('showDataFlows');
}
</script>

<style scoped>
/* General styles */
.test-results {
    font-family: Arial, sans-serif;
}

h3 {
    font-size: 18px;
    font-weight: bold;
}

.test-file {
    margin-bottom: 20px;
}

/* Test Result Card */
.test-result-card {
    border-radius: 6px;
    padding: 15px;
    margin-top: 10px;
    border: 1px solid #ccc;
    background-color: #f8f8f8;
    position: relative;
}

.status-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    border-radius: 5px;
    font-weight: bold;
}

.status-badge.pass {
    background-color: #28a745;
    color: white;
}

.status-badge.fail {
    background-color: #dc3545;
    color: white;
}

.passed {
    border-left: 5px solid #28a745;
}

.failed {
    border-left: 5px solid #dc3545;
}

.rule-title {
    font-size: 16px;
    font-weight: bold;
}

.match-info p {
    margin: 5px 0;
}

.expected {
    color: #28a745;
}

.reported {
    color: #dc3545;
    font-weight: bold;
}

.error-section {
    background-color: #ffebee;
    padding: 10px;
    margin-top: 10px;
    border-radius: 5px;
}

.error-message {
    color: #c62828;
}

/* Button Styling */
button {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.3s ease;

    &.small {
        padding: 5px 10px;
        height: 50%;
        align-self: flex-end;
    }
}

button:hover {
    background-color: #2980b9;
}

/* Loading Spinner */
.loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
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
</style>