<template>
  <div
    class="d-flex fill-width fill-height align-center"
    style="flex-direction: column"
  >
    <h1>{{ this.$store.state.serverStatus.gameName }}</h1>
    <div class="d-flex justify-space-around fill-width mt-4">
      <div>
        <p class="text-lg text-center mb-0">Player Count</p>
        <h2 class="text-center mb-4">{{ this.$store.state.serverStatus.overview.playerCount }}</h2>
        <p class="text-lg text-center fill-width mb-0">Total Visits</p>
        <h2 class="text-center">{{ this.$store.state.serverStatus.overview.visits }}</h2>
      </div>
      <div>
        <p class="text-lg text-center mb-0">Server Status</p>
        <h2 class="text-center mb-4">
          <v-progress-circular
            v-if="gameStatus.status == 'Starting'"
            indeterminate
            class="mr-3"
            size="23"
            width="2"
            color="blue"
          ></v-progress-circular>
          <v-icon :color="gameStatus.color" class="mr-2" v-else>{{
            gameStatus.icon
          }}</v-icon
          >{{ gameStatus.status }}
        </h2>
        <p class="text-lg text-center fill-width mb-0">Server Uptime</p>
        <h2 class="text-center">{{ uptime }}</h2>
      </div>
    </div>
    <div
      class="d-flex justify-center fill-width mt-8 flex-wrap"
      style="gap: 1rem"
    >
      <v-btn
        color="blue"
        outlined
        :disabled="this.$store.state.serverStatus.status == 'running'"
        @click="start()"
        >Start Server</v-btn
      >
      <v-btn
        color="green"
        outlined
        :disabled="this.$store.state.serverStatus.status != 'running'"
        @click="restart()"
        >Restart Server</v-btn
      >
      <v-btn
        color="red"
        outlined
        :disabled="this.$store.state.serverStatus.status != 'running'"
        @click="stop()"
        >Stop Server</v-btn
      >
    </div>
  </div>
</template>

<script>
export default {
  layout: "edit",
  computed: {
    gameStatus() {
      switch (this.$store.state.serverStatus.status) {
        case "running":
          return {
            icon: "mdi-check",
            color: "green",
            status: "Running",
          };
        case "stopped":
          return {
            icon: "mdi-close",
            color: "red",
            status: "Stopped",
          };
        default:
          return {
            icon: "mdi-help-circle",
            color: "blue",
            status: "Unknown",
          };
      } 
    },
  },
  data() {
    return {
      uptime: "00:00:00:00",
    };
  },
  mounted() {
    function prefix(n) {
      return n.toString().padStart(2, "0");
    }

    function update() {
      if(this.$store.state.serverStatus.status != "running") return this.uptime = "00:00:00:00";
      let diff = Math.floor(
        (Date.now() - this.$store.state.serverStatus.overview.startTime) / 1000
      );
      let seconds = prefix(diff % 60);
      let minutes = prefix(Math.floor(diff / 60) % 60);
      let hours = prefix(Math.floor(diff / 3600) % 24);
      let days = prefix(Math.floor(diff / 86400));

      this.uptime = `${days}:${hours}:${minutes}:${seconds}`;
    }
    update = update.bind(this)

    setInterval(() => {
      update()
    }, 1000);
    update()
  },
  methods: {
    start() {
      window.socket.emit("start-server");
    },
    restart() {
      window.socket.emit("stop-server")
      this.uptime = "00:00:00:00"
      let int = setInterval(() => {
        if(this.$store.state.serverStatus.status == "running")
          return
        
        window.socket.emit("start-server");
        clearInterval(int);
      }, 10);
    },
    stop() {
      window.socket.emit("stop-server");
      this.uptime = "00:00:00:00"
    },
    edit(n) {
      window.location.href = "/edit/" + (n + 1) + "/overview";
    },
  },
};
</script>

<style>
.text-lg {
  font-size: 1.25rem;
}
</style>