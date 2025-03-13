<template>
  <div class="tree-node">
    <div v-if="data" class="node-header" @click="toggle" @mouseover="handleMouseOver" @mouseleave="handleMouseLeave">
      <span v-if="hasChildren" class="toggle-icon">{{ isOpen ? "▼" : "▶" }}</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="node-name">{{ data?.name }}</span>
        <font-awesome-icon :icon="['far', 'file-code']" size="xl"
          @click="scrollToCodeSnippet($event, data?.matches[0]?.start.line)" />
      </div>
    </div>
    <div v-if="isOpen" class="node-children">
      <TreeView v-for="(child, index) in data?.children" :key="index" :data="child"
        @scrollToCodeSnippet="scrollToCodeSnippet($event, child?.matches[0]?.start.line)"
        @node-hover="handleNodeHover" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from "vue";

const props = defineProps({
  data: Object,
});

const emit = defineEmits(["node-hover", 'scrollToCodeSnippet']);

const isOpen = ref(true);
const hasChildren = computed(() => props.data?.children && props.data.children.length > 0);

// Track hovered node globally to avoid redundant emissions
const currentHoveredNode = ref(null);
const hoveredChildData = ref(null); // Store child hover data

// Watch for changes in the data prop to update the view
watchEffect(() => {
  isOpen.value = true; // Reset expansion when data updates
});

const toggle = () => {
  if (hasChildren.value) isOpen.value = !isOpen.value;
};

// Emit only once from parent node
const handleMouseOver = () => {
  if (currentHoveredNode.value !== props.data?.matches) {
    currentHoveredNode.value = props.data?.matches;
    emit("node-hover", props.data?.matches);
  }
};

// Reset hover when leaving
const handleMouseLeave = () => {
  if (currentHoveredNode.value !== null) {
    currentHoveredNode.value = null;
    emit("node-hover", null);
  }
};

// Child nodes update `hoveredChildData`, but don’t emit directly
const handleNodeHover = (location) => {
  hoveredChildData.value = location; // Store child node location
  emit("node-hover", hoveredChildData.value);
};

const scrollToCodeSnippet = (event, lineNumber) => {
  event.stopPropagation();
  emit('scrollToCodeSnippet', event, lineNumber);

}
</script>

<style lang="scss" scoped>
.tree-node {
  margin-left: 16px;
  font-size: 12px;
  color: #444;

  .node-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 4px;

    &:hover {
      background: #e9ecef;
    }

    .toggle-icon {
      margin-right: 8px;
      font-size: 12px;
      color: #888;
    }

    .node-name {
      font-weight: 500;
    }
  }

  .node-children {
    margin-left: 12px;
    border-left: 2px solid #ddd;
    padding-left: 8px;
    margin-top: 4px;
  }
}
</style>