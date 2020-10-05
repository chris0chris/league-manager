<template>
    <div>
    <md-tabs md-sync-route>
      <img src='/imgs/DFFL_Logo.jpg'>
      <md-tab id="tab-home" md-label="Home" to="/" exact>
      </md-tab>

      <md-tab id="tab-gamedays" md-label="Gamedays" to="/gamedays">
      </md-tab>

      <md-tab id="tab-posts" md-label="Posts" to="/components/tabs/posts">
      </md-tab>

      <md-tab id="tab-favorites" md-label="Favorites" to="/components/tabs/favorites">
      </md-tab>
    </md-tabs>
  </div>
</template>

<script>
export default {
  name: 'navbar'
}
</script>
