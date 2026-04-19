const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// Get all projects
router.get('/', (req, res) => {
    try {
        const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single project
router.get('/:id', (req, res) => {
    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ project });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new project
router.post('/', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('description').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const id = uuidv4();
        const { name, description } = req.body;
        
        db.prepare('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)')
            .run(id, name, description || null);
        
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        res.status(201).json({ project });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a project
router.put('/:id', [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, description } = req.body;
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        const result = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
            .run(...values);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        res.json({ project });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a project
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all documents for a project
router.get('/:id/documents', (req, res) => {
    try {
        const documents = db.prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY updated_at DESC')
            .all(req.params.id);
        res.json({ documents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
