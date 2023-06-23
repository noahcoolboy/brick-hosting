<template>
  <v-app light>
    <v-main>
      <v-container class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="12" md="12" lg="10" xl="6">
            <v-row justify="space-between" align="center" class="mx-0 mb-2">
              <div class="fill-width d-flex justify">
                <v-card rounded class="mt-4 md-mr" style="height: min-content">
                  <v-navigation-drawer permanent floating class="vw">
                    <v-list dense>
                      <v-subheader class="pl-4">Overview</v-subheader>
                      <NuxtLink
                        v-for="item in nav.overview"
                        :key="item.name"
                        :to="item.link"
                        ><v-list-item link>
                          <v-list-item-icon>
                            <v-icon>{{ item.icon }}</v-icon>
                          </v-list-item-icon>
                          <v-list-item-content>
                            <v-list-item-title>{{
                              item.name
                            }}</v-list-item-title>
                          </v-list-item-content>
                        </v-list-item></NuxtLink
                      >
                      <v-subheader class="pl-4">Configuration</v-subheader>
                      <NuxtLink
                        v-for="item in nav.configuration"
                        :key="item.name"
                        :to="item.link"
                        style="cursor: default"
                        :style="{pointerEvents: item.disabled ? 'none' : 'auto'}"
                        ><v-list-item :link="!item.disabled" :disabled="item.disabled">
                          <v-list-item-icon>
                            <v-icon :disabled="item.disabled">{{ item.icon }}</v-icon>
                          </v-list-item-icon>
                          <v-list-item-content>
                            <v-list-item-title>{{
                              item.name
                            }}</v-list-item-title>
                          </v-list-item-content>
                        </v-list-item></NuxtLink
                      >
                      <v-subheader class="pl-4">Exit</v-subheader>
                      <a href="/"
                        ><v-list-item link>
                          <v-list-item-icon>
                            <v-icon>mdi-logout</v-icon>
                          </v-list-item-icon>
                          <v-list-item-content>
                            <v-list-item-title>Return To Server List</v-list-item-title>
                          </v-list-item-content>
                        </v-list-item>
                      </a>
                    </v-list>
                  </v-navigation-drawer>
                </v-card>
                <v-card class="flex-grow-1 mt-4 px-4 py-4" rounded>
                  <Nuxt></Nuxt>
                </v-card>
              </div>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style>
@media screen and (min-width: 700px) {
  .justify {
    justify-content: space-between;
  }
  .md-mr {
    margin-right: 1rem !important;
  }
}
@media screen and (max-width: 700px) {
  .justify {
    justify-content: center;
    flex-wrap: wrap;
  }
  .vw {
    width: 100vw !important;
  }
}
.v-navigation-drawer a {
  color: transparent;
}
</style>

<script>
export default {
  data() {
    let data = {
      nav: {
        overview: [
          {
            name: "Overview",
            icon: "mdi-file-document",
            link: "/overview",
          },
          {
            name: "Console",
            icon: "mdi-console",
            link: "/console",
          },
          {
            name: "Configure",
            icon: "mdi-cog",
            link: "/configure",
          }
        ],
        configuration: [
          {
            name: "Maps",
            icon: "mdi-toy-brick-marker",
            link: "/maps",
          },
          {
            name: "Scripts",
            icon: "mdi-script",
            link: "/scripts",
          },
          {
            name: "Sounds",
            icon: "mdi-music-note",
            link: "/sounds",
          },
        ],
      },
    };
    Object.keys(data.nav).forEach((v) =>
      data.nav[v].forEach(
        (v) => (v.link = "/edit/" + this.$route.params.serverId + v.link)
      )
    );
    return data;
  },
  created() {
    if (process.browser) {
      let socket = io();
      socket.on("connect", () => {
        socket.once("auth", (data) => {
          if (data.success) {
            socket.emit("get-server", {
              serverIndex: this.$route.params.serverId - 1,
            })
            socket.once("get-server", (data) => {
              this.$store.commit("serverStatus/set", data)
              socket.emit("subscribe")
              socket.on("update", (data) => {
                this.$store.commit("serverStatus/update", { prop: data.prop, value: data.value })
              })
            })
          } else {
            alert("Socket.io auth failed." + data.error);
          }
        });
      });
      window.socket = socket;
    }
  }
};
</script>