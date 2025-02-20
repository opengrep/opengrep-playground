<template>
  <div class="inspect-rule">
    <h2 class="title">Inspect Rule</h2>
    <TreeView :data="parsedData" />
  </div>
</template>

<script setup>
import { ref, inject, defineExpose } from "vue";
import TreeView from "./TreeView.vue";

const getRootDir = inject('$getRootDir');
const joinPath = inject('$joinPath');
const readFile = inject('$readFile');

const parsedData = ref(null);

async function generateDebuggingInfo() {
  const rootDir = await getRootDir();
  const findingsPath = await joinPath(rootDir, "tmp", "findings.json");
  const findingsJson = await readFile(findingsPath);
  parsedData.value = JSON.parse(findingsJson);

  const explanations = parsedData.value.explanations || [];
  parsedData.value = parseExplanation(explanations);
}

function parseExplanation(explanations) {
  let structuredData = {
    name: "Taint",
    children: [],
  };

  explanations.forEach(exp => {
    if (exp.op === "Taint") {
      let sources = exp.children.find((c) => c.op === "TaintSource") || {};
      let sinks = exp.children.find((c) => c.op === "TaintSink") || {};

      let patternSources = {
        name: "pattern-sources:",
        children: extractPatterns(sources.children),
      };

      let patternSinks = {
        name: "pattern-sinks:",
        children: [
          {
            name: "patterns:",
            children: extractPatterns(sinks.children),
          },
        ],
      };

      structuredData.children.push(patternSources);
      structuredData.children.push(patternSinks);
    }
  });

  return structuredData;
}

function extractPatterns(children) {
  if (!children) return [];

  return children.map((c) => {
    let node = {};
debugger;
    if (Array.isArray(c.op)) {
      node.name = `${c.op[0] === 'XPat' ? 'pattern' : c.op[0]}: ${c.op[1]}`;
    } else {
      node.name = `patterns:`;
      node.children = extractPatterns(c.children);
    }

    return node;
  });
}

// Expose the determineCodeFlowInformation function to the parent component
defineExpose({ generateDebuggingInfo });

</script>

<style lang="scss" scoped>
.inspect-rule {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}
</style>