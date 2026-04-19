// Fountain parser wrapper using aw-parser
const fparser = require('aw-parser');

// Default print settings
const defaultPrintSettings = {
    paper_size: 'letter',
    font_size: 12,
    font_width: 0.07,
    font_height: 0.1667,
    line_spacing: 1,
    lines_per_page: 55,
    page_width: 8.5,
    page_height: 11,
    left_margin: 1.5,
    right_margin: 1,
    top_margin: 1,
    action: { feed: 1.5, max: 61 },
    character: { feed: 3.7, max: 35 },
    dialogue: { feed: 2.5, max: 36 },
    parenthetical: { feed: 3.1, max: 28 },
    scene_heading: { feed: 1.5, max: 61 },
    transition: { feed: 1.5, max: 61 },
    centered: { feed: 1.5, max: 61 },
    synopsis: { feed: 1.5, max: 61, padding: 0.5 },
    section: { feed: 1.5, max: 61, level_indent: 0.2 },
    title_page: {
        top_start: 3.5,
        left_side: ['draft_date', 'date', 'contact'],
        right_side: ['copyright']
    },
    page_number_top_margin: 0.5
};

function parse(content, options = {}) {
    const config = {
        print_headers: options.print_headers !== false,
        print_actions: options.print_actions !== false,
        print_dialogues: options.print_dialogues !== false,
        print_notes: options.print_notes !== false,
        print_sections: options.print_sections !== false,
        print_synopsis: options.print_synopsis !== false,
        each_scene_on_new_page: options.each_scene_on_new_page || false,
        double_space_between_scenes: options.double_space_between_scenes || false,
        use_dual_dialogue: options.use_dual_dialogue !== false,
        merge_multiple_empty_lines: options.merge_multiple_empty_lines !== false,
        print: options.print || defaultPrintSettings
    };

    const parsed = fparser.parser.parse(content, config);
    
    // Add line information
    const liner = new (require('aw-liner'))(fparser.helpers);
    parsed.lines = liner.line(parsed.tokens, {
        print: config.print,
        text_more: options.text_more || '(MORE)',
        text_contd: options.text_contd || "(CONT'D)",
        split_dialogue: options.split_dialogue !== false
    });

    return parsed;
}

function getStats(content) {
    const parsed = parse(content);
    
    let pages = 0;
    let scenes = 0;
    let actionLines = 0;
    let dialogueLines = 0;
    const characters = new Set();
    const locations = new Set();
    
    let currentScene = null;
    let hasDialogue = false;

    for (const line of parsed.lines) {
        if (line.type === 'page_break') {
            pages++;
        } else if (line.type === 'scene_heading') {
            if (currentScene && hasDialogue) {
                // Previous scene had dialogue
            }
            scenes++;
            currentScene = line;
            hasDialogue = false;
            
            // Extract location
            const location = line.text.replace(/^\.(?!\.)|^(INT|EXT|EST|I\/E)[.\s]*/i, '').trim();
            if (location) {
                locations.add(location);
            }
        } else if (line.type === 'character') {
            const character = line.text.replace(/\^$/, '').trim();
            if (character) {
                characters.add(character);
            }
        } else if (line.type === 'dialogue') {
            dialogueLines++;
            hasDialogue = true;
        } else if (line.type === 'action') {
            actionLines++;
        }
    }

    // Estimate page count if no explicit page breaks
    if (pages === 0) {
        pages = Math.ceil(parsed.lines.length / defaultPrintSettings.lines_per_page);
    }

    return {
        pages,
        scenes,
        actionLines,
        dialogueLines,
        characters: Array.from(characters).sort(),
        locations: Array.from(locations).sort(),
        totalLines: parsed.lines.length
    };
}

module.exports = {
    parse,
    getStats
};
