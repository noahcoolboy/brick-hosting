<template>
  <v-app dark>
    <v-main>
      <v-container class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="8" md="6">
            <v-row justify="space-between" align="center" class="mx-0 mb-2">
              <h2>Your Servers</h2>
              <div>
                <a href="/add" style="color: transparent"
                  ><v-btn icon small>
                    <v-tooltip bottom>
                      <template v-slot:activator="{ on, attrs }">
                        <v-icon small v-on="on" v-bind="attrs">mdi-plus</v-icon>
                      </template>
                      <span>Add Server</span>
                    </v-tooltip>
                  </v-btn></a
                >
              </div>
            </v-row>
            <v-simple-table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="4"><p class="empty">Loading...</p></td>
                </tr>
                <ServerEntry
                  @start="start(server.id)"
                  @stop="stop(server.id)"
                  @restart="restart(server.id)"
                  @edit="edit(server.n)"
                  v-else-if="servers.length > 0"
                  v-for="server in servers"
                  :server="server"
                  :key="server.id"
                ></ServerEntry>
                <tr v-else>
                  <td colspan="4">
                    <p class="empty">You do not have any servers...</p>
                  </td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
    <v-dialog v-model="dialog" width="400">
      <v-card>
        <v-card-title class="text-h5"> Are you sure? </v-card-title>

        <v-card-text>
          {{ dialogText }}
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="dialog = false"> Cancel </v-btn>
          <v-btn :color="dialogActionColor" text @click="dialogCallback(); dialog = false">
            {{ dialogAction }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import ServerEntry from "~/components/ServerEntry.vue";
export default {
  name: "IndexPage",
  components: { ServerEntry },
  methods: {
    start(serverId) {
      this.socket.emit("start-server", {
        id: serverId,
      });
    },
    restart(serverId, confirm) {
      if (!confirm) {
        this.dialogText =
          "Restarting the server will kick everyone currently playing your game.";
        this.dialogAction = "restart";
        this.dialogActionColor = "blue";
        this.dialog = true;
        this.dialogCallback = () => {
          this.restart(serverId, true);
        }
      } else {
        this.socket.emit("stop-server", {
          id: serverId,
        });
        let s = this.servers.find(v => v.id === serverId)
        let int = setInterval(() => {
          if(s.status == "running")
            return
          
          this.socket.emit("start-server", {
            id: serverId,
          });
          clearInterval(int);
        }, 10);
      }
    },
    stop(serverId, confirm) {
      if (!confirm) {
        this.dialogText =
          "Stopping the server will kick everyone currently playing your game. Your server will not start up again until started manually.";
        this.dialogAction = "stop";
        this.dialogActionColor = "red";
        this.dialog = true;
        this.dialogCallback = () => {
          this.stop(serverId, true);
        }
      } else {
        this.socket.emit("stop-server", {
          id: serverId,
        });
      }
    },
    edit(n) {
      window.location.href = '/edit/' + (n + 1) + '/overview'
    }
  },
  data() {
    return {
      dialog: false,
      dialogText: "",
      dialogAction: "",
      dialogActionColor: "",
      dialogCallback: null,
      loading: true,
      servers: [],
      socket: null,
    };
  },
  mounted() {
    if (process.browser) {
      let socket = io();
      socket.on("connect", () => {
        socket.once("auth", (data) => {
          if (data.success) {
            socket.emit("list-servers");
            socket.once("list-servers", (data) => {
              this.loading = false;
              this.servers = data;
              data.forEach((server) => {
                socket.emit("subscribe", {
                  id: server.id,
                });
              });
              socket.on("update", (data) => {
                this.servers.find((v) => v.id == data.id)[data.prop] =
                  data.value;
              });
            });
          } else {
            alert("Socket.io auth failed." + data.error);
          }
        });
      });
      this.socket = socket;
    }
  },
};
</script>

<style lang="scss">
tbody {
  tr:hover {
    background-color: transparent !important;
  }
  td {
    cursor: default;
  }
}
.fix {
  line-height: 80%;
}
.empty {
  width: 100%;
  text-align: center;
  font-size: 1rem;
  color: #777;
  margin-top: 1rem;
  margin-bottom: 1rem;
}
</style>