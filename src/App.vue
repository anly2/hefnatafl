<template>
  <div id="app">
    <Modal v-if="!biddingDone">
      <BiddingPanel :players.sync="players" @confirm-bidding="biddingDone = true"></BiddingPanel>
    </Modal>

    <HnefataflBoard :players="players" />
  </div>
</template>

<script>
import HnefataflBoard from './components/HnefataflBoard.vue'
import Modal from './components/Modal.vue'
import BiddingPanel from './components/BiddingPanel.vue'

export default {
  name: 'app',
  components: {
    HnefataflBoard, Modal, BiddingPanel
  },
  data: function() {
    return {
      players: undefined,
      biddingDone: false
    }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 50px;
}
</style>
