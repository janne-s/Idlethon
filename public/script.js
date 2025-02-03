let startTime = null;
let interval = null;
let isStable = true;
let gameStarted = false; // New flag to track if the game has started
let gameOver = false; // New flag to prevent multiple endGame calls
let selectedChallengeLevel = null; // Track selected challenge level

const THRESHOLD = 0.1; // Acceleration threshold (m/s²)
const ORIENTATION_THRESHOLD = 5; // Degrees of change in orientation
const GRACE_PERIOD = 250; // Grace period in milliseconds
let lastUnstableTime = null;

let motionMagnitude = 0; // Track current motion magnitude
let orientationDelta = { alpha: 0, beta: 0, gamma: 0 }; // Track orientation changes
let originalOrientation = { alpha: null, beta: null, gamma: null }; // Store original orientation

const timerElement = document.getElementById('timer');
const startButton = document.getElementById('startButton');
const challengeLevelContainer = document.getElementById('challenge-level-container');

let currentPlayerId = null; // Variable to store the current player's ID
const API_URL = 'https://192.168.1.11:3000/api'; // URL to your backend API

let isDesktop = false; // Track whether the device is a desktop

// Detect if the device supports touch
if (navigator.maxTouchPoints === 0) {
	isDesktop = true; // No touch points = desktop device
}

// Show challenge level selection when start button is clicked
startButton.addEventListener('click', () => {
	startButton.style.display = 'none';
	challengeLevelContainer.style.display = 'flex';
});

// Add event listeners for challenge level buttons
document.querySelectorAll('#challenge-level-container button').forEach(button => {
	button.addEventListener('click', () => {
		selectedChallengeLevel = parseInt(button.dataset.level);
		challengeLevelContainer.style.display = 'none';
		currentPlayerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		if (!isDesktop) {
			requestMotionPermission();
		} else {
			initializeGame();
		}
	});
});


// Request motion sensor permission (for iOS)
function requestMotionPermission() {
	if (DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === "function") {
		DeviceMotionEvent.requestPermission()
			.then((response) => {
				if (response === "granted") {
					initializeGame();
				} else {
					console.log("Motion permissions denied.");
					alert("Motion permissions are required to play the game.");
					startButton.style.display = 'block'; // Show the button again if permission denied
				}
			})
			.catch((error) => {
				console.error("Error requesting motion permissions:", error);
				alert("Motion permissions are required to play the game.");
				startButton.style.display = 'block'; // Show the button again if permission denied
			});
	} else {
		initializeGame(); // For non-iOS devices or unsupported browsers
	}
}

function initializeGame() {
	gameOver = false;
	gameStarted = true; // Mark the game as started
	startTime = Date.now(); // Record the Unix time when the game starts
	isStable = true;
	lastUnstableTime = null;
	document.body.style.backgroundColor = 'green';
	console.log("Game started with challenge level:", selectedChallengeLevel);
	
	// Ensure playerId is alphanumeric
	  currentPlayerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`.replace(/[^a-zA-Z0-9]/g, '');
	
	  // Ensure challengeLevel is a positive integer
	  if (!Number.isInteger(selectedChallengeLevel) || selectedChallengeLevel < 1) {
		console.error('Invalid challenge level');
		return;
	  }

	const emojis = ['💖', '🌸', '😊', '🌻', '🐶', '🐱', '💫', '✨', '💐', '🦄',
		'🍓', '🍩', '🍪', '🍉', '🌈', '🎉', '🎁', '💌', '💖', '🥰',
		'😍', '😘', '💋', '🌹', '💃', '🕺', '💜', '💙', '💛', '🤗',
		'🤩', '🥳'
	];
	const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

	// Save player to the database
	const playerData = {
		playerId: currentPlayerId,
		orientation: originalOrientation,
		startTime: startTime,
		emoji: randomEmoji,
		challengeLevel: selectedChallengeLevel
	};

	fetch(`${API_URL}/start`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(playerData),
		})
		.then(response => response.json())
		.then(data => {
			console.log('Player save response:', data);
		})
		.catch(error => {
			console.error('Error saving player:', error);
		});

	if (interval) clearInterval(interval);
	interval = setInterval(() => {
		if (isStable) {
			const elapsedTime = Date.now() - startTime; // Calculate elapsed time in milliseconds

			// Convert elapsed time to hours, minutes, and seconds
			const hours = Math.floor(elapsedTime / 3600000); // 1 hour = 3600000 ms
			const minutes = Math.floor((elapsedTime % 3600000) / 60000); // 1 minute = 60000 ms
			const seconds = Math.floor((elapsedTime % 60000) / 1000); // 1 second = 1000 ms

			// Format the time as hh:mm:ss or h:mm:ss if hours are 0
			const formattedTime = `${hours > 0 ? hours + ':' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
			timerElement.textContent = formattedTime;
		}
	}, 100); // Update every 100 ms

	addEventListeners();

}

let lastMousePosition = { x: null, y: null };
const MOUSE_THRESHOLD = 10; // Threshold for mouse movement in pixels

function handleMouseMove(event) {
	const currentMousePosition = { x: event.clientX, y: event.clientY };

	if (lastMousePosition.x !== null && lastMousePosition.y !== null) {
		// Calculate the distance the mouse has moved
		const dx = currentMousePosition.x - lastMousePosition.x;
		const dy = currentMousePosition.y - lastMousePosition.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > MOUSE_THRESHOLD) {
			// Mouse movement exceeds threshold, disqualify player
			isStable = false;
			document.body.style.backgroundColor = 'red';
			const reason = 'the mouse was moved';
			console.log("Game ended due to mouse movement");
			endGame(reason);
		}
	}

	// Update the last mouse position
	lastMousePosition = currentMousePosition;
}

function handleKeyDown(event) {
	// Key press disqualifies the player
	isStable = false;
	document.body.style.backgroundColor = 'red';
	const reason = 'a key was pressed';
	console.log("Game ended due to key press");
	endGame(reason);
}

function handleClick(event) {
	// Mouse click disqualifies the player
	if (gameStarted) {
		isStable = false;
		document.body.style.backgroundColor = 'red';
		const reason = 'a mouse button was clicked';
		console.log("Game ended due to mouse click");
		endGame(reason);
	}
}

function handleTouchInteraction(event) {
	if (gameOver || !gameStarted) return; // Prevent interaction if the game is over or hasn't started

	isStable = false;
	document.body.style.backgroundColor = 'red';
	const reason = 'the screen was touched';
	console.log("Game ended due to touch interaction");
	endGame(reason);
}


function handleOrientation(event) {
	const { alpha, beta, gamma } = event;

	if (originalOrientation.alpha === null) {
		// Capture the original orientation at the start of the game
		originalOrientation = { alpha, beta, gamma };
		console.log("Original orientation saved: ", originalOrientation);
	}

	// Normalize both angles to 0-360 range first
	const normalizedAlpha = ((alpha % 360) + 360) % 360;
	const normalizedOriginalAlpha = ((originalOrientation.alpha % 360) + 360) % 360;
	
	// Calculate the shortest distance between the angles
	let alphaDiff = Math.min(
		Math.abs(normalizedAlpha - normalizedOriginalAlpha),                    // Direct difference
		Math.abs(normalizedAlpha - (normalizedOriginalAlpha + 360)),           // Difference when adding 360 to original
		Math.abs(normalizedAlpha - (normalizedOriginalAlpha - 360)),           // Difference when subtracting 360 from original
		Math.abs((normalizedAlpha + 360) - normalizedOriginalAlpha),           // Difference when adding 360 to current
		Math.abs((normalizedAlpha - 360) - normalizedOriginalAlpha)            // Difference when subtracting 360 from current
	);
	
	orientationDelta.alpha = alphaDiff;

	// Regular difference calculation for beta and gamma
	orientationDelta.beta = Math.abs(beta - originalOrientation.beta);
	orientationDelta.gamma = Math.abs(gamma - originalOrientation.gamma);

	checkStability(); // Check stability after updating orientation
}
function handleMotion(event) {
	const acc = event.acceleration;

	// Calculate total acceleration magnitude
	motionMagnitude = Math.sqrt(
		acc.x * acc.x +
		acc.y * acc.y +
		acc.z * acc.z
	);

	checkStability(); // Check stability after updating motion
}

function checkStability() {
	if (gameOver) return; // Prevent stability checks if the game is already over

	const orientationUnstable =
		orientationDelta.alpha > ORIENTATION_THRESHOLD ||
		orientationDelta.beta > ORIENTATION_THRESHOLD ||
		orientationDelta.gamma > ORIENTATION_THRESHOLD;

	const motionUnstable = motionMagnitude > THRESHOLD;

	if (motionUnstable || orientationUnstable) {
		if (!lastUnstableTime) lastUnstableTime = Date.now();
		const timeSinceUnstable = Date.now() - lastUnstableTime;

		if (timeSinceUnstable > GRACE_PERIOD) {
			isStable = false;
			const reason = motionUnstable ? 'too much movement' : 'a significant tilt';
			if (motionUnstable) {
				console.log("Game ended due to motion instability");
			}
			if (orientationUnstable) {
				console.log("Game ended due to orientation instability");
			}
			document.body.style.backgroundColor = 'red';
			endGame(reason);
		} else {
			document.body.style.backgroundColor = 'yellow';
		}
	} else {
		lastUnstableTime = null;
		isStable = true;
		document.body.style.backgroundColor = 'green';
	}
}

// Function to display a pop-up message
function showPopupMessage(title, message, onCloseCallback) {
	const popup = document.createElement('div');
	popup.className = 'popup';
	popup.innerHTML = `
		<h1>${title}</h1>
		<p>${message}</p>
		<button id="closePopupButton">OK</button>
	`;
	document.body.appendChild(popup);

	// Add event listener to close the pop-up
	const closeButton = document.getElementById('closePopupButton');
	closeButton.addEventListener('click', () => {
		popup.remove();
		startButton.style.display = 'block'; // Show the start button
		if (onCloseCallback) onCloseCallback(); // Execute callback after closing
	});
}

// Function to handle congratulatory message
function showCongratulatoryMessage() {
	const emojis = ['🎉', '🥳', '💃', '🕺', '🌈', '✨', '🎁', '🏆', '🎊', '🔥'];
	const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
	const message = `
		You did it! Your bar hit 100%! 🚀<br>
		Here's your reward: ${randomEmoji}<br>
		You're officially a legend. Keep shining! 🌟
	`;

	// Call with a callback to reset the game
	showPopupMessage('Congratulations!', message, () => {
		// Remove player data from leaderboard and reset game state
		if (currentPlayerId) {
			fetch(`${API_URL}/end`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ playerId: currentPlayerId }),
			})
			.then(response => {
				if (response.ok) {
					console.log(`Player ${currentPlayerId} successfully removed after winning.`);
				}
			})
			.catch(error => console.error('Error removing player after winning:', error));
		}

		// Reset game state
		resetGameState();
	});
}


// Function to handle premature game end message
function showPrematureEndMessage(reason) {
	const encouragements = [
		"You're amazing for trying!",
		"Don't worry, you'll crush it next time!",
		"Every legend starts somewhere. Keep going!",
		"Failure is just a step toward greatness!"
	];
	const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
	const message = `
		Oh no! The game ended because ${reason}. 😔<br>
		${randomEncouragement}<br>
		Reset and give it another shot—you've got this! 💪
	`;

	// Call with a callback to reset the game
	showPopupMessage('Game Over', message, resetGameState);
}

function resetGameState() {
	// Reset the game state and leaderboard visibility
	document.body.style.backgroundColor = 'green';
	clearInterval(interval); // Stop the timer
	timerElement.textContent = '00:00'; // Clear the timer
	leaderboardContainer.innerHTML = ''; // Clear the leaderboard
	removeEventListeners(); // Remove all listeners
	gameOver = false;
	gameStarted = false;
	currentPlayerId = null; // Reset player ID
	//startButton.style.display = 'block'; // Show the start button
}


const leaderboardContainer = document.getElementById('leaderboard'); // Parent container for the bars
let hasScrolled = false; // Flag to check if scroll has happened

function formatChallengeLevel(minutes) {
	if (minutes >= 60) {
		return `${minutes/60}h`;
	}
	return `${minutes}m`;
}

function calculateProgressPercentage(idleTime, challengeLevel) {
	// Convert challengeLevel from minutes to milliseconds
	const maxTime = challengeLevel * 60 * 1000;
	// Calculate percentage with a max of 100
	return Math.min((idleTime / maxTime) * 100, 100);
}

function fetchAndUpdateLeaderboard() {
	// Stop updating leaderboard if a popup is visible
	if (document.querySelector('.popup')) {
		return;
	}

	fetch(`${API_URL}/players`)
		.then((response) => response.json())
		.then((data) => {
			const currentTime = Date.now();

			// Process and filter players
			const players = data
				.filter(player => {
					// Calculate the completion time dynamically
					const challengeDuration = player.challengeLevel * 60 * 1000; // in ms
					const completionTime = player.startTime + challengeDuration;

					// Exclude players finished more than 15 minutes ago
					if (currentTime > completionTime + 5 * 60 * 1000) {
						console.log(`Player ${player.playerId} exceeded the 5-minute grace period after completing the challenge.`);

						// Remove player from the database
						fetch(`${API_URL}/end`, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ playerId: player.playerId }),
							})
							.then(response => {
								if (!response.ok) {
									console.error(`Failed to remove player ${player.playerId}. Response status: ${response.status}`);
									throw new Error(`Failed to end game for player ${player.playerId}`);
								}
								console.log(`Player ${player.playerId} successfully removed from the leaderboard.`);
							})
							.catch(error => console.error(`Error removing player ${player.playerId}:`, error));

						return false; // Remove the player from the leaderboard
					}


					// Filter by challenge level if applicable
					return selectedChallengeLevel ? player.challengeLevel === selectedChallengeLevel : true;
				})
				.map(player => {
					// Calculate the raw idle time
					const rawIdleTime = currentTime - player.startTime;

					// Calculate the challenge time limit in milliseconds
					const challengeTimeLimit = player.challengeLevel * 60 * 1000;

					// Cap the idle time at the challenge limit
					player.idleTime = Math.min(rawIdleTime, challengeTimeLimit);

					// Store the raw time separately for sorting purposes
					player.rawIdleTime = rawIdleTime;

					return player;
				});

			// Sort players by their raw idle time
			players.sort((a, b) => b.rawIdleTime - a.rawIdleTime);

			// Clear and rebuild the leaderboard
			leaderboardContainer.innerHTML = '';
			let currentPlayerBar = null;

			players.forEach(player => {
				const bar = document.createElement('div');
				bar.className = 'progress-bar';

				if (player.playerId === currentPlayerId) {
					bar.classList.add('player-bar');
					currentPlayerBar = bar;
				}

				const progressPercentage = calculateProgressPercentage(player.rawIdleTime, player.challengeLevel);
				bar.style.width = `${progressPercentage}%`;

				// Handle completed players
				if (progressPercentage >= 100) {
					// Style completed players
					if (!bar.classList.contains('completed')) {
						bar.classList.add('completed');
						bar.style.backgroundColor = player.playerId === currentPlayerId ? 'rgb(255, 255, 0)' : 'rgb(0, 255, 0)';
						if (player.playerId === currentPlayerId) {
							if (gameOver) return; // Prevent multiple calls
							gameOver = true;
							clearInterval(interval);
							removeEventListeners();
							showCongratulatoryMessage();
							console.log("Game won!");
						}
					}
				}

				// Add player info to the leaderboard bar
				const label = document.createElement('span');
				label.className = 'bar-label';
				label.textContent = `${formatTime(player.idleTime)}`;

				const emojiHolder = document.createElement('span');
				emojiHolder.className = 'emoji';
				emojiHolder.textContent = player.emoji || '❓';

				const challengeLabel = document.createElement('span');
				challengeLabel.className = 'challenge-label';
				challengeLabel.textContent = formatChallengeLevel(player.challengeLevel);

				const progressLabel = document.createElement('span');
				progressLabel.className = 'progress-label';
				progressLabel.textContent = `${Math.floor(progressPercentage)}%`;

				// Add a trophy for completed players
				if (progressPercentage >= 100) {
					const trophy = document.createElement('span');
					trophy.className = 'trophy';
					trophy.textContent = '🏆';
					bar.appendChild(trophy);
				}

				bar.appendChild(label);
				bar.appendChild(emojiHolder);
				bar.appendChild(challengeLabel);
				bar.appendChild(progressLabel);
				leaderboardContainer.appendChild(bar);
			});

			// Scroll to the current player's bar if it exists
			if (currentPlayerBar) {
				const leaderboard = document.getElementById('leaderboard');
				leaderboard.scrollTo({
					top: currentPlayerBar.offsetTop - leaderboard.offsetTop,
					behavior: 'smooth'
				});
				hasScrolled = true;
			}
		})
		.catch(error => console.error('Error fetching leaderboard:', error));
}


// Helper to format time as hh:mm:ss
function formatTime(ms) {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Fetch leaderboard every second
//fetchAndUpdateLeaderboard();
setInterval(fetchAndUpdateLeaderboard, 1000);

async function endGame(reason = null) {
	if (gameOver) return; // Prevent multiple calls
	gameOver = true;
	selectedChallengeLevel = null; // Reset challenge level

	clearInterval(interval); // Stop the timer

	// Show premature game end message if reason is provided
	if (reason) {
		showPrematureEndMessage(reason);
	}

	// Remove player data from the database via API
	if (currentPlayerId) {
		try {
			const response = await fetch(`${API_URL}/end`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ playerId: currentPlayerId }),
			});

			const data = await response.json();
			console.log('Player remove response:', data);
		} catch (error) {
			console.error('Error removing player:', error.message);
		}
		currentPlayerId = null; // Reset the player ID
	}
	removeEventListeners();
	console.log("Game ended");
}

function addEventListeners() {
	if (isDesktop) {
		// Add desktop-specific event listeners
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("mouseup", handleClick); // Detect mouse click
	} else {
		// Add motion/orientation event listeners for mobile devices
		window.addEventListener("devicemotion", handleMotion);
		window.addEventListener("deviceorientation", handleOrientation);
		window.addEventListener("touchstart", handleTouchInteraction); // Detect touch events
		window.addEventListener("touchmove", handleTouchInteraction);
	}
}

function removeEventListeners() {
	// Remove event listeners
	if (isDesktop) {
		window.removeEventListener("mousemove", handleMouseMove);
		window.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("mouseup", handleClick);
	} else {
		window.removeEventListener("devicemotion", handleMotion);
		window.removeEventListener("deviceorientation", handleOrientation);
		window.removeEventListener("touchstart", handleTouchInteraction);
		window.removeEventListener("touchmove", handleTouchInteraction);
	}
}

// Clean up on page reload or stop
window.addEventListener('beforeunload', endGame);