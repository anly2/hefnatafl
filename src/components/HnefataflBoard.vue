<template>
<!--TODO: cemetery -->
<!--TODO: undo turn -->
<!--TODO: implement killing (automaticaly) -->
<!--TODO: victory check -->
<!--TODO: implement bidding for start -->
<!--TODO: animate movements -->
<!--TODO: animate "warning" for invalid actions -->
<div class="game-area">
    <div class="header">
        <div class="turn-counter">Turn {{Math.ceil((moves.length + 1)/2)}}</div>
        <div class="current-turn">
            {{isAttackersTurn? '♜ Attacker' : '♔ Defender'}}'s turn
        </div>
    </div>

    <table class="board">
        <tr class="row" :id="'row:' + y" v-for="(row, y) in grid" :key="y">
            <td class="cell" :id="'cell:' + x" v-for="(cell, x) in row" :key="x"
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
        return this.grid[pos.y][pos.x];
    },
    pieceNameAt: function(pos) {
        let piece = this.cellAt(pos).piece;
        return piece && piece.name;
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

        let isAttacker = (cell.piece && cell.piece.name) == 'attacker';
        if (isAttacker != this.isAttackersTurn) {
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
    move: function(from, to) {
        if (!this.isValidMove(from, to)) {
            return false;
        }

        let cellFrom = this.cellAt(from);
        let cellTo = this.cellAt(to);

        let piece = cellFrom.piece;
        cellTo.piece = piece;
        cellFrom.piece = undefined;

        this.moves.push({
            from, to, piece
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
    clearCell: function(x,y) {
        let cell = this.cellAt({x,y});
        let piece = cell.piece;
        if (!piece) return;

        let isAttacker = piece.name == 'attacker';
        let cemetery = this.cemeteries[isAttacker? 'attackers' : 'defenders'];
        cemetery.push(piece);
        cell.piece = undefined;
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


.turn-counter {
    font-size: 2em;
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

.piece {
    font-size: 3em;
}

.cemetery {
    display: flex;
    flex-flow: row wrap;
    align-content: start;
}
.cemetery .title {
    font-weight: bold;
    text-transform: lowercase;
    font-variant: small-caps;
}
</style>
