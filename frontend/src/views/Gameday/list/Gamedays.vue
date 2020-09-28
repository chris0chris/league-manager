<template>
    <div class="surrounder">
        <div class="center">
            Gamedays
        </div>
      <table>
        <th> Id </th>
        <th> Date </th>
        <th> Name </th>
        <GamedayItem v-bind:Gameday="Gameday" v-bind:key="Gameday.id" v-for="Gameday in Gamedays"/>
      </table>
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
table{
  size: 110%;
    line-height:40px ;

}
th{
  font-size: 30px;
  font-weight: bold;
}
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
}
</style>
