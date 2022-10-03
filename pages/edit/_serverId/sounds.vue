<template>
  <div>
    <p class="text-lg">Your Sounds:</p>
    <v-list class="pt-0 mb-5">
      <v-list-item
        style="min-height: 32px"
        v-for="n in $store.state.serverStatus.sounds.soundList"
        :key="n"
      >
        <v-list-item-action class="mr-6 my-0">
          <v-icon>mdi-music</v-icon>
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
    <p clas="text-lg" style="margin-bottom: 0px">Upload A Sound:</p>
    <div class="d-flex fill-width mt-0">
      <v-file-input
        accept=".mp3,.opus,.ogg,.wav,.aac,.m4a"
        label="Sound File"
        prepend-icon=""
        @change="upload()"
        :error-messages="
          (!uploading &&
            (error || this.$store.state.serverStatus.sounds.error)) ||
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
      sound: null,
    };
  },
  methods: {
    upload() {
      this.$store.commit("serverStatus/update", {
        prop: "sounds.error",
        value: null,
      });
      this.error = false;
      if (this.file) {
        // Check if file size is too large
        if (this.file.size > 1000 * 1000 * 10) {
          this.error = "Sound size must be less than 10MB";
          return;
        } else {
          this.uploading = true;
          window.socket.emit("add-sound", {
            sound: this.file,
            name: this.file.name,
          });
          window.socket.once("add-sound", () => {
            this.uploading = false;
            this.file = null;
          });
        }
      }
    },
    del(sound) {
      window.socket.emit("delete-sound", {
        name: sound,
      });
    },
  },
};
</script>