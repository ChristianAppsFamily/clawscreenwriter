const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// AI Writing endpoint
router.post('/generate', [
    body('script').isObject().withMessage('Script object is required'),
    body('script.title').exists().withMessage('Script title is required'),
    body('steps').isArray().withMessage('Steps must be an array'),
    body('drafts').isArray().withMessage('Drafts must be an array'),
    body('prompt').exists().withMessage('Prompt is required'),
    body('format').isIn(['fountain', 'prose']).withMessage('Format must be fountain or prose')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { script, steps, drafts, prompt, format } = req.body;

        // Build context from script data
        const contextLines = [];
        contextLines.push(`# Script: ${script.title}`);
        contextLines.push('');

        if (script.written_by) {
            contextLines.push(`Written by: ${script.written_by}`);
        }
        if (script.author_name) {
            contextLines.push(`Author: ${script.author_name}`);
        }
        contextLines.push('');

        if (steps.length > 0) {
            contextLines.push('## Development Steps');
            contextLines.push('');
            steps.forEach(step => {
                contextLines.push(`### ${step.title} (${step.step_type})`);
                if (step.content) {
                    contextLines.push(step.content);
                }
                contextLines.push('');
            });
        }

        if (drafts.length > 0) {
            contextLines.push('## Existing Drafts');
            contextLines.push('');
            drafts.forEach(draft => {
                contextLines.push(`### ${draft.title}`);
                if (draft.content) {
                    const preview = draft.content.substring(0, 500);
                    contextLines.push(preview + (draft.content.length > 500 ? '...' : ''));
                }
                contextLines.push('');
            });
        }

        const contextText = contextLines.join('\n');

        // For now, return a placeholder response
        // TODO: Integrate with OpenAI or other AI service
        const systemPrompt = `You are OpenClaw, an AI screenwriting assistant.
You help writers develop their scripts by understanding their story development work and generating screenplay content.
Always output in Fountain format when requested.

Current script context:
${contextText}`;

        // Placeholder response - replace with actual AI integration
        const generatedContent = format === 'fountain' 
            ? generatePlaceholderFountain(script.title, prompt)
            : generatePlaceholderProse(script.title, prompt);

        res.json({
            content: generatedContent,
            format: format,
            suggestions: [
                'Review the generated content',
                'Edit to match your voice',
                'Add more specific details'
            ]
        });

    } catch (error) {
        console.error('OpenClaw generation error:', error);
        res.status(500).json({ error: error.message || 'Generation failed' });
    }
});

// Placeholder generators - replace with actual AI integration
function generatePlaceholderFountain(title, prompt) {
    return `INT. LOCATION - DAY

Action description based on: ${prompt}

CHARACTER
Dialogue goes here...

(CONTINUED)`;
}

function generatePlaceholderProse(title, prompt) {
    return `Scene description based on: ${prompt}

The scene opens with...`;
}

module.exports = router;
