<template>
  <div>
    <div
      class="fill-width"
      style="background-color: black; color: white; height: 384px; overflow-y: hidden;"
    >
      <div style="transform: translateY(-100%) translateY(384px)" class="mx-2 py-2">
        <span v-for="i in $store.state.serverStatus.console.logs" :key="i">{{ i }}<br /></span>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  layout: "edit",
};
</script>