<template>
  <div class="inspect-rule">
    <h3 class="title">Inspect Rule</h3>
    <div v-if="!parsedData" class="empty-state">No debugging information available.</div>
    <TreeView v-else :data="parsedData" @node-hover="handleHover" @scrollToCodeSnippet="handleScrollToCodeSnippet" />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import TreeView from "./TreeView.vue";
import { store } from '../store'

const parsedData = ref(null);
const emit = defineEmits(['scrollToCodeSnippet']);

watch(() => store.jsonResult.scanResults, (scanResults) => {
  generateDebuggingInfo(scanResults);
}, { deep: true });


async function generateDebuggingInfo(scanResults) {
  if (!scanResults) return;

  const explanations = scanResults.explanations || [];
  parsedData.value = parseExplanation(explanations);
}

/**
 * Parses a list of explanations and constructs a hierarchical structure.
 *
 * @param {Array} explanations - The list of explanations to parse.
 * @returns {Object|null} The root node of the parsed explanations tree, or null if the input is empty.
 */
function parseExplanation(explanations) {
  if (!explanations || explanations.length === 0) return null;

  const rootNode = explanations.map(exp => ({
    name: formatOpName(exp.op),
    matches: exp.matches.length > 0 ? exp.matches : [exp.loc],
    children: processChildren(exp.children, exp.op === "Taint")
  }))[0];

  return rootNode;
}

/**
 * Processes a tree of nodes and returns a new tree with formatted node names and unique debug matches.
 *
 * @param {Array} children - The array of child nodes to process.
 * @param {Boolean} isTaint - Flag indicating if the children are part of a taint analysis.
 * @returns {Array} - The processed array of nodes with formatted names and unique debug matches.
 */
function processChildren(children, isTaint = false) {
  if (!children) return [];

  if (isTaint) {
    const nodes = {
      TaintSource: { name: "pattern-sources", matches: [], children: [] },
      TaintSink: { name: "pattern-sinks", matches: [], children: [] },
      TaintSanitizer: { name: "pattern-sanitizers", matches: [], children: [] }
    };

    children.forEach(child => {
      const node = nodes[child.op];
      if (node) {
        node.matches = child.matches.length > 0 ? child.matches : [child.loc];
        node.children = processChildren(child.children);
      }
    });

    return Object.values(nodes);
  }

  return children.map(node => ({
    name: formatOpName(node.op),
    matches: node.matches.length > 0 ? node.matches : [node.loc],
    children: processChildren(node.children)
  }));
}

function formatOpName(op) {
  if (!op) return "Unknown";

  if (Array.isArray(op)) {
    return `${op[0] === 'XPat' ? 'pattern' : op[0]}: ${op[1]}`;
  }

  const opMapping = {
    "Or": "pattern-either",
    "And": "patterns",
    "Negation": "pattern-not",
    "Taint": "taint",
    "TaintSource": "pattern-sources",
    "TaintSink": "pattern-sinks",
    "TaintSanitizer": "pattern-sanitizers",
  };

  return opMapping[op] || op.toLowerCase();
}

function handleHover(debugCodeLocation) {
  store.codeEditorDebugLocation = debugCodeLocation;
}

function handleScrollToCodeSnippet(event, lineNumber) {
    emit('scrollToCodeSnippet', lineNumber);
}

</script>

<style lang="scss" scoped>
.title {
  font-size: 15px;
  font-weight: semi-bold;
  margin-bottom: 12px;
  color: #333;
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