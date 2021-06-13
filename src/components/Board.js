
function initGrid(size) {
    let grid = [];
    for (let y=0; y<size; y++) {
        let row = [];
        for (let x=0; x<size; x++) {
            let cell = {pos: {x, y}};

            cell.restricted = (x === 0 || x === size-1) && (y === 0 || y === size-1);
            if (x === Math.floor(size/2) && y === Math.floor(size/2)) {
                cell.restricted = true;
                cell.throne = true;
            }

            row.push(cell);
        }
        grid.push(row);
    }
    return grid;
}

class PlainBoard {
    constructor(size = 11) {
        this.size = size;
    }

    get size() {
        return this._size;
    }

    set size(size) {
        this._size = size;
        this.grid = initGrid(size)
    }

    get rows() {
        return this.grid;
    }

    cellAt(pos) {
        return this.isValidPosition(pos) && this.grid[pos.y][pos.x];
    }

    isValidPosition(pos) {
        let p = position(pos);
        return p && (p.x >= 0 && p.y >= 0 && p.x < this.size && p.y < this.size);
    }

    adjacentPositions(pos) {
        return [
            {'x': pos.x - 1, 'y': pos.y},
            {'x': pos.x + 1, 'y': pos.y},
            {'x': pos.x, 'y': pos.y - 1},
            {'x': pos.x, 'y': pos.y + 1}
        ].filter(p => this.isValidPosition(p));
    }
}



function xFrom(letter) {
    return letter.toLowerCase().charCodeAt(0) - 97; //charCode('a') == 97
}
function yFrom(number) {
    return parseInt(number, 10) - 1;
}
function position(address, stride) {
    if (!address) return null;
    if (typeof address == "string") {
        return {x: xFrom(address.charAt(0)), y: yFrom(address.substring(1))};
    }
    if (typeof address == "number" && stride) {
        return {x: address % stride, y: Math.floor(address / stride)};
    }
    if ('x' in address && 'y' in address) {
        return address;
    }
    if ('position' in address) return address.position;
    if ('pos' in address) return address.pos;
    throw new Error("Cannot parse as position: " + address);
}

function defaultPositionsKing() {
    return "f6";
}
function defaultPositionsDefenders() {
    return ['d6', 'e5', 'e6', 'e7', 'f4', 'f5', 'f7', 'f8', 'g5', 'g6', 'g7', 'h6'];
}
function defaultPositionsAttackers() {
    return [
        'a4', 'a5', 'a6', 'a7', 'a8', 'b6',
        'd1', 'e1', 'f1', 'g1', 'h1', 'f2',
        'k4', 'k5', 'k6', 'k7', 'k8', 'j6',
        'd11', 'e11', 'f11', 'g11', 'h11', 'f10'
    ];
}
function pieceFrom(address, name, stride) {
    return {position: position(address, stride), name};
}
export function posEq(a, b) {
    return a && b && (a.x === b.x && a.y === b.y);
}

function addNonNull(arr, item) {
    item && arr.push(item);
    return arr;
}


export function path(from, to) {
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
export function clamp(min, value, max) {
    return Math.max(min, Math.min(value, max));
}


class PiecesAwarePlainBoard extends PlainBoard {
    constructor(size) {
        super(size);
        this._pieces = []; //[{position, name}...]
    }

    withPieces(
        king = defaultPositionsKing(this.size),
        defenders = defaultPositionsDefenders(this.size),
        attackers = defaultPositionsAttackers(this.size)
    ) {
        let pieces = [];
        addNonNull(pieces, pieceFrom(king, 'king', this.size));
        for (let defender of defenders) {
            addNonNull(pieces, pieceFrom(defender, 'defender', this.size));
        }
        for (let attacker of attackers) {
            addNonNull(pieces, pieceFrom(attacker, 'attacker', this.size));
        }
        this._pieces = pieces;
        return this;
    }

    get pieces() {
        return this._pieces;
    }

    pieceAt(pos) {
        return this.pieces.find(p => posEq(pos, position(p)));
    }
    pieceNameAt(pos) {
        let piece = this.pieceAt(pos);
        return piece && piece.name;
    }

    freePath(from, to) {
        let res = [];
        for (let p of path(from, to)) {
            if (this.pieceAt(p)) {
                break;
            }
            res.push(p);
        }
        return res;
    }
    availableMoves(pos) {
        if (!pos) return [];

        let moves = [
            this.freePath(pos, {'x': 0, 'y': pos.y}),
            this.freePath(pos, {'x': this.size - 1, 'y': pos.y}),
            this.freePath(pos, {'x': pos.x, 'y': 0}),
            this.freePath(pos, {'x': pos.x, 'y': this.size - 1})
        ].flat();

        if (this.pieceNameAt(pos) !== 'king') {
            moves = moves.filter(p => !this.cellAt(p).restricted);
        }

        return moves;
    }

    isValidMove(from, to) {
        // only move in lines, not diagonally
        if (from.x !== to.x && from.y !== to.y) {
            return false;
        }

        // not allowed to go on top of another piece
        if (this.pieceAt(to)) {
            return false;
        }

        // only the king is allowed on restricted spaces
        if (this.cellAt(to).restricted && (this.pieceNameAt(from)) !== 'king') {
            return false;
        }

        // cannot jump over pieces
        for (let p of path(from, to)) {
            if (this.pieceAt(p)) {
                return false;
            }
        }

        return true;
    }

    move(from, to) {
        if (!this.isValidMove(from, to)) {
            return undefined;
        }

        // Actually move the piece
        let piece = this.pieceAt(from);
        piece.position = to;

        // Find captured pieces
        let captured = this.getCapturedPositions(to);

        // Mark pieces as captured
        for (let p of captured) {
            this.pieceAt(p).position = null;
        }

        return {from, to, piece: piece, captured};
    }

    capture(pos) {
        let piece = this.pieceAt(pos);
        if (piece) piece.position = null;
    }

    getCapturedPositions(aggressorPosition){
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
    }

    isHostile(targetPosition, otherPosition) {
        let target = this.pieceNameAt(targetPosition);
        let other = this.pieceNameAt(otherPosition);

        if (!target) {
            return false;
        }

        if (target === 'king') return false;
        if (other === 'king') other = 'defender';

        let otherCell = this.cellAt(otherPosition);
        if (!other && otherCell && otherCell.restricted) {
            other = 'hostile';
        }

        return other && target !== other;
    }
}

class Board extends PiecesAwarePlainBoard {
}

export default Board;