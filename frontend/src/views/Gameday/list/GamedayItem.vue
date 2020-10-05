<template>
    <md-table-row @click="route">
      <md-table-cell>{{Gameday.id}}</md-table-cell>
      <md-table-cell>{{Gameday.date}}</md-table-cell>
      <md-table-cell>{{Gameday.name}}</md-table-cell>
    </md-table-row>
</template>

<script>

export default {
  name: 'GamedayItem',
  props: ['Gameday'],
  methods: {
    route: function () {
      this.$router.push('gamedays/info/' + this.Gameday.id)
    }
  }
}
</script>

<style scoped>
tr{
  cursor: pointer;
}

</style>
