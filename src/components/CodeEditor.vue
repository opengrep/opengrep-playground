<template>
    <vue-monaco-editor :value="code" :options="MONACO_EDITOR_OPTIONS" :language="language" defaultLanguage="javascript"
        @mount="handleMount" />
</template>

<script setup>
import { shallowRef, watch } from 'vue';
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
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    renderWhitespace: "boundary",
    glyphMargin: true,
    lineNumbersMinChars: 3,
};

const editorRef = shallowRef();
const handleMount = editor => (editorRef.value = editor);

watch(() => props.jsonresult, () => {
    determineHighlightCode();
    determineCodeFlowInformation();
}, { deep: true });

function determineHighlightCode() {
    const highlights = [];

    (props.jsonresult?.runs || []).flatMap(run => run.results || [])
        .flatMap(result => result.locations || [])
        .forEach(location => {
            const region = location.physicalLocation.region;
            highlights.push({
                range: new Range(region.startLine, region.startColumn, region.endLine, region.endColumn),
                options: { inlineClassName: "code-highlight" }
            });
        });

    editorRef.value.deltaDecorations([], highlights);
}

function determineCodeFlowInformation() {
    const runs = props.jsonresult?.runs || [];

    editorRef.value.changeViewZones(accessor => {
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

                accessor.addZone({
                    afterLineNumber: region.startLine - 1,
                    heightInPx: 18, // Adjust height
                    domNode: createAnnotationNode(annotation.label, annotation.text, annotation.code)
                });
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
    messageSpan.textContent = message; // Bold styling

    // Create the code snippet container
    const codeBlock = document.createElement("span");
    codeBlock.className = "annotation-code";
    codeBlock.textContent = `"${codeSnippet}"`; // Display code inside quotes

    // Append elements to the container
    container.appendChild(labelSpan);
    container.appendChild(messageSpan);// Line break for structure
    container.appendChild(codeBlock);

    return container;
}

</script>
<style>
.code-highlight {
    background-color: rgba(255, 0, 0, 0.5);
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
</style>