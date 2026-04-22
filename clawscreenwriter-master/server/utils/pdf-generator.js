const PDFDocument = require('pdfkit');
const fountainParser = require('./fountain-parser');

// Font configurations
const fonts = {
    courier: {
        regular: 'Courier',
        bold: 'Courier-Bold',
        italic: 'Courier-Oblique',
        bolditalic: 'Courier-BoldOblique'
    },
    times: {
        regular: 'Times-Roman',
        bold: 'Times-Bold',
        italic: 'Times-Italic',
        bolditalic: 'Times-BoldItalic'
    },
    helvetica: {
        regular: 'Helvetica',
        bold: 'Helvetica-Bold',
        italic: 'Helvetica-Oblique',
        bolditalic: 'Helvetica-BoldOblique'
    }
};

// Default print settings
const defaultPrint = {
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

function generate(content, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            const print = defaultPrint;
            const fontConfig = fonts[options.font_family] || fonts.courier;
            
            const doc = new PDFDocument({
                size: print.paper_size === 'a4' ? 'A4' : 'LETTER',
                margins: { top: 0, left: 0, bottom: 0, right: 0 }
            });

            // Register fonts
            doc.registerFont('ScriptNormal', fontConfig.regular);
            doc.registerFont('ScriptBold', fontConfig.bold);
            doc.registerFont('ScriptBoldOblique', fontConfig.bolditalic);
            doc.registerFont('ScriptOblique', fontConfig.italic);
            doc.font('ScriptNormal');
            doc.fontSize(print.font_size);

            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Parse the fountain content
            const parsed = fountainParser.parse(content, {
                print_headers: true,
                print_actions: true,
                print_dialogues: true
            });

            // Set document info
            const titleToken = parsed.title_page?.find(t => t.type === 'title');
            const authorToken = parsed.title_page?.find(t => t.type === 'author' || t.type === 'authors');
            
            doc.info.Title = titleToken ? titleToken.text.replace(/\*/g, '').replace(/_/g, '') : '';
            doc.info.Author = authorToken ? authorToken.text.replace(/\*/g, '').replace(/_/g, '') : '';
            doc.info.Creator = 'Claw Screenwriter';

            // Helper functions
            const center = (text, y) => {
                const cleanText = text.replace(/\*/g, '').replace(/_/g, '');
                const textLength = cleanText.length;
                const feed = (print.page_width - textLength * print.font_width) / 2;
                doc.text(text, feed * 72, y * 72);
            };

            // Print title page if enabled
            if (options.print_title_page !== false && parsed.title_page) {
                let titleY = print.title_page.top_start;
                
                const titlePageMain = (type, capitalize = false) => {
                    const token = parsed.title_page.find(t => t.type === type);
                    if (token) {
                        token.text.split('\n').forEach(line => {
                            const text = capitalize ? line.toUpperCase() : line;
                            center(text, titleY);
                            titleY += print.line_spacing * print.font_height;
                        });
                    }
                };

                titlePageMain('title', true);
                titleY += print.line_spacing * print.font_height * 2;
                titlePageMain('credit');
                titleY += print.line_spacing * print.font_height;
                titlePageMain('author');
                
                doc.addPage();
            }

            // Print script content
            let y = 0;
            let page = 1;

            const printHeaderAndFooter = () => {
                if (options.print_header) {
                    doc.font('ScriptNormal');
                    doc.text(options.print_header, 1.5 * 72, print.page_number_top_margin * 72, { color: '#777777' });
                }
                if (options.print_footer) {
                    doc.text(options.print_footer, 1.5 * 72, (print.page_height - 0.5) * 72, { color: '#777777' });
                }
            };

            const printWatermark = () => {
                if (options.print_watermark) {
                    doc.save();
                    doc.rotate(45);
                    doc.fontSize(48);
                    doc.fillColor('#eeeeee');
                    doc.text(options.print_watermark, 100, -100);
                    doc.restore();
                    doc.fontSize(print.font_size);
                    doc.fillColor('black');
                }
            };

            printWatermark();
            printHeaderAndFooter();

            for (const line of parsed.lines) {
                if (line.type === 'page_break') {
                    y = 0;
                    doc.addPage();
                    page++;
                    
                    if (options.show_page_numbers !== false) {
                        const pageNum = page.toFixed() + '.';
                        const numberX = print.action.feed + print.action.max * print.font_width - pageNum.length * print.font_width;
                        doc.font('ScriptNormal');
                        doc.text(pageNum, numberX * 72, print.page_number_top_margin * 72);
                    }
                    
                    printWatermark();
                    printHeaderAndFooter();
                } else if (line.type === 'separator') {
                    y++;
                } else {
                    let text = line.text;
                    const feed = (print[line.type] || print.action).feed;
                    
                    // Apply formatting
                    if (line.type === 'scene_heading') {
                        if (options.embolden_scene_headers) {
                            text = '**' + text + '**';
                        }
                        if (options.underline_scene_headers) {
                            text = '_' + text + '_';
                        }
                    }

                    if (line.type === 'transition') {
                        const transitionFeed = print.action.feed + print.action.max * print.font_width - text.length * print.font_width;
                        doc.text(text, transitionFeed * 72, (print.top_margin + print.font_height * y) * 72);
                    } else if (line.type === 'centered') {
                        center(text, print.top_margin + print.font_height * y);
                    } else {
                        // Handle bold/italic formatting
                        const formatAndPrint = (text, x, yPos) => {
                            const parts = text.split(/(\*\*\*|\*\*|\*)/g).filter(Boolean);
                            let bold = false;
                            let italic = false;
                            let currentX = x;

                            for (const part of parts) {
                                if (part === '***') {
                                    bold = !bold;
                                    italic = !italic;
                                } else if (part === '**') {
                                    bold = !bold;
                                } else if (part === '*') {
                                    italic = !italic;
                                } else {
                                    if (bold && italic) {
                                        doc.font('ScriptBoldOblique');
                                    } else if (bold) {
                                        doc.font('ScriptBold');
                                    } else if (italic) {
                                        doc.font('ScriptOblique');
                                    } else {
                                        doc.font('ScriptNormal');
                                    }
                                    doc.text(part, currentX * 72, yPos * 72, { lineBreak: false });
                                    currentX += print.font_width * part.length;
                                }
                            }
                        };

                        formatAndPrint(text, feed, print.top_margin + print.font_height * y);
                    }
                    y++;
                }
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generate
};
