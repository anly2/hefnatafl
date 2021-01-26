<template>
<div>
    <div class="turn-counter">Turn {{Math.ceil((moves.length + 1)/2)}}</div>
    <div class="current-turn">
        {{isAttackersTurn? '♜ Attacker' : '♔ Defender'}}'s turn
    </div>
    <table class="board">
        <tr class="row" :id="'row:' + y" v-for="(row, y) in grid" :key="y">
            <td class="cell" :id="'cell:' + x" v-for="(cell, x) in row" :key="x"
                :class="{'restricted': cell.restricted, 'throne': cell.throne, 'selected': cell.selected, 'available': cell.available}"
                @click.exact="handleClick(x, y)" @click.ctrl="clearCell(x, y)"
            >
                <span class="piece piece-king" v-if="cell.piece == 'king'">♔</span>
                <span class="piece piece-defender" v-if="cell.piece == 'defender'">♖</span>
                <span class="piece piece-attacker" v-if="cell.piece == 'attacker'">♜</span>
            </td>
        </tr>
    </table>
</div>
</template>

<script>
import Vue from 'vue';

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
        for (let piece of this.pieces) {
            grid[piece.position.y][piece.position.x].piece = piece.name;
        }

        return grid;
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

        if (this.cellAt(pos).piece != 'king') {
            moves = moves.filter(p => !this.cellAt(p).restricted);
        }

        return moves;
    }
  },
  methods: {
    handleClick: function(x,y) {
        let pos = {x,y};
        let cell = this.cellAt(pos);

        if (this.selected && this.move(this.selected, pos)) {
            this.deselect(this.selected);
            return;
        }

        if (cell.piece) {
            let isAttacker = cell.piece == 'attacker';
            if (isAttacker == this.isAttackersTurn) {
                this.select(pos);
            }
        }
    },
    cellAt: function(pos) {
        return this.grid[pos.y][pos.x];
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
        if (this.selected) {
            //clear previous selection
            this.deselect(this.selected);
        }

        let cell = this.cellAt(pos);
        cell.selected = true;
        this.selected = pos;

        // Mark available
        for (let dest of this.availableMoves) {
            this.cellAt(dest).available = true;
        }

        return cell;
    },
    deselect: function(pos) {
        // Clear available markers
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
        if (cellTo.restricted && cellFrom.piece != 'king') {
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
        this.cellAt({x,y}).piece = undefined;
    }
  }
}
</script>

<style>
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
</style>
