const express = require('express');
const { body, validationResult } = require('express-validator');
const pdfGenerator = require('../utils/pdf-generator');
const fdxGenerator = require('../utils/fdx-generator');
const db = require('../db');

const router = express.Router();

// Export document to PDF
router.get('/pdf/:documentId', async (req, res) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const options = {
            print_title_page: req.query.print_title_page !== 'false',
            print_header: req.query.print_header || '',
            print_footer: req.query.print_footer || '',
            print_watermark: req.query.print_watermark || '',
            show_page_numbers: req.query.show_page_numbers !== 'false',
            embolden_scene_headers: req.query.embolden_scene_headers === 'true',
            underline_scene_headers: req.query.underline_scene_headers === 'false',
            scenes_numbers: req.query.scenes_numbers || 'none',
            font_family: req.query.font_family || 'courier'
        };

        const pdfBuffer = await pdfGenerator.generate(document.content, options);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export Fountain text to PDF (direct upload)
router.post('/pdf', [
    body('content').exists().withMessage('Content is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { content, options = {}, filename = 'screenplay' } = req.body;
        const pdfBuffer = await pdfGenerator.generate(content, options);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export document to FDX (Final Draft)
router.get('/fdx/:documentId', (req, res) => {
    try {
        const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.documentId);
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const fdxXml = fdxGenerator.generate(document.content, { title: document.title });
        
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${document.title}.fdx"`);
        res.send(fdxXml);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export Fountain text to FDX (direct upload)
router.post('/fdx', [
    body('content').exists().withMessage('Content is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { content, options = {}, filename = 'screenplay' } = req.body;
        const fdxXml = fdxGenerator.generate(content, options);
        
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.fdx"`);
        res.send(fdxXml);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
