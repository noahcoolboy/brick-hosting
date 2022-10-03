<template>
  <v-app dark>
    <v-main>
      <v-container class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="10" sm="8" md="6" lg="5" xl="4">
            <v-row justify="space-between" align="center" class="mx-0 mb-2">
              <v-alert type="error" icon="mdi-alert-circle" class="fill-width" v-if="error">{{ error }}</v-alert>
              <v-card class="fill-width">
                <v-card-title>Add New Server</v-card-title>
                <v-card-subtitle>Host a new Brick-Hill Game.</v-card-subtitle>
                <v-card-text class="pb-0">
                  <v-text-field
                    label="Game Name"
                    placeholder="My Awesome Game"
                    outlined
                    hide-details
                    v-model="name"
                  ></v-text-field>
                  <v-text-field
                    label="Host Key"
                    placeholder="yX64LZauSiJgrebX..."
                    outlined
                    class="mt-2"
                    hide-details
                    v-model="hostKey"
                  ></v-text-field>
                </v-card-text>
                <v-card-actions>
                    <div class="fill-width d-flex justify-end">
                        <a :href="loading ? 'javascript:void(0)' : '/'" style="color: transparent;"><v-btn :disabled="loading">Cancel</v-btn></a>
                        <v-btn color="blue" class="mx-2" @click="addServer()" :disabled="disableAdd">Add</v-btn>
                    </div>
                </v-card-actions>
              </v-card>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      error: null,
      io: null,
      name: "",
      hostKey: "",
      loading: false,
    }
  },
  mounted() {
    if(process.browser) {
      let socket = io()
      socket.on("connect", () => {
        socket.once("auth", (data) => {
          if(data.success) {
            this.io = socket
          } else {
            alert("Socket.io auth failed." + data.error)
          }
        })
      })
    }
  },
  methods: {
    addServer() {
      if(this.io) {
        this.loading = true
        this.io.emit("add-server", {
          name: this.name,
          hostKey: this.hostKey,
        })
        this.io.once("add-server", data => {
          if(data.success) {
            window.location.href = "/"
          } else {
            this.error = data.error
            this.loading = false
          }
        })
      }
    },
  },
  computed: {
    disableAdd() {
      return this.loading || this.name.length < 2 || this.name.length > 30 || this.hostKey.match(/[^a-zA-Z0-9]/) || this.hostKey.length != 64 || !this.io
    }
  }
}
</script>

