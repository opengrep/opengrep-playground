<template>
  <div class="inspect-rule">
    <h2 class="title">Inspect Rule</h2>
    <TreeView :data="parsedData" @node-hover="handleHover" />
  </div>
</template>

<script setup>
import { ref, inject, watch } from "vue";
import TreeView from "./TreeView.vue";
import { store } from '../store'

const readFile = inject('$readFile');

const parsedData = ref(null);

watch(() => store.jsonResult, () => {
  generateDebuggingInfo();
}, { deep: true });


async function generateDebuggingInfo() {
  const findingsJson = await readFile(store.findingsPath);
  parsedData.value = JSON.parse(findingsJson);

  const explanations = parsedData.value.explanations || [];
  parsedData.value = parseExplanation(explanations);
}

function parseExplanation(explanations) {
  if (!explanations || explanations.length === 0) return null;

  let rootNode = null;

  explanations.forEach((exp) => {
    let currentNode = {
      name: formatOpName(exp.op),
      debugMatches: extractUniqueMatches(exp),
      children: [],
    };

    if (exp.op === "Taint") {
      currentNode.children = processTaintChildren(exp.children);
    } else {
      currentNode.children = processChildren(exp.children);
    }

    // Set the first explanation as the root node
    if (!rootNode) {
      rootNode = currentNode;
    }
  });

  return rootNode;
}

function processTaintChildren(children) {
  let sourcesNode = { name: "pattern-sources", debugMatches: [], children: [] };
  let sinksNode = { name: "pattern-sinks", debugMatches: [], children: [] };

  children.forEach((child) => {
    if (child.op === "TaintSource") {
      sourcesNode.debugMatches = extractUniqueMatches(child);
      sourcesNode.children = processChildren(child.children);
    } else if (child.op === "TaintSink") {
      let sinkPatternsNode = {
        name: "patterns",
        debugMatches: extractUniqueMatches(child),
        children: processChildren(child.children),
      };
      sinksNode.children.push(sinkPatternsNode);
    }
  });

  return [sourcesNode, sinksNode];
}

function processChildren(children) {
  if (!children) return [];

  let result = [];
  let stack = [...children];

  while (stack.length > 0) {
    let node = stack.pop();

    let newNode = {
      name: formatOpName(node.op),
      debugMatches: extractUniqueMatches(node),
      children: [],
    };

    if (node.children && node.children.length > 0) {
      newNode.children = processChildren(node.children);
    }

    result.push(newNode);
  }

  return result;
}

function extractUniqueMatches(nodes) {
  if (!nodes.matches || !Array.isArray(nodes.matches)) return null;

  return nodes.matches.reduce((acc, match) => {
    if (!acc.some(existingMatch =>
      JSON.stringify(existingMatch.start) === JSON.stringify(match.start) &&
      JSON.stringify(existingMatch.end) === JSON.stringify(match.end))) {
      acc.push(match);
    }
    return acc;
  }, []).map(match => ({
    start: match.start,
    end: match.end,
  }));
}

function formatOpName(op) {
  if (!op) return "Unknown";

  if (Array.isArray(op)) {
    return `pattern: ${op[1]}`;
  }

  const opMapping = {
    "Or": "pattern-either",
    "And": "patterns",
    "Negation": "pattern-not",
    "Taint": "taint",
    "TaintSource": "pattern-sources",
    "TaintSink": "pattern-sinks",
  };

  return opMapping[op] || op.toLowerCase();
}

function handleHover(debugCodeLocation) {
  store.codeEditorDebugLocation = debugCodeLocation;
}

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