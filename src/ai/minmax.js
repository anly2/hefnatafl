
function playerPieces(grid, player) {

}

function validMoves(grid, player) {
    let moves = [];
    let pieces = playerPieces(grid, player);
    for (let p of pieces) {
        let pieceMoves = availableMoves(grid, p);
        for (let a of pieceMoves) {
            moves.push({from: p, to: a})
        }
    }
    //eval and sort moves

    return moves;
    // for (let m of moves) {
    //     yield m;
    // }
}

export default {
    next: function (grid, player) {
        let moves = validMoves(grid, player);

        let m = moves[Math.floor(Math.random() * moves.length)];
        return m;
    }
}