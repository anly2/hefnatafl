<template>
<!--TODO: implement bidding for start -->
<!--TODO: animate movements -->
<!--TODO: animate "kill" bloodshed -->
<!--TODO: animate "warning" for invalid actions -->
<div class="game-area">
    <div class="header">
        <button class="button-ai-suggest" @click="aiSuggest()">Suggest</button>
        <div class="game-status" :class="{won: hasWon}">
            <div class="turn-counter">
                Turn {{Math.ceil((moves.length + 1)/2)}}
            </div>
            <div class="turn-status">
                <span v-if="hasWon">{{moves.length % 2 === 0 ? '♔ Defender' : '♜ Attacker'}} won!</span>
                <span v-else>{{isAttackersTurn? '♜ Attacker' : '♔ Defender'}}'s turn</span>
            </div>
        </div>
        <button class="undo-turn" title="Undo last move" @click="undoLastMove()">⮐</button>
    </div>

    <div class="board" :style="{'--size': board.size}">
        <template v-for="(row, y) in board.rows">
            <div v-for="(cell, x) in row" :key="x + ','+  y"
                :id="'cell:' + x + ',' + y" class="cell"
                :class="{'restricted': cell.restricted, 'throne': cell.throne, 'selected': isSelected({x,y}), 'available': isAvailable({x,y})}"
                :style="{'grid-column-start': x+1, 'grid-row-start': y+1, 'grid-column-end': x+1, 'grid-row-end': y+1}"
                @click.exact="handleClick(x, y)" @click.ctrl="clearCell(x, y)"
            ></div>
        </template>
        <template>
            <div v-for="(piece, i) in board.pieces" v-if="piece.position" :key="'piece:' + i" :id="'piece:' + i"
                 :style="{'grid-column-start': piece.position.x+1, 'grid-row-start': piece.position.y+1, 'grid-column-end': piece.position.x+1, 'grid-row-end': piece.position.y+1}"
                 @click.exact="handleClick(piece.position.x, piece.position.y)"
                 @click.ctrl="clearCell(piece.position.x, piece.position.y)"
            >
                <piece :piece="piece"/>
            </div>
        </template>
    </div>

    <div class="cemetery cemetery-attackers">
        <div class="title">Captured attackers</div>

        <piece v-for="piece in capturedAttackers" :piece="piece"/>
    </div>
    <div class="cemetery cemetery-defenders">
        <div class="title">Captured defenders</div>

        <piece v-for="piece in capturedDefenders" :piece="piece"/>
    </div>
</div>
</template>

<script>
import Piece from './Piece.vue'
import ai from '../ai/minmax.js'
import Board, {posEq} from "@/components/Board";


export default {
  name: 'HnefataflBoard',
  components: {Piece},
  props: {
    board: {
        type: Board,
        default: function () {
            return new Board().withPieces();
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
    captured: function() {
        let captured = [];
        for (let i=0; i<this.board.pieces.length; i++) {
            let piece = this.board.pieces[i];
            if (piece.position) continue;
            captured.push(piece);
        }
        return captured;
    },
    capturedDefenders: function() {
        return this.captured.filter(piece => piece.name !== 'attacker');
    },
    capturedAttackers: function() {
        return this.captured.filter(piece => piece.name === 'attacker');
    },
    isAttackersTurn: function() {
        return this.moves.length % 2 === 0;
    },
    availableMoves: function() {
        return this.board.availableMoves(this.selected);
    },
    hasWon: function() {
        let lastMove = this.moves[this.moves.length - 1];

        if (!lastMove) {
            return false;
        }

        // if king escaped
        if (lastMove.piece.name === 'king') {
            let cell = this.board.cellAt(lastMove.to);
            if (cell.restricted && !cell.throne) {
                return true;
            }
        }

        // if king is captured
        let adjacent = this.board.adjacentPositions(lastMove.to)
        for (let p of adjacent) {
            if (this.board.pieceNameAt(p) === 'king') {
                if (this.checkKingCapture(p)) {
                    return true;
                }
                break;
            }
        }

        return false;
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
        }
    },
    select: function(pos) {
        let piece = this.board.pieceAt(pos);

        if (!piece) {
            return;
        }

        if (this.hasWon) {
            return;
        }

        let isAttacker = (piece.name === 'attacker');
        if (isAttacker !== this.isAttackersTurn) {
            return;
        }

        if (this.selected) {
            //clear previous selection
            this.deselect(this.selected);
        }

        this.selected = pos;

        return piece;
    },
    deselect: function(pos) {
        if (!pos) return;

        let prev = this.selected;
        this.selected = undefined;

        return prev;
    },
    isSelected: function(pos) {
        return this.selected && posEq(this.selected, pos);
    },
    isAvailable: function(pos) {
        return !!this.availableMoves.find(p => posEq(pos, p));
    },
    move: function(from, to) {
        let result = this.board.move(from, to);
        if (!result) {
            return false;
        }
        this.moves.push(result);
        return true;
    },
    checkKingCapture: function(kingPosition) {
        let adjacentOfKing = this.board.adjacentPositions(kingPosition);

        // if king is at an edge
        if (adjacentOfKing.length < 4) {
            //if there are other defenders, the king cannot be captured at the edges
            if (this.board.pieces.some(p => p.name === 'defender' && p.position)) {
                return false;
            }
        }

        return !!adjacentOfKing.every(pp =>
            this.board.pieceNameAt(pp) === 'attacker' || this.board.cellAt(pp).hostile);
    },
    clearCell: function(x,y) {
        this.selected && this.deselect(this.selected);

        this.board.capture({x, y});
    },
    undoLastMove: function() {
        this.selected && this.deselect(this.selected);

        let lastMove = this.moves.pop();
        if (!lastMove) return;

        // move piece back
        this.board.pieceAt(lastMove.to).position = lastMove.from;

        // restore the captured pieces
        let wasAttacker = lastMove.piece.name === 'attacker';
        let capturedPieces = []; //find N dead pieces, as many as lastMove.captured
        for (let p of this.board.pieces) {
            //dead and 'not same as captor'
            if (!p.position && (wasAttacker !== (p.name === 'attacker'))) {
                capturedPieces.push(p);
            }
            if (lastMove.captured.length === capturedPieces.length) break;
        }
        for (let i = 0; i < capturedPieces.length; i++) {
            capturedPieces[i].position = lastMove.captured[i];
        }

        return lastMove;
    },
    aiSuggest: function() {
        let {from, to} = ai.next(this.grid, this.moves.length % 2);
        this.cellAt(from).selected = true;
        this.cellAt(to).available = true;
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

.game-area > .header .button-ai-suggest {
    position: absolute;
    left: 1em;
    padding: 0.25em 0.5em;
}

.game-area > .header {
    display: flex;
    justify-content: center;
}
.game-status:not(.won) .turn-counter,
.game-status.won .turn-status {
    font-size: 2em;
}

.undo-turn {
    margin-right: -3em;
    width: 3em;
    height: 2em;
    position: relative;
    left: 1.5em;
    top: 0.5em;
}

.board {
    margin-top: 1em;
    margin-left: auto;
    margin-right: auto;
    border: 1px solid gray;
}
.board .cell {
    width: 4em;
    height: 4em;
    background-color: white;
}

table.board {
    border: 1px dotted gray;
    border-collapse: collapse;
}
table.board td {
}

.board:not(table) {
    display: grid;
    /*noinspection CssUnresolvedCustomProperty*/
    grid-template-columns: repeat(var(--size), 1fr);
    grid-gap: 1px;
    background-color: #e5e5e5;
}


.cell.available {
    background-color: #d1e8d1;
}
.cell.restricted {
    background-color: lightgray;
}

/* Table cell styling  */

table.board .cell.restricted {
    border: 3px dotted gray;
}
table.board .cell.throne {
    border-color: black;
}
table.board .cell.selected {
    border: 1px solid green;
}
table.board .cell.restricted.selected {
    border-width: 3px;
}


/* Grid cell styling */

.board:not(table) .cell.restricted {
    border: 1px dashed black;
    margin: -1px;
}
.board:not(table) .cell.throne {
    border: 1px solid black;
    margin: -1px;
}
.board:not(table) .cell.selected {
    box-shadow: inset 2px 2px 4px 0 green, inset -2px -2px 4px 0 green;
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
