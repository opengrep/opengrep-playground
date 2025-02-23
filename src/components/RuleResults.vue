<template>
    <div class="results-header">
        <h3>Results</h3>
        <button @click="handleRunBinary" :class="{ 'disabled': !store.ruleEditorCode }"
            style="align-self: flex-end;">Evaluate</button>
    </div>

    <div v-if="isLoading" class="loading-container">
        <div class="loading-circle"></div>
    </div>

    <div class="results-container" v-else>
        <!-- SCAN RESULTS -->
        <h2 @click="toggleSection('scanResults')" style="cursor: pointer;">
            Scan Results <span>{{ collapsedSections.scanResults ? '▼' : '▲' }}</span>
        </h2>
        <div v-show="!collapsedSections.scanResults" class="scrollable-section">
            <div v-if="store.jsonResult?.scanResults">
                <div v-for="(run, index) in store.jsonResult.scanResults.runs" :key="run.tool.driver.name"
                    class="run-card">
                    <div style="cursor: pointer;">
                        <div v-for="(result, resultIndex) in run.results" :key="result.ruleId" class="result-card">
                            <div @click="toggleCollapse(resultIndex)"
                                style="display: flex; justify-content: space-between; align-items: center;">
                                <h4>Rule: {{ result.ruleId }}</h4>
                                <span>{{ collapsedRuns[resultIndex] ? '▼' : '▲' }}</span>
                            </div>
                            <div class="result-body" v-show="!collapsedRuns[resultIndex]">
                                <p>{{ result.message.text }}</p>
                                <div v-for="location in result.locations"
                                    :key="location.physicalLocation.artifactLocation.uri" class="location-card">
                                    <p><strong>Snippet on line {{ location.physicalLocation.region.startLine
                                            }}:</strong><br><br>{{ location.physicalLocation.region.snippet.text
                                        }}
                                    </p>
                                </div>
                            </div>
                            <div class="result-footer" v-if="result.codeFlows?.length > 0">
                                <button class="small" @click="handleShowDataFlows(result)"
                                    style="align-self: center;">Show
                                    dataflows</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- TEST RESULTS -->
        <h2 @click="toggleSection('testResults')" style="cursor: pointer;">
            Test Results <span>{{ collapsedSections.testResults ? '▼' : '▲' }}</span>
        </h2>
        <div v-show="!collapsedSections.testResults" class="scrollable-section">
            <div v-if="store.jsonResult?.parsedTestResults" class="test-results">
                <div v-for="testResult of store.jsonResult?.parsedTestResults" class="test-result-card"
                    :class="{ 'passed': testResult.status === 'SUCCESS', 'failed': testResult.status !== 'SUCCESS' }">
                    <p>{{ getMatchSatusText(testResult) }}
                        <span> line {{ testResult.lineNumber }}</span>
                    </p>
                    <span class="status-badge"
                        :class="{ 'pass': testResult.status === 'SUCCESS', 'fail': testResult.status !== 'SUCCESS' }">
                        {{ testResult.status === 'SUCCESS' ? 'PASS' : 'FAIL' }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { inject, defineEmits, ref } from 'vue';
import { store } from '../store'

const emit = defineEmits(['showDataFlows']);

const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');
const getPlatform = inject('$getPlatform');

const isLoading = ref(false);
const collapsedRuns = ref({});
const collapsedSections = ref({
    scanResults: false,
    testResults: false
});

async function handleRunBinary() {
    if (!store.ruleEditorCode) return;

    try {
        isLoading.value = true;
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
        const binaryPath = await joinPath(store.rootDir, 'bin', binaryFileName);

        console.log("Running binary at path:", binaryPath);
        console.log("Rules path:", store.ruleFilePath);
        console.log("Code sample path:", store.codeSampleFilePath);

        const [response, testResponse] = await Promise.all([
            runBinary(`"${binaryPath}"`, ["scan", `-f "${store.ruleFilePath}" "${store.codeSampleFilePath}"`, "--sarif", "--dataflow-traces", "--matching-explanations", `--json-output="${store.safeDir}/findings.json"`]),
            runBinary(`"${binaryPath}"`, ["scan", "--test", `-f "${store.ruleFilePath}" "${store.codeSampleFilePath}"`, "--json"])
        ]);

        const scanResults = JSON.parse(response.output);
        const testResults = JSON.parse(testResponse.output);

        // Initialize collapsed state for each result in each run
        scanResults.runs.forEach((run) => {
            run.results.forEach((result, resultIndex) => {
                collapsedRuns[resultIndex] = false;
            });
        });

        store.jsonResult = {
            ...store.jsonResult,
            scanResults,
            testResults
        };

        console.log("json result:", store.jsonResult);
    } catch (error) {
        console.error("Error running binary:", error);
    } finally {
        isLoading.value = false;
    }
}

function toggleCollapse(index) {
    collapsedRuns[index] = !collapsedRuns[index];
}

function toggleSection(section) {
    collapsedSections.value[section] = !collapsedSections.value[section];
}

function handleShowDataFlows(result) {
    emit('showDataFlows', result);
}

function getMatchSatusText(result) {
    if (!result.mustMatch && result.status === 'UNTESTED') {
        return 'Untested match on';
    }
    return result.mustMatch ? 'Must match' : 'Must not match';
}
</script>

<style scoped>
.results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.test-results {
    font-family: Arial, sans-serif;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    grid-gap: 8px;
    white-space: nowrap;
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
    padding: 8px;
    margin-top: 8px;
    border: 1px solid #ccc;
    background-color: #f8f8f8;
    position: relative;
}

.test-result-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.result-body {
    margin-bottom: 8px;
}


.status-badge {
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

/* Scrollable Sections */
.scrollable-section {
    max-height: 300px;
    overflow-y: auto;
}
</style>