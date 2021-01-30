<template>
    <span v-if="piece" class="piece" :id="piece.key" :key="piece.key">
        <span class="piece-king" v-if="piece.name == 'king'">♔</span>
        <span class="piece-defender" v-if="piece.name == 'defender'">♖</span>
        <span class="piece-attacker" v-if="piece.name == 'attacker'">♜</span>
    </span>
</template>

<script>
export default {
  name: 'Piece',
  props: ['piece']
}
</script>