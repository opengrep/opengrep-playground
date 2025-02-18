<template>
    <div>
        <button @click="handleRunBinary">Run Binary</button>
        <div v-if="parsedResult">
            <h2>Results</h2>
            <div v-for="run in parsedResult.runs" :key="run.tool.driver.name">
                <h3>{{ run.tool.driver.name }}</h3>
                <div v-for="result in run.results" :key="result.ruleId">
                    <h4>Rule: {{ result.ruleId }}</h4>
                    <p>{{ result.message.text }}</p>
                    <div v-for="location in result.locations" :key="location.physicalLocation.artifactLocation.uri">
                        <p><strong>File:</strong> {{ location.physicalLocation.artifactLocation.uri }}</p>
                        <p><strong>Snippet:</strong> {{ location.physicalLocation.region.snippet.text }}</p>
                    </div>
                </div>
            </div>
        </div>
        <pre v-else>{{ result }}</pre>
    </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue';

const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const runBinary = inject('$runBinary');
const result = ref('');
const parsedResult = ref(null);
let rulesPath;
let codeSamplePath;
let rootDir;

const props = defineProps(['language']);

onMounted(async () => {
    rootDir = await getRootDir();
    rulesPath = await joinPath(rootDir, 'rules');
    codeSamplePath = await joinPath(rootDir, 'code', props.language);
});

async function handleRunBinary() {
    try {
        const binaryPath = await joinPath(rootDir, 'opengrep_osx_arm64'); // TODO detect depending on os
        const response = await runBinary(binaryPath, ["scan -f", `${rulesPath}`, `${codeSamplePath}`, "--sarif", "--dataflow-traces"]);
        result.value = response.output;
        parsedResult.value = JSON.parse(response.output);
    } catch (error) {
        console.error("Error running binary:", error);
    }
}
</script>

<style lang="scss">
pre {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 5px;
}
</style>