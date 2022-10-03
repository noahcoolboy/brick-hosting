<template>
  <tr>
    <td>{{ server.n + 1 }}</td>
    <td>{{ server.name }}</td>
    <td>
      <v-icon small class="mr-2" :color="server.status == 'running' ? 'green' : 'red'">{{ server.status == "running" ? "mdi-check-circle" : "mdi-close" }}</v-icon
      ><span class="fix">{{ server.status == "running" ? "Running" : "Stopped" }}</span>
    </td>
    <td>
      <v-btn icon small @click="server.status == 'running' ? $emit('stop') : $emit('start')">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon small v-on="on" v-bind="attrs">{{server.status == "running" ? "mdi-stop" : "mdi-play" }}</v-icon>
          </template>
          <span>{{server.status == "running" ? "Stop" : "Start" }} Server</span>
        </v-tooltip>
      </v-btn>
      <v-btn icon small @click="$emit('restart')" v-if="server.status == 'running'">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon small v-on="on" v-bind="attrs">mdi-restart</v-icon>
          </template>
          <span>Restart Server</span>
        </v-tooltip>
      </v-btn>
      <v-btn icon small @click="$emit('edit')">
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <v-icon small v-on="on" v-bind="attrs">mdi-pencil</v-icon>
          </template>
          <span>Edit</span>
        </v-tooltip>
      </v-btn>
    </td>
  </tr>
</template>

<script>
export default {
  props: {
    server: {
      type: Object,
      required: true
    }
  },
}
</script>