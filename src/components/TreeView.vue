<template>
    <div class="tree-node">
      <div class="node-header" @click="toggle">
        <span v-if="hasChildren" class="toggle-icon">{{ isOpen ? "▼" : "▶" }}</span>
        <span class="node-name">{{ data?.name }}</span>
      </div>
      <div v-if="isOpen" class="node-children">
        <TreeView v-for="(child, index) in data?.children" :key="index" :data="child" />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, watchEffect } from "vue";
  
  const props = defineProps({
    data: Object,
  });
  
  const isOpen = ref(true);
  const hasChildren = computed(() => props.data?.children && props.data.children.length > 0);
  
  // Watch for changes in the data prop to update the view
  watchEffect(() => {
    isOpen.value = true; // Reset expansion when data updates
  });
    
  const toggle = () => {
    if (hasChildren.value) isOpen.value = !isOpen.value;
  };
  </script>
  
  <style lang="scss" scoped>
  .tree-node {
    margin-left: 16px;
    font-size: 14px;
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