<template>
  <div id="app">
    <navbar/>
    <router-view/>
  </div>
</template>

<script>
import navbar from './components/navbar/navbar'

export default {
  name: 'app',
  components: {
    navbar
  }
}
</script>

<style>

</style>
