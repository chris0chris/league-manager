<template>
    <div class="surrounder">
        <div class="center">
            Gamedays
        </div>
      <md-table>
        <md-table-head> Id   </md-table-head>
        <md-table-head> Date </md-table-head>
        <md-table-head> Name </md-table-head>
        <GamedayItem v-bind:Gameday="Gameday" v-bind:key="Gameday.id" v-for="Gameday in Gamedays"/>
      </md-table>
      <md-button class="md-raised" @click="$router.push('gamedays/add')">
        + add
      </md-button>
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
div.surrounder{
    padding-top: 10px;
    padding-left: 10px;
    margin-top: 10px;
    margin-left: 10px;
}
.center{
    text-decoration: underline;
    font-size: 30px;
    font-weight: bold;
    width: 100%;
    margin: auto;
    text-align: center;
    line-height: 40px;
}
</style>
