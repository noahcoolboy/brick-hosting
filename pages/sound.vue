<template>
  <v-app dark>
    <v-main>
      <div class="fill-height fill-width">
        <div class="d-flex justify-center align-center fill-height">
          <v-card v-if="screen == 'code'">
            <v-card-title>Link Your Account</v-card-title>
            <v-card-subtitle>Input the command below in game.</v-card-subtitle>
            <v-card-text>
              <div class="fill-width d-flex align-center">
                <v-text-field
                  outlined
                  disabled
                  :value="this.code"
                  hide-details
                ></v-text-field>
                <v-tooltip top>
                  <template v-slot:activator="{ on }">
                    <v-btn
                      v-on="on"
                      icon
                      class="ml-2"
                      @click="copyCode()"
                      @mouseleave="mouseleave()"
                    >
                      <v-icon>mdi-content-copy</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ copy }}</span>
                </v-tooltip>
              </div>
            </v-card-text>
          </v-card>
          <div
            v-else-if="screen == 'audio'"
            class="d-flex align-center"
            style="flex-direction: column"
          >
            <v-icon x-large>mdi-music-note</v-icon>
            <span class="mt-4">{{ credit }}</span>
          </div>
          <div
            v-else-if="screen == 'left'"
            class="d-flex align-center"
            style="flex-direction: column"
          >
            <span style="font-weight: 600; font-size: 1.4rem"
              >You have left the game.</span
            >
            <span class="mt-1">You may now close this page.</span>
          </div>
          <div
            v-else
            class="d-flex align-center"
            style="flex-direction: column"
          >
            <v-progress-circular indeterminate></v-progress-circular>
            <span class="mt-4">Loading...</span>
          </div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
let sounds = {};
export default {
  data() {
    return {
      screen: "loading",
      copy: "Copy",
      code: "Loading...",
      credit: "",
    };
  },
  methods: {
    async copyCode() {
      await navigator.clipboard.writeText(this.code);
      this.copy = "Copied!";
    },
    mouseleave() {
      this.copy = "Copy";
    },
  },
  mounted() {
    if (process.browser) {
      let socket = io({
        query: {
          audio: true,
        },
      });
      socket.on("connect", () => {
        socket.once("code", (code) => {
          this.code = code;
          this.screen = "code";
        });
        socket.once("linked", () => {
          this.screen = "audio";
        });
        socket.on("newSound", (sound) => {
          sound.howl = new Howl({
            src: [URL.createObjectURL(new Blob([sound.file]))],
            format: [sound.format],
            volume: sound.volume,
            loop: sound.loop,
            rate: sound.speed
          });
          sounds[sound.id] = sound;

          if(sound.position) {
            sound.howl.pos(sound.position[0], sound.position[2], sound.position[1] + 4.5)
          }
          if(sound.orientation) {
            sound.howl.orientation(...sound.orientation)
          }
          if(sound.pannerAttr) {
            sound.howl.pannerAttr(sound.pannerAttr)
          }
        });
        socket.on("play", (id) => {
          if(sounds[id]) {
            sounds[id].howl.play();
            if(sounds[id].credit)
              this.credit = sounds[id].credit;
            console.log("play")
          }
        });
        socket.once("left", () => {
          this.screen = "left";
          Howler.unload();
          socket.close();
        });
        socket.on("moved", (pos, rot) => {
          rot += 180
          Howler.pos(pos[0], pos[2], pos[1] + 4.5);
          Howler.orientation(Math.sin(rot * Math.PI / 180), 0, Math.cos(rot * Math.PI / 180), 0, 1, 0);
        })
      });
    }
  },
};
</script>