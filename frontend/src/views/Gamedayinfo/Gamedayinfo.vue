<template>
    <div class="wrapper">
        <div v-bind:Gamedayinfo="Gamedayinfo">
            <div class="center">
                {{Gameday.name}}
            </div>
            Date: {{Gameday.date}}<br>
            Start: {{Gameday.start}} Uhr
        </div>
        <div class="center" @click="showSchedule">
          Schedule
        </div>
        <Schedule v-bind:Gameday="this.Gameday" v-if="this.bshowSchedule"/>
      <div class="center">
        Table
      </div>
    </div>
</template>

<script>
import axios from 'axios'
import Schedule from './Schedule'

export default {
  name: 'Gamedayinfo',
  components: {
    Schedule
  },
  data () {
    return {
      bshowSchedule: false,
      Gameday: ['id', 'author', 'date', 'name', 'start']
    }
  },
  methods: {
    showSchedule () {
      if (this.bshowSchedule === false) {
        this.bshowSchedule = true
      } else this.bshowSchedule = false
    }
  },
  created () {
    axios
      .get('http://127.0.0.1:8000/api/gameday/' + this.$route.params.id + '/')
      .then(response => (this.Gameday = response.data))
      .catch(err => console.log(err))
  }

}
</script>

<style scoped>
div.wrapper{
    padding-top: 10px;
    padding-left: 10px;
}

div{
    font-size: 20px;
    line-height: 30px;
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
