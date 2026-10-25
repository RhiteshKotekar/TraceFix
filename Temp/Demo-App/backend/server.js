const express = require('express');
const cors = require('cors');

// Import Middleware
const logger = require('./middleware/logger');
const { initDb } = require('./db');

// Import Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const demoResourceRoutes = require('./routes/demo-resources');
const { createDemoSimulatorRouter } = require('./routes/demo-simulator');

const app = express();
const demoSimulator = createDemoSimulatorRouter();
const PORT = process.env.PORT || 5002;

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());

// Logger
app.use(logger);

// Health Check
app.get('/api/health', (req, res) => {
  if (demoSimulator.isHealthFailureEnabled()) {
    return res.status(503).json({ status: 'unhealthy', message: 'Health-check failure is enabled by the demo simulator' });
  }
  return res.status(200).json({ status: 'up', message: 'Vulnerable backend is running' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api/demo', demoSimulator.router);
app.use('/', demoResourceRoutes);

// 🔥 Start server FIRST
async function start() {
console.log('===========================================');
console.log('Initializing database...');
console.log('===========================================');

// 🔥 Init DB without crashing server
try {
await initDb();
console.log('Database initialized successfully');
} catch (error) {
console.error('Database initialization failed:', error.message);
process.exit(1);
}

app.listen(PORT, () => {
console.log(`Vulnerable Backend listening on port ${PORT}`);
});
}

start();

