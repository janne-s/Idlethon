const sqlite3 = require('sqlite3').verbose();

// Connect to SQLite database (or create it if it doesn't exist)
const db = new sqlite3.Database('./db/game.db', (err) => {
	if (err) {
		console.error('Error opening database:', err.message);
	} else {
		console.log('Connected to SQLite database.');
	}
});

// Initialize the "players" table
db.serialize(() => {
	db.run(`
		CREATE TABLE IF NOT EXISTS players (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			playerId TEXT UNIQUE,
			orientation TEXT,
			startTime INTEGER,
			emoji TEXT,
			challengeLevel INTEGER
		)
	`);
});

const logDatabaseContents = () => {
	db.all(`SELECT * FROM players`, [], (err, rows) => {
		if (err) {
			console.error('Error retrieving database contents:', err.message);
		} else {
			console.log('Current database contents:', rows);
		}
	});
};

// Fetch all players from the database
const getAllPlayers = () => {
	return new Promise((resolve, reject) => {
		const query = `SELECT playerId, startTime, emoji, challengeLevel FROM players`;
		db.all(query, [], (err, rows) => {
			if (err) {
				reject(err);
			} else {
				resolve(rows);
			}
		});
	});
};

// Save player data
const savePlayer = (player) => {
	return new Promise((resolve, reject) => {
		const query = `INSERT INTO players (playerId, orientation, startTime, emoji, challengeLevel) VALUES (?, ?, ?, ?, ?)`;
		db.run(query, [player.playerId, JSON.stringify(player.orientation), player.startTime, player.emoji, player.challengeLevel], (err) => {
			if (err) {
				console.error('Error saving player:', err.message);
				reject(err);
			} else {
				console.log(`Player ${player.playerId} saved successfully.`);
				logDatabaseContents(); // Log database contents
				resolve();
			}
		});
	});
};

// Remove player data
const removePlayer = (playerId) => {
	return new Promise((resolve, reject) => {
		const query = `DELETE FROM players WHERE playerId = ?`;
		db.run(query, [playerId], (err) => {
			if (err) {
				console.error('Error removing player:', err.message);
				reject(err);
			} else {
				console.log(`Player ${playerId} removed successfully.`);
				logDatabaseContents(); // Log database contents
				resolve();
			}
		});
	});
};


module.exports = { savePlayer, removePlayer, getAllPlayers };