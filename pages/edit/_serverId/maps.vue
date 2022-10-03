<template>
  <div>
    <p class="text-lg">Your Maps:</p>
    <v-radio-group
      class="pt-0"
      :mandatory="!!map"
      @change="setMap()"
      v-model="map"
    >
      <v-list class="pt-0">
        <v-list-item
          style="min-height: 32px"
          v-for="n in $store.state.serverStatus.maps.mapList"
          :key="n"
        >
          <v-list-item-action class="mr-6 my-0">
            <v-radio small :value="n" selected></v-radio>
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
    </v-radio-group>
    <p clas="text-lg" style="margin-bottom: 0px">Upload A Map:</p>
    <div class="d-flex fill-width mt-0">
      <v-file-input
        accept=".brk"
        label="Map File"
        prepend-icon=""
        @change="upload()"
        :error-messages="
          (!uploading &&
            (error || this.$store.state.serverStatus.maps.error)) ||
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
      map: null,
    };
  },
  methods: {
    upload() {
      this.$store.commit("serverStatus/update", {
        prop: "maps.error",
        value: null,
      });
      this.error = false;
      if (this.file) {
        // Check if file size is too large
        if (this.file.size > 1000 * 1000 * 5) {
          this.error = "Map size must be less than 5MB";
          return;
        } else {
          let FileReader = new window.FileReader();
          FileReader.onload = (e) => {
            if (e.target.result.startsWith("RSCC")) {
              return (this.error =
                "Brick Hosting does not support maps made in the new workshop");
            } else if (!e.target.result.startsWith("B R ")) {
              return (this.error = "Invalid map file");
            }
            this.uploading = true;
            window.socket.emit("add-map", {
              map: this.file,
              name: this.file.name,
            });
            window.socket.once("add-map", () => {
              this.uploading = false;
              this.file = null;
              if(this.$store.state.serverStatus.maps.mapList.length == 1) {
                this.map = this.$store.state.serverStatus.maps.mapList[0];
              }
            });
          };
          FileReader.readAsBinaryString(this.file);
        }
      }
    },
    del(map) {
      window.socket.emit("delete-map", {
        name: map,
      });
    },
    setMap() {
      window.socket.emit("set-map", {
        name: this.map,
      });
      this.map = this.$store.state.serverStatus.maps.selected;
    },
  },
  created() {
    if (process.browser) {
      // Fuck
      let int = setInterval(() => {
        if (window.socket) {
          if (this.$store.state.serverStatus.maps.selected) {
            this.map = this.$store.state.serverStatus.maps.selected;
          } else {
            window.socket.once("get-server", (data) => {
              this.map = data.maps.selected;
            });
          }
          this.$store.state.serverStatus.maps.selected;
          clearInterval(int);
        }
      }, 10);
    }
  },
};
</script>

<style>
.text-lg {
  font-size: 1.25rem;
}
</style>