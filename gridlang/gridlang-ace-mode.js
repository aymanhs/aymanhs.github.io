/**
 * GridLang mode for Ace Editor
 * Provides syntax highlighting for GridLang language
 */

ace.define('ace/mode/gridlang_highlight_rules', function(require, exports, module) {
    const oop = require('ace/lib/oop');
    const TextHighlightRules = require('ace/mode/text_highlight_rules').TextHighlightRules;

    const GridLangHighlightRules = function() {
        this.$rules = {
            start: [
                {
                    token: 'comment',
                    regex: /#.*$/
                },
                {
                    token: 'string',
                    regex: '"(?:\\\\.|[^"\\\\])*"'
                },
                {
                    token: 'string',
                    regex: "'(?:\\\\.|[^'\\\\])*'"
                },
                {
                    token: 'keyword',
                    regex: '\\b(if|elif|elsif|else|for|while|func|return|true|false|null|in|and|or|not)\\b'
                },
                {
                    token: 'support.function',
                    regex: '\\b(print|debug|set_debug|assert|range|abs|sqrt|pow|floor|ceil|round|sin|cos|tan|min|max|random|len|append|str|int|float|bool|substr|slice|split|join|upper|lower|trim|replace|starts_with|ends_with|contains|index_of|char_at|char_code|from_char_code|repeat|reverse|init_2d|set_cell|clear_canvas|set_pixel|draw_line|draw_circle|draw_rect|rgb|hsl|init_3d|set_voxel|remove_voxel|get_voxel|clear_3d|begin_3d_batch|end_3d_batch|input_string|input_lines|input_grid|time|clock|benchmark|animate|stop_animation|rotate_3d)\\b'
                },
                {
                    token: 'constant.numeric',
                    regex: '\\b\\d+(\\.\\d+)?\\b'
                },
                {
                    token: 'constant.language',
                    regex: '\\b(true|false|null)\\b'
                },
                {
                    token: 'operator',
                    regex: '[{}()\[\],.;=<>+\\-*/%&|!?]'
                },
                {
                    token: 'text',
                    regex: '\\s+'
                },
                {
                    token: 'variable',
                    regex: '[a-zA-Z_]\\w*'
                }
            ]
        };
    };

    oop.inherits(GridLangHighlightRules, TextHighlightRules);

    exports.GridLangHighlightRules = GridLangHighlightRules;
});

ace.define('ace/mode/gridlang', function(require, exports, module) {
    const oop = require('ace/lib/oop');
    const TextMode = require('ace/mode/text').Mode;
    const GridLangHighlightRules = require('ace/mode/gridlang_highlight_rules').GridLangHighlightRules;

    const Mode = function() {
        this.HighlightRules = GridLangHighlightRules;
    };

    oop.inherits(Mode, TextMode);

    (function() {
        this.createWorker = function(session) {
            return null;
        };
    }).call(Mode.prototype);

    exports.Mode = Mode;
});
