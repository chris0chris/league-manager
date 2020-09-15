<template>
    <tr>
      <td>{{Gameday.id}}</td>
      <td>{{Gameday.date}}</td>
      <td>{{Gameday.name}}</td>
      <td><router-link :to="'/gamedayinfo/'+Gameday.id">view</router-link></td>
      </tr>
</template>

<script>

export default {
  name: 'GamedayItem',
  props: ['Gameday']
}
</script>

<style scoped>

</style>
