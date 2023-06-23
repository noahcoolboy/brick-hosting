<template>
  <div>
    <h2 class="text-center mb-4">Configuration</h2>
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
      type="password"
    ></v-text-field>

    <p class="mt-4">
      Restarting your game is required when editing the host key. The changes
      won't take effect otherwise.
    </p>
    <v-btn
      color="blue"
      outlined
      :disabled="disableAdd"
      @click="save()"
      >Save Changes</v-btn
    >

    <p class="mt-4">
      Deleting your game is permanent and cannot be undone.
    </p>
    <v-btn
      color="red"
      outlined
      @click="deleteGame()"
      >{{ confirmation ? "Click To Confirm Deletion" : "Delete Game" }}</v-btn
    >
  </div>
</template>
  
<script>
export default {
  layout: "edit",
  data() {
    return {
      name: this.$store.state.serverStatus.gameName,
      hostKey: "x".repeat(64),
      confirmation: false
    };
  },
  computed: {
    disableAdd() {
      return (
        !process.browser ||
        this.name.length < 2 ||
        this.name.length > 30 ||
        this.hostKey.match(/[^a-zA-Z0-9]/) ||
        this.hostKey.length != 64 ||
        !window.socket ||
        this.hostKey == "x".repeat(64)
      );
    },
  },
  methods: {
    save() {
      window.socket.emit("edit-server", {
        name: this.name,
        hostKey: this.hostKey,
      });
    },
    deleteGame() {
      if (this.confirmation) {
        window.socket.emit("delete-server", () => {
            window.location = "/"
        });
      } else {
        this.confirmation = true;
        setTimeout(() => {
          this.confirmation = false;
        }, 5000);
      }
    },
  },
};
</script>