<template>
<!--TODO: implement bidding for start -->
<!--TODO: animate movements -->
<!--TODO: animate "kill" bloodshed -->
<!--TODO: animate "warning" for invalid actions -->
<div class="game-area">
    <div class="header">
        <div class="game-status" :class="{won: hasWon}">
            <div class="turn-counter">Turn {{turnCount}}</div>
            <div class="turns-remaining" v-if="players.defender.bid">
              Defender has {{ (players.defender.bid + 1 - turnCount) || "no"}} more turns left ot escape
            </div>
            <div class="win-status" v-if="hasWon">
              <span v-if="defenderWon" class="victor victor-defender">
                <span class="victor-icon">♔</span>
                <span class="victor-name player-name">{{players.defender.name}}</span>
              </span>
              <span v-else class="victor victor-attacker">
                <span class="victor-icon">♜</span>
                <span class="victor-name player-name">{{players.attacker.name}}</span>
              </span>
              won!
            </div>
            <div class="turn-status" v-else>
                {{isAttackersTurn? '♜ Attacker' : '♔ Defender'}}'s turn
                <span class="player-name">{{isAttackersTurn? players.attacker.name : players.defender.name}}</span>
            </div>
        </div>
        <button class="undo-turn" title="Undo last move" @click="undoLastMove()">⮐</button>
    </div>

    <table class="board"
        @transitionend="clearFlashes($event.target)"
    >
        <tr class="row" :id="'row:' + y" v-for="(row, y) in grid" :key="y">
            <td class="cell" :id="'cell:' + x + ',' + y" v-for="(cell, x) in row" :key="x"
                :class="{'restricted': cell.restricted, 'throne': cell.throne, 'selected': cell.selected, 'available': cell.available}"
                @click.exact="handleClick(x, y)" @click.ctrl="clearCell(x, y)"
            >
                <piece :piece="cell.piece"/>
            </td>
        </tr>
    </table>

    <div class="cemetery" :class="['cemetery-' + side]" v-for="(pieces, side) in cemeteries" :key="'cemetery-' + side">
        <div class="title">Dead {{side}}</div>

        <piece v-for="piece in pieces" :key="piece.key" :piece="piece"/>
    </div>
</div>
</template>

<script>
import Vue from 'vue';
import Piece from './Piece.vue'

function xFrom(letter) {
    return letter.toLowerCase().charCodeAt(0) - 97; //charCode('a') == 97
}
function yFrom(number) {
    return parseInt(number, 10) - 1;
}
function position(address) {
    if (!address) return null;
    let x = xFrom(address.charAt(0));
    let y = yFrom(address.substring(1));
    return {x, y};
}

function path(from, to) {
    let dx = to.x - from.x;
    let dy = to.y - from.y;

    let xStep = clamp(-1, dx, 1);
    let yStep = clamp(-1, dy, 1);


    let steps = [];
    let stepCount = Math.max(Math.abs(dx), Math.abs(dy))
    for (let i = 1; i <= stepCount; i++) {
        steps.push({
            'x': from.x + i * xStep,
            'y': from.y + i * yStep
        });
    }

    return steps;
}
function clamp(min, value, max) {
    return Math.max(min, Math.min(value, max));
}

function piecesArray(king, defenders, attackers) {
    let pieces = [];

    if (king) {
        pieces.push({
            'position': position(king),
            'name': 'king'
        });
    }

    if (defenders) {
        for (let p of defenders) {
            pieces.push({
               'position': position(p),
               'name': 'defender'
            });
        }
    }

    if (attackers) {
        for (let p of attackers) {
            pieces.push({
               'position': position(p),
               'name': 'attacker'
            });
        }
    }

    return pieces;
}

export default {
  name: 'HnefataflBoard',
  components: {Piece},
  props: {
    size: {
        type: Number,
        default: 11
    },
    pieces: {
        type: Array,
        default: function() {
            return piecesArray(
               'f6',
               ['d6', 'e5', 'e6', 'e7', 'f4', 'f5', 'f7', 'f8', 'g5', 'g6', 'g7', 'h6'],
               [
                 'a4', 'a5', 'a6', 'a7', 'a8', 'b6',
                 'd1', 'e1', 'f1', 'g1', 'h1', 'f2',
                 'k4', 'k5', 'k6', 'k7', 'k8', 'j6',
                 'd11', 'e11', 'f11', 'g11', 'h11', 'f10'
               ]
            )
        }
    },
    players: {
      type: Object,
      default: function() {
        return {
          attacker: {'name': 'Attacker', 'bid': undefined},
          defender: {'name': 'Defender', 'bid': undefined}
        }
      }
    },
    moves: {
        type: Array,
        default: function() { return []; }
    }
  },
  data: function() {
    return {
        selected: undefined
    }
  },
  computed: {
    grid: function() {
        let grid = [];
        for (let y=0; y<this.size; y++) {
            let row = [];
            for (let x=0; x<this.size; x++) {
                let cell = Vue.observable({'piece': undefined, 'selected': undefined, 'available': undefined});

                cell.restricted = (x == 0 || x == this.size-1) && (y == 0 || y == this.size-1);
                if (x == Math.floor(this.size/2) && y == Math.floor(this.size/2)) {
                    cell.restricted = true;
                    cell.throne = true;
                }

                row.push(cell);
            }
            grid.push(row);
        }

        // Apply the pieces on the grid
        for (let i=0; i<this.pieces.length; i++) {
            let piece = this.pieces[i];
            if (!piece.position) continue;
            grid[piece.position.y][piece.position.x].piece = {
                'name': piece.name,
                'key': 'piece#' + i
            };
        }

        return grid;
    },
    turnCount: function() {
      return Math.ceil((this.moves.length + 1)/2)
    },
    cemeteries: function() {
        let defenders = [];
        let attackers = [];

        for (let i=0; i<this.pieces.length; i++) {
            let piece = this.pieces[i];
            if (piece.position) continue;

            (piece.name == 'attacker' ? attackers : defenders).push({
                'name': piece.name,
                'key': 'piece#' + i
            });
        }

        return {defenders, attackers};
    },
    isAttackersTurn: function() {
        return this.moves.length % 2 == 0;
    },
    availableMoves: function() {
        let pos = this.selected;
        if (!pos) return [];

        let moves = [
            this.freePath(pos, {'x': 0, 'y': pos.y}),
            this.freePath(pos, {'x': this.size - 1, 'y': pos.y}),
            this.freePath(pos, {'x': pos.x, 'y': 0}),
            this.freePath(pos, {'x': pos.x, 'y': this.size - 1})
        ].flat();

        if (this.pieceNameAt(pos) != 'king') {
            moves = moves.filter(p => !this.cellAt(p).restricted);
        }

        return moves;
    },
    hasWon: function() {
        let lastMove = this.moves[this.moves.length - 1];

        if (!lastMove) {
            return false;
        }

        // if king escaped
        if (lastMove.piece.name == 'king') {
            let cell = this.cellAt(lastMove.to);
            if (cell.restricted && !cell.throne) {
                return true;
            }
        }

        // if king is captured
        let adjacent = this.adjacentPositions(lastMove.to)
        for (let p of adjacent) {
            if (this.pieceNameAt(p) == 'king') {
                if (this.checkKingCapture(p)) {
                    return true;
                }
                break;
            }
        }

        // if defender ran out of time
        if (Math.floor(this.moves.length / 2) + 1 > this.players.defender.bid) {
            return true;
        }

        return false;
    },
    defenderWon: function() {
      return (Math.floor(this.moves.length / 2) + 1 <= this.players.defender.bid) && (this.moves.length % 2 === 0);
    }
  },
  methods: {
    handleClick: function(x,y) {
        let pos = {x,y};

        if (this.select(pos)) {
            return;
        }

        if (this.selected && this.move(this.selected, pos)) {
            this.deselect(this.selected);
            return;
        }
    },
    cellAt: function(pos) {
        return this.isValidPosition(pos) && this.grid[pos.y][pos.x];
    },
    pieceNameAt: function(pos) {
        let cell = this.cellAt(pos);
        return cell && cell.piece && cell.piece.name;
    },
    freePath: function(from, to) {
        let res = [];
        for (let p of path(from, to)) {
            if (this.cellAt(p).piece) {
                break;
            }
            res.push(p);
        }
        return res;
    },
    select: function(pos) {
        let cell = this.cellAt(pos);

        if (!cell.piece) {
            return;
        }

        if (this.hasWon) {
            return;
        }

        let isAttacker = (cell.piece && cell.piece.name) == 'attacker';
        if (isAttacker != this.isAttackersTurn) {
            let cellElement = this.$el.querySelector("[id='cell:" + pos.x + "," + pos.y + "']");
            cellElement.classList.add("flash-red");
            return;
        }

        if (this.selected) {
            //clear previous selection
            this.deselect(this.selected);
        }

        cell.selected = true;
        this.selected = pos;

        // Mark available
        for (let dest of this.availableMoves) {
            this.cellAt(dest).available = true;
        }

        return cell;
    },
    deselect: function(pos) {
        if (!pos) return;

        // Clear 'available' markers
        for (let row of this.grid) {
            for (let cell of row) {
                cell.available = undefined;
            }
        }

        let cell = this.cellAt(pos);

        cell.selected = false;
        this.selected = undefined;

        return cell;
    },
    clearFlashes: function(cellElement) {
      for (let c of cellElement.classList) {
         if (c.startsWith("flash-")) cellElement.classList.remove(c);
      }
    },
    move: function(from, to) {
        if (!this.isValidMove(from, to)) {
            return false;
        }

        // Actually move the piece
        let cellFrom = this.cellAt(from);
        let cellTo = this.cellAt(to);

        let piece = cellFrom.piece;
        cellTo.piece = piece;
        cellFrom.piece = undefined;

        // Find captured pieces
        let captured = this.getCapturedPieces(to);
        for (let capturedPosition of captured) {
            this.capture(capturedPosition);
        }

        this.moves.push({
            from, to, piece, captured
        });

        return true;
    },
    isValidMove: function(from, to) {
        // only move in lines, not diagonally
        if (from.x != to.x && from.y != to.y) {
            return false;
        }

        let cellTo = this.cellAt(to);
        let cellFrom = this.cellAt(from);

        // not allowed to go on top of another piece
        if (cellTo.piece) {
            return false;
        }

        // only the king is allowed on restricted spaces
        if (cellTo.restricted && (cellFrom.piece && cellFrom.piece.name) != 'king') {
            return false;
        }

        // cannot jump over pieces
        for (let p of path(from, to)) {
            if (this.cellAt(p).piece) {
                return false;
            }
        }

        return true;
    },
    adjacentPositions: function(position) {
        return [
            {'x': position.x - 1, 'y': position.y},
            {'x': position.x + 1, 'y': position.y},
            {'x': position.x, 'y': position.y - 1},
            {'x': position.x, 'y': position.y + 1}
        ].filter(p => this.isValidPosition(p));
    },
    isValidPosition: function(position) {
        return (position.x >= 0 && position.y >= 0 && position.x < this.size && position.y < this.size);
    },
    getCapturedPieces: function(aggressorPosition){
        let result = [];
        for (let adjacent of this.adjacentPositions(aggressorPosition)){
            let nextOneOver = {
                'x': aggressorPosition.x + 2 * clamp(-1, adjacent.x - aggressorPosition.x, 1),
                'y': aggressorPosition.y + 2 * clamp(-1, adjacent.y - aggressorPosition.y, 1)
            };
            if (this.isHostile(adjacent, aggressorPosition) && this.isHostile(adjacent, nextOneOver)) {
                result.push(adjacent);
            }
        }

        return result;
    },
    isHostile: function(targetPosition, otherPosition) {
        let target = this.pieceNameAt(targetPosition);
        let other = this.pieceNameAt(otherPosition);

        if (!target) {
            return false;
        }

        if (target == 'king') return false;
        if (other == 'king') other = 'defender';

        let otherCell = this.cellAt(otherPosition);
        if (!other && otherCell && otherCell.restricted) {
            other = 'hostile';
        }

        return other && target != other;
    },
    capture: function(position) {
        let cell = this.cellAt(position);
        let piece = cell.piece;

        let isAttacker = piece.name == 'attacker';
        let cemetery = this.cemeteries[isAttacker? 'attackers' : 'defenders'];
        cemetery.push(piece);
        cell.piece = undefined;
    },
    checkKingCapture: function(kingPosition) {
        let adjacentOfKing = this.adjacentPositions(kingPosition);

        // if king is at an edge
        if (adjacentOfKing.length < 4) {
            //if there are other defenders, the king cannot be captured at the edges
            for (let row of this.grid) {
                for (let cell of row) {
                    if (cell.piece && cell.piece.name == 'defender') {
                        return false;
                    }
                }
            }
        }

        if (adjacentOfKing.every(pp => this.pieceNameAt(pp) == 'attacker' || this.cellAt(pp).hostile)) {
            return true;
        }

        return false;
    },
    clearCell: function(x,y) {
        this.selected && this.deselect(this.selected);

        this.capture({x, y});
    },
    undoLastMove: function() {
        this.selected && this.deselect(this.selected);

        let lastMove = this.moves.pop();
        if (!lastMove) return;

        // move piece back
        this.cellAt(lastMove.to).piece = undefined;
        this.cellAt(lastMove.from).piece = lastMove.piece;

        // restore the captured pieces
        let wasAttacker = lastMove.piece.name == 'attacker';
        let cemetery = this.cemeteries[wasAttacker ? 'defenders' : 'attackers'];
        for (let position of (lastMove.captured || [])) {
            this.cellAt(position).piece = cemetery.pop();
        }

        return lastMove;
    }
  }
}
</script>

<style>

.game-area {
    display: grid;
    grid:
     "header header header" auto
     "cemetery-attackers board cemetery-defenders" auto
     / minmax(auto, 10em) auto minmax(auto, 10em);
}
.game-area > .header { grid-area: header; }
.game-area > .board { grid-area: board; }
.game-area > .cemetery-defenders { grid-area: cemetery-defenders; }
.game-area > .cemetery-attackers { grid-area: cemetery-attackers; }

.game-area .cemetery .title {
  width: 100%;
}

.game-area > .header {
    display: flex;
    justify-content: center;
}
.game-status:not(.won) .turn-counter,
.game-status.won .win-status {
    font-size: 2em;
}

.game-status .player-name {
  font-weight: bold;
}
.game-status .win-status .player-name {
  margin-left: 0.25em;
}
.game-status .turn-status .player-name {
  margin-left: 0.5em;
}
.game-status .turn-status .player-name:before {
  content: '('
}
.game-status .turn-status .player-name:after {
  content: ')'
}

.undo-turn {
    margin-right: -3em;
    width: 3em;
    height: 2em;
    position: relative;
    left: 1.5em;
    top: 0.5em;
}

table.board {
    margin-top: 1em;
    margin-left: auto;
    margin-right: auto;
    border: 1px solid gray;
    border-collapse: collapse;
}
table.board td {
    width: 4em;
    height: 4em;
    border: 1px dotted gray;
    background-color: white;
    transition: background-color 0.25s ease-in-out;
}
.cell.restricted {
    border: 3px dotted gray;
    background-color: lightgray;
}
.cell.throne {
    border-color: black;
}
.cell.selected {
    border: 1px solid green;
}
.cell.restricted.selected {
    border-width: 3px;
}
.cell.available {
    background-color: #d1e8d1;
}
.cell.flash-red {
    background-color: red;
}

.piece {
    font-size: 3em;
}

.cemetery {
    display: flex;
    flex-flow: row wrap;
    align-content: flex-start;
}
.cemetery .title {
    font-weight: bold;
    text-transform: lowercase;
    font-variant: small-caps;
}
</style>
