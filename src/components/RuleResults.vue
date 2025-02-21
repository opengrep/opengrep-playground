<template>
    <button @click="handleRunBinary" :class="{ 'disabled': state.disableRun }" style="align-self: flex-end;">Evaluate</button>

    <div v-if="state.isLoading" class="loading-container">
        <div class="loading-circle"></div>
    </div>

    <div class="results-container" v-else>
        <div v-if="state.parsedResult">
            <div v-for="(run, index) in state.parsedResult.runs" :key="run.tool.driver.name" class="run-card">
                <h3>
                    {{ run.tool.driver.name }}
                </h3>
                <div style="cursor: pointer;">
                    <div v-for="(result, resultIndex) in run.results"
                        :key="result.ruleId" class="result-card">
                        <div @click="toggleCollapse(resultIndex)" style="display: flex; justify-content: space-between; align-items: center;">
                            <h4>Rule: {{ result.ruleId }}</h4>
                            <span>{{ collapsedRuns[index] ? '▼' : '▲' }}</span>
                        </div>
                        <div v-show="!collapsedRuns[resultIndex]">
                            <button class="small" @click="handleShowDataFlows(result)" style="align-self: center;">Show
                                dataflows</button>
                            <p>{{ result.message.text }}</p>
                            <div v-for="location in result.locations"
                                :key="location.physicalLocation.artifactLocation.uri" class="location-card">
                                <p><strong>Snippet:</strong><br><br>{{ location.physicalLocation.region.snippet.text }}
                                </p>
                            </div>

                            <div v-if="state.testResults.results[props.ruleFile]" class="test-results">
                                <div v-for="(check, ruleId) in state.testResults.results[props.ruleFile].checks"
                                    :key="ruleId">
                                    <div v-for="(matches, codePath) in check.matches" :key="codePath">
                                        <div class="test-result-card"
                                            :class="{ 'passed': matches.reported_lines.includes(matches.expected_lines[resultIndex]), 'failed': !matches.reported_lines.includes(matches.expected_lines[resultIndex]) }">
                                            <span class="status-badge"
                                                :class="{ 'pass': matches.reported_lines.includes(matches.expected_lines[resultIndex]), 'fail': !matches.reported_lines.includes(matches.expected_lines[resultIndex]) }">
                                                {{ matches.reported_lines.includes(matches.expected_lines[resultIndex])
                                                ? 'PASS' : 'FAIL' }}
                                            </span>
                                            <p><strong>Expected Line:</strong> {{ matches.expected_lines[resultIndex] }}
                                            </p>
                                            <p><strong>Line Status:</strong> {{
                                                matches.reported_lines.includes(matches.expected_lines[resultIndex]) ?
                                                'must match' : 'must not match' }}</p>
                                        </div>
                                    </div>
                                    <div v-if="check.errors.length" class="error-section">
                                        <h5>Errors:</h5>
                                        <ul>
                                            <li v-for="(error, index) in check.errors" :key="index"
                                                class="error-message">
                                                {{ error }}
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="test-results-summary">
                <h3>{{ passedTests }} / {{ totalTests }} Tests Passed</h3>
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
    },
    disableRun: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['binaryEnded', 'showDataFlows']);

const getSafeDir = inject('$getSafeDir');
const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');
const getPlatform = inject('$getPlatform');

const state = reactive({
    result: '',
    isLoading: false,
    parsedResult: null,
    testResults: [],
    rulesPath: '',
    codeSamplePath: '',
    safeDir: '',
    disableRun: props.disableRun
});

const collapsedRuns = reactive({});

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
        state.safeDir = await getSafeDir();
        state.rulesPath = props.ruleFile;
        state.codeSamplePath = props.codeSampleFile;
    },
    { immediate: true }
);

watch(
    () => props.disableRun,
    async (newValue) => {
        state.disableRun = newValue;
    },
    { immediate: true }
);

async function handleRunBinary() {
    if (state.disableRun) return;

    try {
        state.isLoading = true;

        // Get the correct resources path
        const rootDir = await getRootDir();

        console.log("platform:", await getPlatform());
        const platform = await getPlatform();

        // Select correct binary based on OS
        let binaryFileName;
        if (platform === 'win32') {
            binaryFileName = 'opengrep_windows_x86.exe';
        } else if (platform === 'darwin') {
            binaryFileName = 'opengrep_osx_arm64';
        } else {
            binaryFileName = 'opengrep_manylinux_x86';
        }

        // Construct the full binary path
        const binaryPath = await joinPath(rootDir, 'bin', binaryFileName);

        console.log("Running binary at path:", binaryPath);
        console.log("Rules path:", state.rulesPath);
        console.log("Code sample path:", state.codeSamplePath);

        const [response, testResponse] = await Promise.all([
            runBinary(binaryPath, ["scan", `-f "${state.rulesPath}" "${state.codeSamplePath}"`, "--sarif", "--dataflow-traces", "--matching-explanations", `--json-output="${state.safeDir}/findings.json"`]),
            runBinary(binaryPath, ["scan", "--test", `-f "${state.rulesPath}" "${state.codeSamplePath}"`, "--json"])
        ]);

        state.result = response.output;
        console.log("scan output:", response.output);
        console.log("test output:", testResponse.output);
        state.parsedResult = JSON.parse(response.output);
        state.testResults = JSON.parse(testResponse.output);

        // Initialize collapsed state for each result in each run
        state.parsedResult.runs.forEach((run) => {
            run.results.forEach((result, resultIndex) => {
                collapsedRuns[resultIndex] = false;
            });
        });

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

function toggleCollapse(index) {
    debugger;
    collapsedRuns[index] = !collapsedRuns[index];
}

function handleShowDataFlows(result) {
    emit('showDataFlows', result);
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
.test-result-card,
.result-card {
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

    &:hover:not(.disabled) {
        background-color: #2980b9;
    }

    &.disabled {
        background-color: #bdc3c7;
        cursor: not-allowed;
    }
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
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.location-card {
    background-color: #fff;
    padding: 8px;

    p {
        overflow-wrap: break-word;
    }
}
</style>