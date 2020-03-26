function initializeGame(collections, cards) {
    let white = []
    let black = []

    for (let collection of collections) {
        white.push(...cards[collection].white)
        black.push(...cards[collection].black)
    }

    white = [...new Set(white)]
    black = [...new Set(black)]

    white = cards.whiteCards.filter((text, i) => white.indexOf(i) !== -1)
    black = cards.blackCards.filter(
        (card, i) => black.indexOf(i) !== -1 && card.pick === 1
    )

    return {
        collections,
        all_white: white,
        all_black: black,
        white,
        black,
        players: [],
        maxRounds: 20,
        currentRound: 0,
        started: false,
        blackPlayer: null,
        proposedWhiteCards: [],
        currentBlackCard: null,
    }
}

function shuffle(arr) {
    let a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

module.exports = {
    initializeGame,
    shuffle,
}
