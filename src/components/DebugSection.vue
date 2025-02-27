<template>
  <div class="inspect-rule">
    <h3 class="title">Inspect Rule</h3>
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
  if (!findingsJson) return;
  
  parsedData.value = JSON.parse(findingsJson);

  const explanations = parsedData.value.explanations || [];
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

  let rootNode = null;

  explanations.forEach((exp) => {
    let currentNode = {
      name: formatOpName(exp.op),
      debugMatches: extractUniqueDebugCodeLocationMatches(exp),
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

/**
 * Processes the taint analysis children nodes and categorizes them into sources, sinks, and sanitizers.
 *
 * @param {Array} children - The array of child nodes to process.
 * @returns {Array} An array containing three nodes: sourcesNode, sinksNode, and sanitizersNode.
 */
function processTaintChildren(children) {
  const sourcesNode = { name: "pattern-sources", debugMatches: [], children: [] };
  const sinksNode = { name: "pattern-sinks", debugMatches: [], children: [] };
  const sanitizersNode = { name: "pattern-sanitizers", debugMatches: [], children: [] };

  children.forEach((child) => {
    if (child.op === "TaintSource") {
      sourcesNode.debugMatches = extractUniqueDebugCodeLocationMatches(child);
      sourcesNode.children = processChildren(child.children);
    } else if (child.op === "TaintSink") {
      let sinkPatternsNode = {
        name: "patterns",
        debugMatches: extractUniqueDebugCodeLocationMatches(child),
        children: processChildren(child.children),
      };
      sinksNode.children.push(sinkPatternsNode);
    } else if (child.op === "TaintSanitizer") {
      let sanitizerPatternsNode = {
        name: "patterns",
        debugMatches: extractUniqueDebugCodeLocationMatches(child),
        children: processChildren(child.children),
      };
      sanitizersNode.children.push(sanitizerPatternsNode);
    }
  });
  return [sourcesNode, sinksNode, sanitizersNode];
}

/**
 * Processes a tree of nodes and returns a new tree with formatted node names and unique debug matches.
 *
 * @param {Array} children - The array of child nodes to process.
 * @returns {Array} - The processed array of nodes with formatted names and unique debug matches.
 */
function processChildren(children) {
  if (!children) return [];

  let result = [];
  let stack = [...children];

  while (stack.length > 0) {
    let node = stack.pop();

    let newNode = {
      name: formatOpName(node.op),
      debugMatches: extractUniqueDebugCodeLocationMatches(node),
      children: [],
    };

    if (node.children && node.children.length > 0) {
      newNode.children = processChildren(node.children);
    }

    result.push(newNode);
  }

  return result;
}

function extractUniqueDebugCodeLocationMatches(nodes) {
  if (!nodes.matches || !Array.isArray(nodes.matches)) return null;

  return nodes.matches.reduce((acc, match) => {
    if (!acc.some(existingMatch =>
      JSON.stringify(existingMatch.start) === JSON.stringify(match.start) &&
      JSON.stringify(existingMatch.end) === JSON.stringify(match.end))) {
      acc.push({
        start: match.start,
        end: match.end,
      });
    }
    return acc;
  }, [])
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
    "TaintSanitizer": "pattern-sanitizers",
  };

  return opMapping[op] || op.toLowerCase();
}

function handleHover(debugCodeLocation) {
  store.codeEditorDebugLocation = debugCodeLocation;
}

</script>

<style lang="scss" scoped>
.inspect-rule {
  border-right: 1px solid black;

}

.title {
  font-size: 15px;
  font-weight: semi-bold;
  margin-bottom: 12px;
  color: #333;
}
</style>