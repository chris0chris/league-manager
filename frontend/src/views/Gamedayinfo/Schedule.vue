<template>
    <div>
          <md-table>
            <th v-for="(header,index) in this.Schedule.columns" :key=index>
              {{header}}
            </th>
            <md-table-row v-for="(Game,index) in this.Schedule.data" :key=index>
              <md-table-cell v-for="(data,index) in Game" :key=index>
                {{data}}
              </md-table-cell>
            </md-table-row>
          </md-table>
    </div>
</template>

<script>
import axios from 'axios'
//  import Field from './Field'

export default {
  name: 'Schedule',
  props: ['Gameday'],
  //  components: {
  //    Field
  //  },
  data () {
    return {
      Schedule: {},
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
      this.Schedule = Data
    }
  }
}
</script>

<style scoped>
.div{
  padding-top: 10px;
}

</style>
