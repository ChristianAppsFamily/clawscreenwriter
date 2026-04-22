const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
const exportRoutes = require('./routes/export');
const parseRoutes = require('./routes/parse');
const openclawRoutes = require('./routes/openclaw');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for the editor
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/openclaw', openclawRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files (the Afterwriting editor)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve the editor at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Claw Screenwriter server running on port ${PORT}`);
});

module.exports = app;
