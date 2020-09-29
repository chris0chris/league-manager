<template>
    <div>
      <Field v-for="(ScheduleF,index) in Schedule" :key="index" :index="index" :Schedule="ScheduleF"/>
    </div>
</template>

<script>
import axios from 'axios'
import Field from './Field'

export default {
  name: 'Schedule',
  props: ['Gameday'],
  components: {
    Field
  },
  data () {
    return {
      Schedule: [],
      Timeslots: undefined,
      Fields: 0
    }
  },
  created () {
    axios
      .get('http://127.0.0.1:8000/api/gameday/' + this.$route.params.id + '/schedule')
      .then(response => (this.process_Data(response.data)))
      .catch(err => console.log(err))
  },
  methods: {
    process_Data (Data) {
      for (var i = 0; i < Data.data.length; i++) {
        if (Data.data[i][1] > this.Fields) this.Fields = Data.data[i][1]
      }
      this.Schedule = new Array(this.Fields)
      for (i = 0; i < this.Fields; i++) {
        var cnt = 0
        for (var z = 0; z < Data.data.length; z++) {
          if (Data.data[z][1] === (i + 1)) cnt += 1
        }
        this.Schedule[i] = new Array(cnt)
      }
      for (i = 0; i < this.Schedule.length; i++) {
        cnt = 0
        for (z = 0; z < Data.data.length; z++) {
          if (Data.data[z][1] - 1 === i) {
            var tmp = Data.data[z]
            tmp.splice(1, 1)
            this.Schedule[i][cnt] = tmp
            cnt += 1
          }
        }
      }
    }
  }
}
</script>

<style scoped>
.div{
  padding-top: 10px;
}
.Field{
  table-layout: auto;
}

</style>
