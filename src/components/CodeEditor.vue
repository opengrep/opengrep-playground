<template>
    <vue-monaco-editor style="min-height: 0;" ref="monicaEditor" :options="MONACO_EDITOR_OPTIONS" @mount="handleMount"
        @change="handleCodeChange" />
</template>

<script setup>
import { watch, onMounted, onBeforeUnmount, reactive, shallowRef } from 'vue';
import * as monaco from 'monaco-editor';
import { store } from '../store';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

const emit = defineEmits(['codeEditorUpdated']);

const MONACO_EDITOR_OPTIONS = {
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
    wordBasedSuggestionsOnlySameLanguage: true,
    semanticHighlighting: { enabled: 'configuredByTheme' },
    readOnly: false,
    wordWrap: "on",
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    renderWhitespace: "boundary",
    glyphMargin: true,
    lineNumbersMinChars: 3,
    scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden'
    }
};

const componentState = reactive({
    existingHiglightCodeDecorations: [],
    existingHighlightLinesFromTestResult: [],
    debugLocationCodeDecorations: [],
    exisitingAnnotationZones: [],
    code: ''
});

const editorRef = shallowRef(null);
const handleMount = editor => (editorRef.value = editor);

watch(() => store.jsonResult, (jsonResult) => {
    determineHighlightCode(jsonResult?.scanResults);
    determineHighlightLinesFromTestResult(jsonResult.testResults);
});

watch(() => store.languageDetails, (newLanguageDetails) => {
    const language = newLanguageDetails?.monacoLanguage || 'plaintext';
    if (editorRef.value) {
        const model = editorRef.value.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, language === 'generic' ? 'plaintext' : language);
        }
    }
});

watch(() => store.codeEditorDebugLocation, (locations) => highlightDebugLocationCode(locations), { deep: true });

watch(() => store.codeEditorCode, (newCode) => {
    if (editorRef.value) {
        const model = editorRef.value.getModel();
        if (model && model.getValue() !== newCode) {
            model.setValue(newCode);
        }

        editorRef.value.changeViewZones(accessor => {
            // Remove existing annotation zones
            componentState.exisitingAnnotationZones.forEach(zone => accessor.removeZone(zone));
        });
    }
}, { deep: true });

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});


function determineHighlightCode(scanResults) {
    // Clear existing decorations
    componentState.existingHiglightCodeDecorations = editorRef.value.deltaDecorations(componentState.existingHiglightCodeDecorations, []);

    const newDecorations = [];

    (scanResults?.results || []).forEach(result => {
        const start = result.start;
        const end = result.end;

        newDecorations.push({
            range: new monaco.Range(start.line, start.col, end.line, end.col),
            options: { inlineClassName: "code-highlight" }
        });
    });

    componentState.existingHiglightCodeDecorations = editorRef.value.deltaDecorations(componentState.existingHiglightCodeDecorations, newDecorations);
}

function determineHighlightLinesFromTestResult(rawTestResults) {
    // Clear existing decorations
    componentState.existingHighlightLinesFromTestResult = editorRef.value.deltaDecorations(componentState.existingHighlightLinesFromTestResult, []);

    if (!rawTestResults || !Object.entries(rawTestResults.results).length) return;

    let newDecorations = [];
    store.jsonResult.parsedTestResults = [];
    debugger;
    let expectedSet = null;
    let reportedSet = null;

    // Extract the matches from the JSON
    Object.entries(rawTestResults.results[store.ruleFilePath].checks).forEach(([ruleId, check]) => {
        Object.entries(check.matches || {}).forEach(([, matchData]) => {
            const { expected_lines = [], reported_lines = [] } = matchData;

            // Convert arrays to sets for easier comparison
            expectedSet = new Set(expected_lines);
            reportedSet = new Set(reported_lines);

            /** if expected but not reported then
             * ok ==> must not match green
             * ruleid ==> must match red
             * nothing ==> empty
             */
            expected_lines.forEach((line) => {
                if (!reportedSet.has(line)) {
                    newDecorations.push({
                        range: new monaco.Range(line - 1, 1, line - 1, 1),
                        options: {
                            isWholeLine: true,
                            className: "full-line-highlight-removed",
                            glyphMarginClassName: "diff-removed-gutter"
                        }
                    });

                    store.jsonResult.parsedTestResults.push({
                        lineNumber: line,
                        mustMatch: true,
                        ruleId,
                        status: 'FAILED'
                    });
                }
            });

            /** if reported but not expected then
             * ok comment ==> must not match red
             * ruleid comment ==> must match green
             * no comment ==> empty
            */
            reported_lines.forEach((line) => {
                if (!expectedSet.has(line)) {
                    newDecorations.push({
                        range: new monaco.Range(line - 1, 1, line - 1, 1),
                        options: {
                            isWholeLine: true,
                            className: "full-line-highlight-removed",
                            glyphMarginClassName: "diff-removed-gutter"
                        }
                    });

                    store.jsonResult.parsedTestResults.push({
                        lineNumber: line,
                        mustMatch: false,
                        ruleId,
                        status: 'FAILED'
                    });
                }
            });

            /** if reported and expected then
             * ok ==> must not match red
             * ruleid ==> must match green
             * nothing ==> empty
             */
            expected_lines.forEach((line) => {
                if (reportedSet.has(line)) {
                    newDecorations.push({
                        range: new monaco.Range(line - 1, 1, line - 1, 1),
                        options: {
                            isWholeLine: true,
                            className: "full-line-highlight-added",
                            glyphMarginClassName: "diff-added-gutter"
                        }
                    });

                    store.jsonResult.parsedTestResults.push({
                        lineNumber: line,
                        mustMatch: true,
                        ruleId,
                        status: 'SUCCESS',
                    });
                }
            });
        });

        /**
         * if no reported an no expected but indicated with the ignore command (ok: ) then
         * highlight as green not match
         */
        const model = editorRef.value.getModel();
        const linesCount = model.getLineCount();
        for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
            const previousLineContent = model.getLineContent(lineNumber);
            if (previousLineContent.includes('ok: ') && !expectedSet.has(lineNumber + 1) && !reportedSet.has(lineNumber + 1)) {
                store.jsonResult.parsedTestResults.push({
                    mustMatch: false,
                    lineNumber: lineNumber + 1,
                    ruleId: null,
                    status: 'SUCCESS'
                });

                newDecorations.push({
                    range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: "full-line-highlight-added",
                        glyphMarginClassName: "diff-added-gutter"
                    }
                });
            }
        }
    });

    store.jsonResult.parsedTestResults.sort((a, b) => a.lineNumber - b.lineNumber);

    // Apply decorations in Monaco Editor
    componentState.existingHighlightLinesFromTestResult = editorRef.value.deltaDecorations(componentState.existingHighlightLinesFromTestResult, newDecorations);
}

function determineCodeFlowInformation(dataFlows) {
    editorRef.value.changeViewZones(accessor => {
        // Remove existing annotation zones
        componentState.exisitingAnnotationZones.forEach(zone => accessor.removeZone(zone));
        componentState.exisitingAnnotationZones = [];

        let index = 1;

        const addAnnotationZone = (label, text, location, snippet) => {
            componentState.exisitingAnnotationZones.push(accessor.addZone({
                afterLineNumber: location.start.line,
                heightInPx: 18,
                domNode: createAnnotationNode(label, text, snippet)
            }));
        };

        if (dataFlows.taint_source?.length && Array.isArray(dataFlows.taint_source[1])) {
            addAnnotationZone(`A${index++}`, `⨀ Taint originates from this source: `, dataFlows.taint_source[1][0], dataFlows.taint_source[1][1]);
        }

        dataFlows.intermediate_vars?.forEach((intermediateVar) => {
            addAnnotationZone(`A${index++}`, `→ Taint flows through this intermediate variable: `, intermediateVar.location, intermediateVar.content);
        });

        if (dataFlows.taint_sink?.length && Array.isArray(dataFlows.taint_sink[1])) {
            addAnnotationZone(`A${index}`, `◉ Taint flows to this sink: `, dataFlows.taint_sink[1][0], dataFlows.taint_sink[1][1]);
        }
    });
}

function createAnnotationNode(label, message, codeSnippet) {
    // Create the container div for the annotation
    const container = document.createElement("div");
    container.className = "annotation-view-zone";

    // Create the label (e.g., A1, A2, A3)
    const labelSpan = document.createElement("span");
    labelSpan.className = "annotation-label";
    labelSpan.textContent = label;

    // Create the message span
    const messageSpan = document.createElement("span");
    messageSpan.className = "annotation-message";
    messageSpan.textContent = message;

    // Create the code snippet container
    const codeBlock = document.createElement("span");
    codeBlock.className = "annotation-code";
    codeBlock.textContent = `"${codeSnippet}"`; // Display code inside quotes

    // Append elements to the container
    container.appendChild(labelSpan);
    container.appendChild(messageSpan);
    container.appendChild(codeBlock);

    return container;
}

// Function to handle keydown events
function handleKeyDown(event) {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const isSaveShortcut = (isMac && event.metaKey && event.key === 's') || (!isMac && event.ctrlKey && event.key === 's');

    if (isSaveShortcut) {
        event.preventDefault(); // Prevent the default save dialog
        const latestCode = editorRef.value.getValue(); // Get the latest value of the editor code
        handleCodeChange(latestCode); // Emit the update:code event with the latest code
    }
}

function handleCodeChange(code) {
    store.codeEditorCode = code;
    emit('codeEditorUpdated');
};

function highlightDebugLocationCode(locations) {
    if (!locations || !locations.length) {
        // Remove all existing decorations when no locations are provided
        componentState.debugLocationCodeDecorations = editorRef.value.deltaDecorations(componentState.debugLocationCodeDecorations, []);
        return;
    }

    // Create new decorations
    const newDecorations = locations.map(location => ({
        range: new monaco.Range(location.start.line, location.start.col, location.end.line, location.end.col),
        options: { className: "debug-highlight", isWholeLine: true }
    }));

    // Apply new decorations while removing the previous ones
    componentState.debugLocationCodeDecorations = editorRef.value.deltaDecorations(componentState.debugLocationCodeDecorations, newDecorations);
}

// Expose the determineCodeFlowInformation function to the parent component
defineExpose({ determineCodeFlowInformation });

</script>
<style>
.code-highlight {
    background-color: rgba(255, 255, 102, 0.5);
}

.debug-highlight {
    background-color: rgba(156, 178, 251, 0.5);
}

/* Style for view zones (annotation lines) */
.annotation-view-zone {
    background-color: #f0f0f0;
    border: 1px solid #afafaf;
    color: #8b8b8b;
    font-size: 10px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 3px;
    width: unset !important;
    align-content: center;
}

.annotation-label {
    border-radius: 5px;
    padding-left: 4px;
    padding-right: 4px;
    margin-right: 4px;
    text-align: center;
    color: #fff;
    background-color: #afafaf;
}

/* Green square in the gutter (Expected Lines - ruleid) */
.diff-added-gutter {
    background-color: #4caf50;
    width: 8px;
    height: 8px;
    display: inline-block;
    margin-left: 4px;
    border-radius: 2px;
}

/* Red square in the gutter (Reported Issues - ok) */
.diff-removed-gutter {
    background-color: #e57373;
    width: 8px;
    height: 8px;
    display: inline-block;
    margin-left: 4px;
    border-radius: 2px;
}

.diff-unexpected-gutter {
    background-color: #ffd43b;
    width: 8px;
    height: 8px;
    display: inline-block;
    margin-left: 4px;
    border-radius: 2px;
}

/* Full-width highlight for ruleid (Green) */
.full-line-highlight-added {
    background-color: rgba(198, 255, 198, 0.4) !important;
    position: absolute;
    left: 0;
    right: 0;
    width: 100% !important;
}

/* Full-width highlight for ok (Red) - Adjusted */
.full-line-highlight-removed {
    background-color: rgba(255, 0, 0, 0.2) !important;
    position: absolute;
    left: 0;
    right: 0;
    width: 100% !important;
}

.full-line-highlight-unexpected {
    background-color: rgba(255, 212, 59, 0.2) !important;
    position: absolute;
    left: 0;
    right: 0;
    width: 100% !important;
}
</style>