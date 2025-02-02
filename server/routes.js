const express = require('express');
const { body, validationResult } = require('express-validator'); // Import express-validator
const router = express.Router();
const db = require('../db/db');

// Fetch all players
router.get('/players', async (req, res) => {
  try {
	const players = await db.getAllPlayers();
	res.status(200).json(players);
  } catch (error) {
	console.error('Error fetching players:', error);
	res.status(500).json({ message: 'Error fetching players' });
  }
});

// Start game: Store player data
router.post(
  '/start',
  [
	// Validate and sanitize input
	body('playerId').trim().isAlphanumeric().withMessage('playerId must be alphanumeric'),
	body('orientation').isObject().withMessage('orientation must be an object'),
	body('startTime').isNumeric().withMessage('startTime must be a number'),
	body('emoji').trim().isString().withMessage('emoji must be a string'),
	body('challengeLevel').isInt({ min: 1 }).withMessage('challengeLevel must be a positive integer'),
  ],
  async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
	  return res.status(400).json({ errors: errors.array() });
	}

	const { playerId, orientation, startTime, emoji, challengeLevel } = req.body;

	try {
	  await db.savePlayer({ playerId, orientation, startTime, emoji, challengeLevel });
	  res.status(200).json({ message: `Game started for player ${playerId}` });
	} catch (error) {
	  console.error('Error starting game:', error.message);
	  res.status(500).json({ message: 'Error starting game' });
	}
  }
);

// End game: Remove player data
router.post(
  '/end',
  [
	// Validate and sanitize input
	body('playerId').trim().isAlphanumeric().withMessage('playerId must be alphanumeric'),
  ],
  async (req, res) => {
	// Check for validation errors
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
	  return res.status(400).json({ errors: errors.array() });
	}

	const { playerId } = req.body;

	try {
	  await db.removePlayer(playerId);
	  res.status(200).json({ message: `Game ended for player ${playerId}` });
	} catch (error) {
	  console.error('Error ending game:', error.message);
	  res.status(500).json({ message: 'Error ending game' });
	}
  }
);

module.exports = router;