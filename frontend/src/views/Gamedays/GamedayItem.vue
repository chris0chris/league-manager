<template>
    <tr @click="route">
      <td>{{Gameday.id}}</td>
      <td>{{Gameday.date}}</td>
      <td>{{Gameday.name}}</td>
      </tr>
</template>

<script>

export default {
  name: 'GamedayItem',
  props: ['Gameday'],
  methods: {
    route: function () {
      this.$router.push('gamedays/' + this.Gameday.id)
    }
  }
}
</script>

<style scoped>
tr{
  cursor: pointer;
}
td{
  font-size: 30px;
}

</style>
