<template>
    <div class="results-header">
        <h3>Results</h3>
        <button @click="handleRunBinary" :class="{ 'disabled': store.disableBinaryRun }">Evaluate</button>
    </div>

    <div class="results-container">
        <!-- SCAN RESULTS -->
        <div style="flex: 2" class="scrollable-section">
            <div v-if="isScanLoading" class="loading-container">
                <div class="loading-circle"></div>
            </div>
            <template v-else>

                <div v-if="store.jsonResult?.scanResults === null">
                    <div class="empty-state">
                        <p>No scan results.</p>
                    </div>
                </div>

                <div v-else v-for="(run, index) in store.jsonResult.scanResults?.runs" :key="run.tool.driver.name"
                    class="run-card">

                    <div v-if="run.results.length === 0">
                        <div class="empty-state">
                            <p>No scan results found.</p>
                        </div>
                    </div>
                    <div v-else v-for="(result, resultIndex) in run.results" :key="result.ruleId" class="result-card">
                        <div @click="toggleCollapse(resultIndex)"
                            style="display: flex; justify-content: space-between; align-items: center;">
                            <h4>Rule: {{ result.ruleId.split('tmp.').pop() }}</h4>
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
                            <button class="small" @click="handleShowDataFlows(result)" style="align-self: center;">Show
                                dataflows</button>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- TEST RESULTS -->
        <h4 @click="toggleSection('testResults')" style="cursor: pointer;">Test Results </h4>
        <div style="flex: 1" class="scrollable-section">
            <div v-if="isTestLoading" class="loading-container">
                <div class="loading-circle"></div>
            </div>
            <template v-else>
                <div v-if="store.jsonResult?.parsedTestResults" class="test-results">
                    <div v-if="store.jsonResult?.parsedTestResults.length === 0">
                        <div class="empty-state">
                            <p>No test results.</p>
                        </div>
                    </div>
                    <div v-else v-for="testResult of store.jsonResult?.parsedTestResults" class="test-result-card"
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
            </template>
        </div>
    </div>
</template>

<script setup>
import { inject, ref } from 'vue';
import { store } from '../store'

const emit = defineEmits(['showDataFlows']);

const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');
const getPlatform = inject('$getPlatform');
const showErrorDialog = inject('$showErrorDialog');

const isScanLoading = ref(false);
const isTestLoading = ref(false);
const collapsedRuns = ref({});


async function handleRunBinary() {
    if (!store.ruleEditorCode) return;

    setCodeChangeHistory();
    isScanLoading.value = true;
    isTestLoading.value = true;
    store.jsonResult = {
        scanResults: null,
        testResults: null,
        parsedTestResults: []
    }
    const platform = await getPlatform();
    let windowsCliFix = "";

    // Select correct binary based on OS
    let binaryFileName;
    if (platform === 'win32') {
        binaryFileName = 'opengrep_windows_x86.exe';
        windowsCliFix = "-j 1";
    } else if (platform === 'darwin') {
        binaryFileName = 'opengrep_osx_arm64';
    } else {
        binaryFileName = 'opengrep_manylinux_x86';
    }
    // Construct the full binary path
    const binaryPath = await joinPath(store.rootDir, 'bin', binaryFileName);


    try {
        await runBinaryForScan(binaryPath, windowsCliFix, runScanWithoutMatchingExplanations);
    } catch (error) {
        const errorMessage = typeof error === 'string' ? error : error.message;
        if (errorMessage.includes("the engine was killed")) {
            // Retry running the binary without matching explanations flag if the engine was killed
            await runBinaryForScan(binaryPath, windowsCliFix, true);
            return;
        }

        showErrorDialog(`Error running scanning: Please consult the error.log file at ${store.safeDir}`, error);
        console.error("Error running scanning:", error);
    } finally { 
        isScanLoading.value = false;
    }

    try {
        await runBinaryForTests(binaryPath);        
    } catch (error) {
        showErrorDialog(`Error running tests: Please consult the error.log file at ${store.safeDir}`, error);
        console.error("Error running tests:", error);
    } finally {
        isTestLoading.value = false;
    }
}

function setCodeChangeHistory() {
    // add history records
    const latestCodeEntry = store.history.findLast(entry => entry.editorType === 'code-editor');
    const latestRuleEntry = store.history.findLast(entry => entry.editorType === 'rule-editor');

    if (!latestCodeEntry || latestCodeEntry.content !== store.codeEditorCode) {
        store.history.push({
            editorType: 'code-editor',
            content: store.codeEditorCode,
            timestamp: new Date().toLocaleString()
        });
    }

    if (!latestRuleEntry || latestRuleEntry.content !== store.ruleEditorCode) {
        store.history.push({
            editorType: 'rule-editor',
            content: store.ruleEditorCode,
            timestamp: new Date().toLocaleString()
        });
    }
}

async function runBinaryForScan(binaryPath, windowsCliFix, runScanWithoutMatchingExplanations) {
    const scanArgs = [
        "scan",
        `-f "${store.ruleFilePath}" "${store.codeSampleFilePath}"`,
        "--sarif",
        "--dataflow-traces",
        `--json-output="${store.safeDir}/tmp/findings.json"`,
        windowsCliFix
    ];

    if (!runScanWithoutMatchingExplanations) {
        scanArgs.push("--matching-explanations");
    }

    const scanResponse = await runBinary(`"${binaryPath}"`, scanArgs);
    const scanResults = JSON.parse(scanResponse.output);

    if (extractScanErrors(scanResults).length > 0) {
        throw extractScanErrors(scanResults).toString()
    }

    store.jsonResult = {
        ...store.jsonResult,
        scanResults,
    };
    isScanLoading.value = false;

    // Initialize collapsed state for each result in each run
    scanResults.runs.forEach((run) => {
        run.results.forEach((result, resultIndex) => {
            collapsedRuns[resultIndex] = false;
        });
    });
}

function extractScanErrors(jsonOutput) {
    return jsonOutput.runs?.flatMap(run =>
        run.invocations?.flatMap(invocation =>
            invocation.toolExecutionNotifications?.filter(notification =>
                notification.level === "error" && notification.message?.text
            ).map(notification => notification.message.text)
        ) || []
    ) || [];
}

async function runBinaryForTests(binaryPath) {
    const testResponse = await runBinary(`"${binaryPath}"`, ["test", `-f "${store.ruleFilePath}" "${store.codeSampleFilePath}"`, "--json"])
    const testResults = JSON.parse(testResponse.output);

    const extractTestErrors = testResults.config_with_errors?.map(configError => configError.error) || [];
    if (extractTestErrors.length > 0) {
        throw extractTestErrors.toString();
    }

    store.jsonResult = {
        ...store.jsonResult,
        testResults,
    };
    isTestLoading.value = false;
}

function toggleCollapse(index) {
    collapsedRuns[index] = !collapsedRuns[index];
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

.results-container {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    overflow: hidden;
    flex: 1;
}

.test-results {
    font-family: Arial, sans-serif;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    grid-gap: 8px;
    white-space: nowrap;
}

h3 {
    font-size: 15px;
    font-weight: sem-bold;
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
    flex-wrap: wrap;
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
    font-size: 15px;
    font-weight: semi-bold;
}

.match-info p {
    margin: 5px 0;
}

.expected {
    color: #28a745;
}

.reported {
    color: #dc3545;
    font-weight: semi-bold;
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
    font-size: 12px;
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
    overflow-y: auto;
}

.empty-state {
    font-family: monospace;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #7f8c8d;
    font-size: 14px;
    font-style: italic;
}
</style>