<template>
    <vue-monaco-editor :value="code" :options="MONACO_EDITOR_OPTIONS" defaultLanguage="javascript" @mount="handleMount"
        @change="handleCodeChange" />
</template>

<script setup>
import { shallowRef, watch, defineExpose, onMounted, onBeforeUnmount, ref } from 'vue';
import { Range } from 'monaco-editor';

const props = defineProps({
    language: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    jsonresult: {
        type: Object,
        required: false
    },
    debugLocation: {
        type: Object,
        required: false
    }
});
const emit = defineEmits(['update:code']);

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
        vertical: 'hidden',
        horizontal: 'hidden'
    }
};

const editorRef = shallowRef();
const existingHiglightCodeDecorations = ref([]);
const existingHighlightLinesFromTestResult = ref([]);
const debugLocationCodeDecorations = ref([]);
const exisitingAnnotationZones = ref([]);
const handleMount = editor => (editorRef.value = editor);

watch(() => props.jsonresult, () => {
    determineHighlightCode();
    determineHighlightLinesFromTestResult();
}, { deep: true });

watch(() => props.language, (newLanguage) => {
    const languageToUse = newLanguage === 'generic' ? 'javascript' : newLanguage;
    editorRef.value?.updateOptions({ language: languageToUse });
}, { immediate: true });

function determineHighlightCode() {
    // Clear existing decorations
    existingHiglightCodeDecorations.value = editorRef.value.deltaDecorations(existingHiglightCodeDecorations.value, []);

    const newDecorations = [];

    (props.jsonresult?.parsedResult?.runs || []).flatMap(run => run.results || [])
        .flatMap(result => result.locations || [])
        .forEach(location => {
            const region = location.physicalLocation.region;
            newDecorations.push({
                range: new Range(region.startLine, region.startColumn, region.endLine, region.endColumn),
                options: { inlineClassName: "code-highlight" }
            });
        });

    existingHiglightCodeDecorations.value = editorRef.value.deltaDecorations(existingHiglightCodeDecorations.value, newDecorations);
}

function determineHighlightLinesFromTestResult() {
    // Clear existing decorations
    existingHighlightLinesFromTestResult.value = editorRef.value.deltaDecorations(existingHighlightLinesFromTestResult.value, []);

    const newDecorations = [];

    // Extract the matches from the JSON
    Object.values(props.jsonresult?.testResults?.results || {}).forEach(testData => {
        Object.values(testData.checks || {}).forEach(check => {
            Object.entries(check.matches || {}).forEach(([, matchData]) => {
                const { expected_lines = [], reported_lines = [] } = matchData;

                // Convert arrays to sets for easier comparison
                const expectedSet = new Set(expected_lines);
                const reportedSet = new Set(reported_lines);

                // Highlight expected lines (Green - should be present)
                expected_lines.forEach(line => {
                    newDecorations.push({
                        range: new Range(line - 1, 1, line - 1, 1),
                        options: {
                            isWholeLine: true,
                            className: reportedSet.has(line) ? "full-line-highlight-added" : "full-line-highlight-removed",
                            glyphMarginClassName: reportedSet.has(line) ? "diff-added-gutter" : "diff-removed-gutter"
                        }
                    });
                });

                // Highlight reported lines that are not in expected lines (Red - detected issues)
                reported_lines.forEach(line => {
                    if (!expectedSet.has(line)) {
                        newDecorations.push({
                            range: new Range(line - 1, 1, line - 1, 1),
                            options: {
                                isWholeLine: true,
                                className: "full-line-highlight-removed",
                                glyphMarginClassName: "diff-removed-gutter"
                            }
                        });
                    }
                });

            });
        });
    });

    // Check for comments indicating false positives (//ok or // ok)
    const model = editorRef.value.getModel();
    const linesCount = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        if (lineContent.includes('//ok') || lineContent.includes('// ok')) {
            newDecorations.push({
                range: new Range(lineNumber, 1, lineNumber, 1),
                options: {
                    isWholeLine: true,
                    className: "full-line-highlight-added",
                    glyphMarginClassName: "diff-added-gutter"
                }
            });
        }
    }

    // Apply decorations in Monaco Editor
    existingHighlightLinesFromTestResult.value = editorRef.value.deltaDecorations(existingHighlightLinesFromTestResult.value, newDecorations);
}

function determineCodeFlowInformation() {
    const runs = props.jsonresult?.parsedResult?.runs || [];

    editorRef.value.changeViewZones(accessor => {
        // Remove existing annotation zones
        exisitingAnnotationZones.value.forEach(zone => accessor.removeZone(zone));

        runs.flatMap(run => run.results || [])
            .flatMap(result => result.codeFlows || [])
            .flatMap(codeFlow => codeFlow.threadFlows || [])
            .flatMap(threadFlow => threadFlow.locations || [])
            .forEach((location, index) => {
                const region = location?.location?.physicalLocation?.region;
                if (!region) return; // Skip if region is invalid

                const codeSnippet = location?.location?.physicalLocation?.region?.snippet?.text || 'Unknown code';

                const messages = [
                    { label: "A1", text: `⨀ taint comes from this source: : `, code: codeSnippet },
                    { label: "A2", text: `→ taint flows through this intermediate variable: `, code: codeSnippet },
                    { label: "A3", text: `◉ taint flows to this sink: : `, code: codeSnippet }
                ];
                const annotation = messages[index % messages.length];

                exisitingAnnotationZones.value.push(accessor.addZone({
                    afterLineNumber: region.startLine - 1,
                    heightInPx: 18, // Adjust height
                    domNode: createAnnotationNode(annotation.label, annotation.text, annotation.code)
                }));
            })
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
        emit('update:code', latestCode); // Emit the update:code event with the latest code
    }
}

function handleCodeChange(code) {
    emit('update:code', code);
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

function highlightDebugLocationCode(locations) {
    if (!locations || !locations.length) {
        // Remove all existing decorations when no locations are provided
        debugLocationCodeDecorations.value = editorRef.value.deltaDecorations(debugLocationCodeDecorations.value, []);
        return;
    }

    // Create new decorations
    const newDecorations = locations.map(location => ({
        range: new monaco.Range(location.start.line, location.start.col, location.end.line, location.end.col),
        options: { className: "debug-highlight", isWholeLine: true }
    }));

    // Apply new decorations while removing the previous ones
    debugLocationCodeDecorations.value = editorRef.value.deltaDecorations(debugLocationCodeDecorations.value, newDecorations);
}

// Expose the determineCodeFlowInformation function to the parent component
defineExpose({ determineCodeFlowInformation, highlightDebugLocationCode });

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
</style>