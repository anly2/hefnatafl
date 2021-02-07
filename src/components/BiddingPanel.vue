<template>
  <div class="bidding-panel">
    <div class="panel-body">
      <div class="player-bid card">
        <div class="card-title"><input type="text" class="name" v-model="nameA"></div>
        <div class="card-body">
          <label>
            <span>How many turns would you need&#x2029; as defenders to escape?</span>
            <input type="text" class="bid" v-model.number="bidA">
          </label>
        </div>
      </div>
      <div class="player-bid card">
        <div class="card-title"><input type="text" class="name" v-model="nameB"></div>
        <div class="card-body">
          <label>
            <span>How many turns would you need&#x2029; as defenders to escape?</span>
            <input type="text" class="bid" v-model.number="bidB">
          </label>
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <button class="submit" :disabled="!bidCanEnd" @click="submit">Play</button>
      <span class="hint-or">or continue bidding</span>
      <div class="skip">Or
        <button class="skip" @click="skip">Skip bidding</button>
      </div>
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
    },
    players: function() {
      let attacker = {'name': this.nameA, 'bid': this.bidA};
      let defender = {'name': this.nameB, 'bid': this.bidB};

      if (attacker.bid < defender.bid) {
        let temp = attacker;
        attacker = defender;
        defender = temp;
      }

      return {attacker, defender};
    }
  },
  watch: {
    players: function() {
      this.$emit("update:players", this.players);
    }
  },
  mounted: function() {
    this.$emit("update:players", this.players);
  },
  methods: {
    submit: function() {
      this.$emit("confirm-bidding", this.players);
    },
    skip: function() {
      this.bidA = undefined;
      this.bidB = undefined;

      this.submit();
    }
  }
}
</script>

<style scoped>

.panel-body {
  display: flex;
  flex-flow: row wrap;
  justify-content: space-around;
}
.panel-footer {
  margin-top: 15px;
}

.card {
  width: 35vw;
  min-width: 15em;
  margin-top: 10px;
  margin-bottom: 15px;
}

.player-bid.card input {
  text-align: center;
}
.player-bid.card .name {
  font-weight: bold;
}
.player-bid.card label>span {
  display: block;
  margin: 10px 0;
}

.panel-footer .hint-or,
.panel-footer .skip {
  font-size: 10px;
}
.panel-footer .submit {
  font-size: 18px;
}
.panel-footer .hint-or {
  margin-left: 10px;
}
.panel-footer .skip {
  margin-top: 5px;
}
</style>