const express = require('express');
const { body, validationResult } = require('express-validator');
const fountainParser = require('../utils/fountain-parser');

const router = express.Router();

// Parse Fountain text
router.post('/fountain', [
    body('content').exists().withMessage('Content is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { content, options = {} } = req.body;
        const parsed = fountainParser.parse(content, options);
        res.json({ parsed });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get script stats
router.post('/stats', [
    body('content').exists().withMessage('Content is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { content } = req.body;
        const stats = fountainParser.getStats(content);
        res.json({ stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
