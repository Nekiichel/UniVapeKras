<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <UniVapeKras/>
  </div>
</template>

<script>
import UniVapeKras from './components/UniVapeKras.vue'

export default {
  name: 'App',
  components: {
    UniVapeKras
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
