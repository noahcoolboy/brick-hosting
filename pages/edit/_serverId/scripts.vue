<template>
  <div>
    <p class="text-lg">Your Scripts:</p>
    <v-list class="pt-0 mb-5">
      <v-list-item
        style="min-height: 32px"
        v-for="n in $store.state.serverStatus.scripts.scriptList"
        :key="n"
      >
        <v-list-item-action class="mr-6 my-0">
          <v-icon color="yellow">mdi-language-javascript</v-icon>
        </v-list-item-action>
        <v-list-item-content class="my-0 py-0">
          <v-list-item-title>
            <span>{{ n }}</span>
          </v-list-item-title>
        </v-list-item-content>
        <v-list-item-action style="flex-direction: row" class="my-0">
          <v-btn icon class="d-inline" small @click="del(n)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </v-list-item-action>
      </v-list-item>
    </v-list>
    <p clas="text-lg" style="margin-bottom: 0px">Upload A Script:</p>
    <div class="d-flex fill-width mt-0">
      <v-file-input
        accept=".js"
        label="Script File"
        prepend-icon=""
        @change="upload()"
        :error-messages="
          (!uploading &&
            (error || this.$store.state.serverStatus.scripts.error)) ||
          ''
        "
        ref="file"
        v-model="file"
        :loading="uploading"
        :disabled="uploading"
      ></v-file-input>
    </div>
  </div>
</template>

<script>
export default {
  layout: "edit",
  data() {
    return {
      file: null,
      uploading: false,
      error: null,
      script: null,
    };
  },
  methods: {
    upload() {
      this.$store.commit("serverStatus/update", {
        prop: "scripts.error",
        value: null,
      });
      this.error = false;
      if (this.file) {
        // Check if file size is too large
        if (this.file.size > 1000 * 1000 * 2) {
          this.error = "Script size must be less than 2MB";
          return;
        } else {
          this.uploading = true;
          window.socket.emit("add-script", {
            script: this.file,
            name: this.file.name,
          });
          window.socket.once("add-script", () => {
            this.uploading = false;
            this.file = null;
          });
        }
      }
    },
    del(script) {
      window.socket.emit("delete-script", {
        name: script,
      });
    },
  },
};
</script>