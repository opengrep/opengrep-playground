<template>
    <div class="scan-options">
        <h3>Scan options</h3>
        <label
            class="taint-toggle"
            :class="{ 'is-on': store.taintIntrafile }"
            title="When ON, scans run with --taint-intrafile (intra-file taint analysis enabled).">
            <input type="checkbox" v-model="store.taintIntrafile" />
            <span class="taint-toggle__track">
                <span class="taint-toggle__thumb"></span>
            </span>
            <span class="taint-toggle__label">
                Intrafile tainting:
                <strong>{{ store.taintIntrafile ? 'ON' : 'OFF' }}</strong>
            </span>
        </label>
    </div>

    <div class="results-header">
        <h3>Results</h3>
        <button @click="handleRunBinary" :class="{ 'disabled': store.disableEvalButton }">Evaluate</button>
    </div>

    <div class="results-container">
        <!-- SCAN RESULTS -->
        <div style="flex: 2" class="scrollable-section">
            <div v-if="isScanLoading" class="loading-container">
                <div class="loading-circle"></div>
            </div>
            <template v-else>

                <div v-if="store.jsonResult?.scanResults === null || store.jsonResult.scanResults.results.length === 0">
                    <div class="empty-state">
                        <p>No scan results.</p>
                    </div>
                </div>
                <div v-else v-for="(result, resultIndex) in store.jsonResult.scanResults.results" :key="result.check_id"
                    class="run-card">
                    <div class="result-card">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <h4>Rule: {{ result.check_id.split('tmp.').pop() }}</h4>
                        </div>
                        <div class="result-body">
                            <p>{{ result.extra.message }}</p>
                            <div class="location-card">
                                <p><strong>Snippet on line {{ result.start.line
                                        }}:</strong><br><br>{{result.extra.lines.trim() }} </p>
                            </div>
                        </div>
                        <div class="result-footer">
                            <button v-if="result.extra.dataflow_trace" class="small"
                                @click="handleShowDataFlows(result.extra.dataflow_trace)"
                                style="align-self: center;">Show
                                dataflows</button>
                            <button class="small" @click="scrollToCodeSnippet(result.start.line)">
                                Go to code snippet
                            </button>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- TEST RESULTS -->
        <h4 @click="toggleSection('testResults')" style="cursor: pointer;">
            Test Results ({{ store.jsonResult?.parsedTestResults.filter(test => test.status === 'SUCCESS').length }}/{{
            store.jsonResult?.parsedTestResults.length }} Unit Tests Passed)
        </h4>
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
import { inject, ref, onMounted, watch } from 'vue';
import { store } from '../store';

const emit = defineEmits(['showDataFlows', 'scrollToCodeSnippet']);

const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');
const getPlatform = inject('$getPlatform');
const showErrorDialog = inject('$showErrorDialog');

const isScanLoading = ref(false);
const isTestLoading = ref(false);
const platform = ref(null);

onMounted(async () => {
    platform.value = await getPlatform();
});

// Invalidate stale results whenever a scan option changes — they no longer
// reflect the current settings and would mislead the user.
watch(() => store.taintIntrafile, () => {
    clearResults();
});

function clearResults() {
    store.jsonResult = {
        scanResults: null,
        testResults: null,
        parsedTestResults: []
    };
}

async function handleRunBinary() {
    if (!store.ruleEditorCode || store.disableEvalButton) return;

    isScanLoading.value = true;
    isTestLoading.value = true;
    clearResults();

    // Select correct binary based on OS
    let binaryPath = null
    switch (platform.value) {
        case 'win32':
            binaryPath = await joinPath(store.rootDir, 'bin', 'windows', 'opengrep-cli.exe');
            break;
        case 'darwin':
            binaryPath = await joinPath(store.rootDir, 'bin', 'macos', 'opengrep-cli');
            break;
        default:
            binaryPath = await joinPath(store.rootDir, 'bin', 'linux', 'opengrep-cli');
    }

    // Run tests
    try {
        await runBinaryForTests(binaryPath);
    } catch (error) {
        console.error("Error running tests:", error);
        showErrorDialog(`Error running tests: Please consult the error.log file at ${store.safeDir}`, error);
    } finally {
        isTestLoading.value = false;
    }

    // Run scan with retrying incase of error
    let retryAttempted = true;
    try {
        await runBinaryForScan(binaryPath, false);
    } catch (error) {
        console.error("Error running scanning:", error);
        if (!retryAttempted) {
            showErrorDialog(`Error running scanning: Please consult the error.log file at ${store.safeDir}`, error);
            return;
        }

        retryAttempted = false;
        await runBinaryForScan(binaryPath, true);
    } finally {
        isScanLoading.value = false;
    }
}

async function runBinaryForScan(binaryPath, runScanWithoutMatchingExplanations) {
    const scanArgs = [
        'scan',
        `-f "${store.ruleFilePath}" "${store.codeSampleFilePath}"`,
        '--json',
        '--dataflow-traces',
        '--experimental',
    ];

    if (store.taintIntrafile) {
        scanArgs.push('--taint-intrafile');
    }

    if (!runScanWithoutMatchingExplanations) {
        scanArgs.push('--matching-explanations');
    }

    const scanResponse = await runBinary(`"${binaryPath}"`, scanArgs);
    if (scanResponse.errorOutput && !scanResponse.output) {
        throw new Error(scanResponse.errorOutput);
    }
    const scanResults = JSON.parse(scanResponse.output);

    if (scanResults.errors && scanResults.errors.length > 0) {
        extractScanErrors(scanResults);
    }

    store.jsonResult = {
        ...store.jsonResult,
        scanResults,
    };
    isScanLoading.value = false;
}

function extractScanErrors(jsonOutput) {
    return jsonOutput?.errors?.forEach(error => {
        showErrorDialog(`${error.level}: ${error.type}`, error.message);
    });
}

async function runBinaryForTests(binaryPath) {
    const testArgs =
      ['scan --test', `-f "${store.ruleFilePath}" "${store.codeSampleFilePath}"`,
       '--json', '--experimental'];

    if (store.taintIntrafile) {
        testArgs.push('--taint-intrafile');
    }

    const testResponse = await runBinary(`"${binaryPath}"`, testArgs)
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

function handleShowDataFlows(dataFlow) {
    emit('showDataFlows', dataFlow);
}

function getMatchSatusText(result) {
    if (!result.mustMatch && result.status === 'UNTESTED') {
        return 'Untested match on';
    }
    return result.mustMatch ? 'Must match' : 'Must not match';
}

function scrollToCodeSnippet(lineNumber) {
    emit('scrollToCodeSnippet', lineNumber);
}
</script>

<style scoped>
.results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.scan-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e1e4e8;
    margin-bottom: 8px;
}

.taint-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    font-size: 12px;
    font-family: monospace;
    color: #555;

    input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
        pointer-events: none;
    }

    .taint-toggle__track {
        position: relative;
        display: inline-block;
        width: 32px;
        height: 18px;
        background-color: #bdc3c7;
        border-radius: 9px;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
    }

    .taint-toggle__thumb {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        background-color: #fff;
        border-radius: 50%;
        transition: transform 0.2s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .taint-toggle__label strong {
        font-weight: bold;
        color: #7f8c8d;
    }

    &.is-on {
        color: #2c3e50;

        .taint-toggle__track {
            background-color: #3498db;
        }

        .taint-toggle__thumb {
            transform: translateX(14px);
        }

        .taint-toggle__label strong {
            color: #2980b9;
        }
    }

    &:hover .taint-toggle__track {
        filter: brightness(0.95);
    }

    input[type="checkbox"]:focus-visible + .taint-toggle__track {
        outline: 2px solid #3498db;
        outline-offset: 2px;
    }
}

.result-footer {
    display: flex;
    gap: 16px;
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
    grid-template-columns: repeat(auto-fit, minmax(100%, 1fr));
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
    width: 100%;
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
