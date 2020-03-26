var express = require("express")
var app = express()
const cors = require("cors")
app.use(cors())
var http = require("http").createServer(app)
var io = require("socket.io")(http)
const cards = require("./cards")
const { initializeGame, shuffle } = require("./utilities")

const CARDS_IN_HAND = 10

let game = initializeGame(
    ["Base", "CAHe1", "CAHe2", "CAHe3", "CAHe4", "CAHe5", "CAHe6"],
    cards
)

app.use(express.static("public"))

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/public/index.html")
})

io.on("connection", function(socket) {
    for (let player of game.players) {
        socket.emit("new player", {
            name: player.name,
            id: player.id,
        })
    }

    socket.on("join game", function(name) {
        if (socket.playerId !== undefined) return

        const newId =
            game.players.reduce(
                (acc, curr) => (acc > curr.id ? acc : curr.id),
                -1
            ) + 1
        socket.playerId = newId
        let newPlayer = {
            socket,
            name: name,
            id: newId,
            score: 0,
            cards: [],
        }

        game.players.push(newPlayer)
        io.emit("new player", {
            name: newPlayer.name,
            id: newPlayer.id,
        })
    })

    socket.on("change name", function(name) {
        if (socket.playerId === undefined) return
        const player = game.players.filter(
            player => player.id === socket.playerId
        )[0]

        player.name = name
    })

    socket.on("start game", function() {
        if (socket.playerId === undefined) return

        if (game.started || game.players.length < 3) {
            return
        }
        game.started = true
        game.white = game.all_white
        game.black = game.all_black
        game = {
            ...game,
            currentRound: 0,
            blackPlayer: null,
            proposedWhiteCards: [],
            currentBlackCard: null,
        }

        for (let player of game.players) {
            let cards = []

            for (let i = 0; i < CARDS_IN_HAND; i++) {
                let idx = Math.floor(Math.random() * game.white.length)

                cards.push(game.white[idx])
                game.white.splice(idx, 1)
            }

            player.cards = cards
            player.socket.emit("new cards", cards)
        }

        game.blackPlayer = game.players[0].id
        game.players[0].socket.emit("player black")

        io.emit("game start")
        io.emit("another player black", game.players[0].name)

        let black_idx = Math.floor(Math.random() * game.black.length)
        game.currentBlackCard = game.black[black_idx]
        game.black.splice(black_idx, 1)

        io.emit("black card", game.currentBlackCard)
        io.emit(
            "scoreboard",
            game.players.map(player => ({
                name: player.name,
                score: player.score,
            }))
        )
    })

    socket.on("submit white card", function(card) {
        if (socket.playerId === undefined) return

        const player = game.players.filter(
            player => player.id === socket.playerId
        )[0]

        if (
            player.cards.indexOf(card) === -1 ||
            player.id === game.blackPlayer ||
            game.proposedWhiteCards.filter(card => card.player === player.id)
                .length !== 0
        ) {
            return
        }

        game.proposedWhiteCards.push({
            player: player.id,
            text: card,
            id: game.proposedWhiteCards.length,
        })
        player.cards.splice(player.cards.indexOf(card), 1)

        if (game.proposedWhiteCards.length >= game.players.length - 1) {
            io.emit(
                "proposed white cards",
                shuffle(game.proposedWhiteCards).map(card => ({
                    text: card.text,
                    id: card.id,
                }))
            )
        }
    })

    socket.on("choose white card", function(cardId) {
        if (socket.playerId === undefined) return

        const player = game.players.filter(
            player => player.id === socket.playerId
        )[0]
        let matchedCard = game.proposedWhiteCards.filter(
            card => card.id === cardId
        )

        if (matchedCard.length === 0 || player.id !== game.blackPlayer) {
            return
        }
        matchedCard = matchedCard[0]
        let winningPlayer = game.players.filter(
            player => player.id === matchedCard.player
        )[0]
        winningPlayer.score += 1

        io.emit("chosen white card", {
            text: matchedCard.text,
            player: {
                id: winningPlayer.id,
                name: winningPlayer.name,
            },
        })
        io.emit(
            "scoreboard",
            game.players.map(player => ({
                name: player.name,
                score: player.score,
            }))
        )
        game.proposedWhiteCards = []

        game.currentRound += 1
        if (game.currentRound === game.maxRounds) {
            game.started = false
            io.emit("game end")
            return
        }

        for (let player of game.players) {
            if (player.id !== game.blackPlayer) {
                let idx = Math.floor(Math.random() * game.white.length)

                player.cards.push(game.white[idx])
                player.socket.emit("new cards", player.cards)
                game.white.splice(idx, 1)
            }
        }

        player.socket.emit("player white")
        let newBlackPlayer =
            game.players[
                (game.players.indexOf(player) + 1) % game.players.length
            ]

        game.blackPlayer = newBlackPlayer.id
        newBlackPlayer.socket.emit("player black")
        io.emit("another player black", newBlackPlayer.name)

        let black_idx = Math.floor(Math.random() * game.black.length)
        game.currentBlackCard = game.black[black_idx]
        game.black.splice(black_idx, 1)

        io.emit("black card", game.currentBlackCard)
    })

    socket.on("disconnect", function() {
        if (socket.playerId === undefined) return

        const player = game.players.filter(
            player => player.id === socket.playerId
        )[0]
        io.emit("player disconnect", {
            name: player.name,
            id: player.id,
        })
        game.players = game.players.filter(
            player => player.id !== socket.playerId
        )
    })
})

http.listen(5000, function() {
    console.log("listening on *:5000")
})
