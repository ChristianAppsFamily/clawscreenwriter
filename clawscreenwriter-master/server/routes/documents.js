const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// Get all documents
router.get('/', (req, res) => {
    try {
        const documents = db.prepare('SELECT * FROM documents ORDER BY updated_at DESC').all();
        res.json({ documents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a single document
router.get('/:id', (req, res) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json({ document });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new document
router.post('/', [
    body('project_id').trim().notEmpty().withMessage('Project ID is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').optional(),
    body('format').optional().isIn(['fountain', 'fdx'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const id = uuidv4();
        const { project_id, title, content, format } = req.body;
        
        // Verify project exists
        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(project_id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        db.prepare('INSERT INTO documents (id, project_id, title, content, format) VALUES (?, ?, ?, ?, ?)')
            .run(id, project_id, title, content || '', format || 'fountain');
        
        // Create initial version
        const versionId = uuidv4();
        db.prepare('INSERT INTO versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?)')
            .run(versionId, id, content || '', 1);
        
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
        res.status(201).json({ document });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a document
router.put('/:id', [
    body('title').optional().trim(),
    body('content').optional(),
    body('format').optional().isIn(['fountain', 'fdx'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, content, format } = req.body;
        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (content !== undefined) {
            updates.push('content = ?');
            values.push(content);
            
            // Create new version
            const maxVersion = db.prepare('SELECT MAX(version_number) as max FROM versions WHERE document_id = ?')
                .get(req.params.id);
            const newVersion = (maxVersion?.max || 0) + 1;
            const versionId = uuidv4();
            db.prepare('INSERT INTO versions (id, document_id, content, version_number) VALUES (?, ?, ?, ?)')
                .run(versionId, req.params.id, content, newVersion);
        }
        if (format !== undefined) {
            updates.push('format = ?');
            values.push(format);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        const result = db.prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`)
            .run(...values);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
        res.json({ document });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a document
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get versions for a document
router.get('/:id/versions', (req, res) => {
    try {
        const versions = db.prepare('SELECT * FROM versions WHERE document_id = ? ORDER BY version_number DESC')
            .all(req.params.id);
        res.json({ versions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific version
router.get('/:id/versions/:versionId', (req, res) => {
    try {
        const version = db.prepare('SELECT * FROM versions WHERE id = ? AND document_id = ?')
            .get(req.params.versionId, req.params.id);
        if (!version) {
            return res.status(404).json({ error: 'Version not found' });
        }
        res.json({ version });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
