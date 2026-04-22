const { Builder } = require('xml2js');
const fountainParser = require('./fountain-parser');

function generate(content, options = {}) {
    const parsed = fountainParser.parse(content, {
        print_headers: true,
        print_actions: true,
        print_dialogues: true
    });

    const title = options.title || 'Untitled';
    
    // Build Final Draft XML structure
    const fdx = {
        FinalDraft: {
            $: {
                DocumentType: 'Script',
                Template: 'No',
                Version: '1'
            },
            Content: {
                Paragraph: []
            }
        }
    };

    // Add title page if present
    if (parsed.title_page) {
        const titlePage = { Paragraph: [] };
        
        for (const token of parsed.title_page) {
            if (token.text) {
                titlePage.Paragraph.push({
                    $: { Type: 'Title' },
                    Text: token.text
                });
            }
        }
        
        fdx.FinalDraft.TitlePage = titlePage;
    }

    // Convert tokens to FDX paragraphs
    for (const token of parsed.tokens) {
        const paragraph = convertTokenToParagraph(token);
        if (paragraph) {
            fdx.FinalDraft.Content.Paragraph.push(paragraph);
        }
    }

    // Build XML
    const builder = new Builder({
        headless: false,
        renderOpts: { pretty: true, indent: '  ' }
    });
    
    return builder.buildObject(fdx);
}

function convertTokenToParagraph(token) {
    const typeMap = {
        'scene_heading': 'Scene Heading',
        'action': 'Action',
        'character': 'Character',
        'dialogue': 'Dialogue',
        'parenthetical': 'Parenthetical',
        'transition': 'Transition',
        'centered': 'Action',
        'page_break': 'Action',
        'synopsis': 'Action',
        'section': 'Action',
        'note': 'Action'
    };

    const fdxType = typeMap[token.type];
    if (!fdxType) return null;

    const paragraph = {
        $: { Type: fdxType },
        Text: token.text || ''
    };

    // Handle scene numbers
    if (token.type === 'scene_heading' && token.number) {
        paragraph.$.Number = token.number;
    }

    // Handle dual dialogue
    if (token.dual) {
        paragraph.$.Dual = 'Yes';
    }

    return paragraph;
}

module.exports = {
    generate
};
