<template>
  <div>
    <div class="panel-body">
      <div class="player-bid card">
        <div class="card-title"><input type="text" class="name" v-model="nameA"></div>
        <div class="card-body">
          <label>
            <span>How many turns would you need as defenders to escape?</span>
            <input type="text" class="bid" v-model.number="bidA">
          </label>
        </div>
      </div>
      <div class="player-bid card">
        <div class="card-title"><input type="text" class="name" v-model="nameB"></div>
        <div class="card-body">
          <label>
            <span>How many turns would you need as defenders to escape?</span>
            <input type="text" class="bid" v-model.number="bidB">
          </label>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button class="submit" :disabled="!bidCanEnd" @click="submit">Play</button>
      <span class="hint-or">or continue bidding</span>
      <button class="skip" @click="skip">Skip bidding</button>
    </div>
  </div>
</template>

<script>
function saved(key, defaultValue) {
  return {
    get: function() {
      return localStorage.getItem(key) || defaultValue;
    },
    set: function(value) {
      localStorage.setItem(key, value);
    }
  }
}

export default {
  name: 'BiddingPanel',
  data: function() {
    return {
      bidA: undefined,
      bidB: undefined
    }
  },
  computed: {
    nameA: saved('nameA', 'Player 1'),
    nameB: saved('nameB', 'Player 2'),
    bidCanEnd: function() {
      return this.bidA > 0 && this.bidB > 0 && this.bidA !== this.bidB;
    }
  },
  methods: {
    submit: function() {
      let attacker = {'name': this.nameA, 'bid': this.bidA};
      let defender = {'name': this.nameB, 'bid': this.bidB};

      if (attacker.bid < defender.bid) {
        let temp = attacker;
        attacker = defender;
        defender = temp;
      }

      let players = {attacker, defender};
      this.$emit("update:players", players);
    },
    skip: function() {
      this.bidA = undefined;
      this.bidB = undefined;

      this.submit();
    }
  }
}
</script>