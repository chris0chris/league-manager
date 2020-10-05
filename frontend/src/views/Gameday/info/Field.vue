<template>
    <div>
        Field: {{index}}
        <md-table>
            <md-table-row>
                <md-table-head>Kick-Off</md-table-head>
                <md-table-head>Officals</md-table-head>
                <md-table-head>Runde</md-table-head>
                <md-table-head>Platz</md-table-head>
                <md-table-head>Heim</md-table-head>
                <md-table-head>Punkte Heim</md-table-head>
                <md-table-head>Punkte Gast</md-table-head>
                <md-table-head>Gast</md-table-head>
                <md-table-head>Status</md-table-head>
            </md-table-row>
            <md-table-row v-for="(Game,index) in Schedule" :key="index" :Game="Game">
                <md-table-cell v-for="(item,index) in Game" :key="index" :item="item">
                    {{item}}
                </md-table-cell>
            </md-table-row>
        </md-table>
    </div>

</template>

<script>
export default {
  name: 'Field',
  props: ['Schedule', 'index']
}
</script>

<style scoped>
div{
    table-layout: auto;
    width: auto;
}
md-table{
    width: 50%;
}
</style>
