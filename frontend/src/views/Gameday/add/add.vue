<template>
<div class="wrapper">
    <div class="center">
        add Gameday
    </div>
    <div class="Test">
    <div class="container">
        <div class="row">
            Name:
            <md-field>
                <md-input v-model="Gameday.name"/>
            </md-field>
        </div>
        <div class="row">
            Datum:
            <md-field>
                <md-datepicker v-model="Gameday.date"/>
            </md-field>
        </div>
        <div class="row">
            Uhrzeit:
            <md-field>
            <md-input placeholder="hh:mm" v-model="Gameday.start"/>
            </md-field>
        </div>
        <div class="row">
            Felder:
            <md-field>
                <md-input id="fields"/>
            </md-field>
        </div>
    </div>
    <div class="Teams">
    <div v-for="i in numberTeams" :key="i" class="row">
        <p>Team {{i}}:</p>
        <md-field>
            <md-input id="name"/>
        </md-field>
    </div>
    <br>
    <md-button class="md-raised" @click="addTeam">
        + add Team
    </md-button>
    </div>
     <md-button class="md-raised" @click="submit">
        submit
    </md-button>
    </div>
</div>

</template>

<script>
export default {
  data () {
    return {
      numberTeams: 5,
      Gameday: {
        name: '',
        start: '',
        date: '',
        Teams: []
      }
    }
  },
  methods: {
    addTeam () {
      this.numberTeams += 1
    },
    submit () {
    }
  }
}
</script>

<style scoped>
md-field{
    width: 40px;
}
div{
    font-size: 20px;
    line-height: 30px;
}
p{
    width: 100px;
}
.center{
    text-decoration: underline;
    font-size: 30px;
    font-weight: bold;
    width: 100%;
    margin: auto;
    text-align: center;
}
.row{
    display: flex;
    align-items: center;
}
.Test{
    display: flex;
}
div.wrapper{
    padding-top: 10px;
    padding-left: 10px;
}
.container{
    width: 400px;
}
.Teams{
    padding-left: 10px;
}
</style>
