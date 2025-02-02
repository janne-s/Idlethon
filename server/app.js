const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const routes = require('./routes'); // Import routes
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per windowMs
});

// SSL certificate files (for local testing with self-signed certs)
const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
const certificate = fs.readFileSync(process.env.CERTIFICATE_PATH, 'utf8');
const credentials = { key: privateKey, cert: certificate };

app.use(limiter); // Apply to all requests

// Middleware
app.use(
  helmet({
	contentSecurityPolicy: {
	  directives: {
		defaultSrc: ["'self'"], // Default policy for fetching resources
		scriptSrc: [
		  "'self'", // Allow scripts from your domain
		  "'unsafe-inline'", // Allow inline scripts (use sparingly)
		  "'unsafe-eval'", // Allow eval (use sparingly)
		  'blob:', // Allow blob URLs
		],
		styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
		imgSrc: ["'self'", 'data:', 'blob:'], // Allow images from your domain, data URIs, and blob URLs
		connectSrc: ["'self'", 'blob:'], // Allow connections to your domain and blob URLs
	  },
	},
  })
);
// Configure CORS to allow only trusted domains
const corsOptions = {
  origin: process.env.FRONTEND_URL, // Allow only this domain
  methods: 'GET,POST', // Allow only specific HTTP methods
  credentials: true, // Allow cookies and authentication headers
  optionsSuccessStatus: 200, // Return 200 for preflight requests
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (index.html, script.js, styles.css)

// API routes
app.use('/api', routes); // Use routes for API

// Start server with HTTPS
https.createServer(credentials, app).listen(PORT, '0.0.0.0', () => {
	console.log(`HTTPS Server running on https://localhost:${PORT}`);
});