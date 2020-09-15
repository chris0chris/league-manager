<template>
    <div>
        <h1>
            Gamedays:
        </h1>
      <table>
        <th> Id </th>
        <th> Date </th>
        <th> Name </th>
        <GamedayItem v-bind:Gameday="Gameday" v-bind:key="Gameday.id" v-for="Gameday in Gamedays" />
      </table>
    </div>
</template>

<script>
import axios from 'axios'
import GamedayItem from './GamedayItem'

export default {
  name: 'Gamedays',
  data () {
    return {
      Gamedays: []
    }
  },
  components: {
    GamedayItem
  },
  created () {
    axios
      .get('http://127.0.0.1:8000/api/gameday/list/')
      .then(response => (this.Gamedays = response.data))
      .catch(err => console.log(err))
  }
}
</script>

<style scoped>
table{
  size: 110%;
}

</style>
