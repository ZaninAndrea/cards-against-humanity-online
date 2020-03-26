import React from "react"
import "./App.css"

let socket = window.io()

const sortByScore = (a, b) =>
    a.score > b.score ? -1 : a.score < b.score ? 1 : 0

function Scoreboard({ scoreboard, lastPlayer }) {
    return (
        <div className="scoreboard">
            <div className="title">Scoreboard</div>
            {scoreboard.sort(sortByScore).map(player => (
                <div className={player.name === lastPlayer ? "lastPlayer" : ""}>
                    {player.score} - {player.name}
                </div>
            ))}
        </div>
    )
}

class App extends React.Component {
    constructor(props) {
        console.log(socket)
        super(props)

        this.state = {
            players: [], // TODO: fetch from the server
            cards: [],
            blackCard: null,
            playerType: "WHITE",
            gameState: "LOBBY", // TODO: fetch from the server
            selectedWhiteCard: null,
            proposedWhiteCards: [],
            lockedCard: false,
            blackPlayer: "",
            scoreboard: [],
            joinedGame: false,
            playerName: null,
            lastPlayer: null,
        }

        socket.on("new player", player => {
            this.setState(({ players }) => ({
                players: [...players, player],
            }))
        })
        socket.on("game start", () => {
            this.setState({ gameState: "PLAYING" })
        })
        socket.on("new cards", cards => {
            this.setState({ cards })
        })
        socket.on("player black", () => {
            this.setState({ playerType: "BLACK" })
        })
        socket.on("player white", () => {
            this.setState({ playerType: "WHITE" })
        })
        socket.on("black card", card => {
            this.setState({ blackCard: card })
        })
        socket.on("player disconnect", ({ name, id }) => {
            this.setState(({ players }) => ({
                players: players.filter(player => player.id !== id),
            }))
        })
        socket.on("proposed white cards", cards => {
            this.setState({ proposedWhiteCards: cards })
        })
        socket.on("scoreboard", scoreboard => {
            this.setState({ scoreboard })
        })
        socket.on("game end", () => {
            this.setState({
                cards: [],
                blackCard: null,
                playerType: "WHITE",
                gameState: "LOBBY",
                selectedWhiteCard: null,
                proposedWhiteCards: [],
                lockedCard: false,
                blackPlayer: "",
            })
        })
        socket.on("another player black", name => {
            this.setState({ blackPlayer: name })
        })
        socket.on("chosen white card", ({ text, player: { id, name } }) => {
            this.setState({
                selectedWhiteCard: null,
                proposedWhiteCards: [],
                lockedCard: false,
                lastPlayer: name,
            })
        })
    }

    render() {
        if (this.state.gameState === "LOBBY" || !this.state.joinedGame) {
            return (
                <div className="main lobby">
                    {this.state.scoreboard.length !== 0 ? (
                        <Scoreboard
                            scoreboard={this.state.scoreboard}
                            lastPlayer={this.state.lastPlayer}
                        />
                    ) : (
                        ""
                    )}
                    <div className="header">Cards Against Humanity</div>
                    <div id="lobbyPlayerList">
                        <div className="title">Connected players</div>
                        {this.state.players.map(player => (
                            <div className="player">{player.name}</div>
                        ))}

                        {this.state.joinedGame ? (
                            <button
                                onClick={() => {
                                    socket.emit("start game")
                                }}
                                id="start-game"
                                disabled={this.state.players.length < 3}
                            >
                                START GAME
                            </button>
                        ) : (
                            <div>
                                <input
                                    placeholder="username"
                                    value={this.state.playerName}
                                    onChange={e =>
                                        this.setState({
                                            playerName: e.target.value,
                                        })
                                    }
                                />{" "}
                                <button
                                    onClick={() => {
                                        this.setState({
                                            joinedGame: true,
                                        })
                                        socket.emit(
                                            "join game",
                                            this.state.playerName
                                        )
                                    }}
                                    disabled={!this.state.playerName}
                                >
                                    JOIN GAME
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )
        } else if (this.state.gameState === "PLAYING") {
            if (this.state.playerType === "WHITE") {
                return (
                    <div className="main">
                        <Scoreboard
                            scoreboard={this.state.scoreboard}
                            lastPlayer={this.state.lastPlayer}
                        />
                        <div
                            className="blackCard"
                            dangerouslySetInnerHTML={{
                                __html: this.state.blackCard
                                    ? this.state.selectedWhiteCard
                                        ? this.state.blackCard.text.replace(
                                              "_",
                                              this.state.selectedWhiteCard
                                          )
                                        : this.state.blackCard.text
                                    : "",
                            }}
                        ></div>

                        <div className="tip">
                            {this.state.lockedCard
                                ? "Wait for others to choose"
                                : "Choose the funniest card for " +
                                  this.state.blackPlayer}
                        </div>
                        <div className="whiteCards">
                            {this.state.cards.map(card => (
                                <div
                                    className={
                                        this.state.selectedWhiteCard === card
                                            ? "whiteCard selected"
                                            : "whiteCard"
                                    }
                                    onClick={() => {
                                        if (!this.state.lockedCard) {
                                            this.setState({
                                                lockedCard: true,
                                                selectedWhiteCard: card,
                                            })
                                            socket.emit(
                                                "submit white card",
                                                card
                                            )
                                        }
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: card,
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                )
            } else {
                return (
                    <div className="main">
                        <Scoreboard
                            scoreboard={this.state.scoreboard}
                            lastPlayer={this.state.lastPlayer}
                        />
                        <div
                            className="blackCard"
                            dangerouslySetInnerHTML={{
                                __html: this.state.blackCard
                                    ? this.state.blackCard.text
                                    : "",
                            }}
                        ></div>
                        <div className="tip">
                            {this.state.proposedWhiteCards.length === 0
                                ? "Wait for the other players to choose a card"
                                : "Choose the funniest card"}
                        </div>
                        <div className="whiteCards">
                            {this.state.proposedWhiteCards.map(card => (
                                <div
                                    onClick={() =>
                                        socket.emit(
                                            "choose white card",
                                            card.id
                                        )
                                    }
                                    className="whiteCard"
                                    dangerouslySetInnerHTML={{
                                        __html: card.text,
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                )
            }
        }

        return <div>Something went wrong, ups</div>
    }
}

export default App
