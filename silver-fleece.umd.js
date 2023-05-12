(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.fleece = {}));
})(this, (function (exports) { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function getLocator(source, options) {
        if (options === void 0) { options = {}; }
        var offsetLine = options.offsetLine || 0;
        var offsetColumn = options.offsetColumn || 0;
        var originalLines = source.split('\n');
        var start = 0;
        var lineRanges = originalLines.map(function (line, i) {
            var end = start + line.length + 1;
            var range = { start: start, end: end, line: i };
            start = end;
            return range;
        });
        var i = 0;
        function rangeContains(range, index) {
            return range.start <= index && index < range.end;
        }
        function getLocation(range, index) {
            return { line: offsetLine + range.line, column: offsetColumn + index - range.start, character: index };
        }
        function locate(search, startIndex) {
            if (typeof search === 'string') {
                search = source.indexOf(search, startIndex || 0);
            }
            var range = lineRanges[i];
            var d = search >= range.end ? 1 : -1;
            while (range) {
                if (rangeContains(range, search))
                    return getLocation(range, search);
                i += d;
                range = lineRanges[i];
            }
        }
        return locate;
    }
    function locate(source, search, options) {
        if (typeof options === 'number') {
            throw new Error('locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument');
        }
        return getLocator(source, options)(search, options && options.startIndex);
    }

    var whitespace = /\s/;
    var number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/;
    function spaces(n) {
        var result = '';
        while (n--)
            result += ' ';
        return result;
    }

    function parse(str, opts) {
        var parser = new Parser(str, opts);
        return parser.value;
    }
    function noop() { }
    var ParseError = /** @class */ (function (_super) {
        __extends(ParseError, _super);
        function ParseError(message, pos, loc) {
            var _this = _super.call(this, message) || this;
            _this.pos = pos;
            _this.loc = loc;
            return _this;
        }
        return ParseError;
    }(Error));
    var Parser = /** @class */ (function () {
        function Parser(str, opts) {
            this.str = str;
            this.index = 0;
            this.onComment = (opts && opts.onComment) || noop;
            this.onValue = (opts && opts.onValue) || noop;
            this.value = this.readValue();
            this.readWhitespaceOrComment();
            if (this.index < this.str.length) {
                throw new Error("Unexpected character '".concat(this.peek(), "'"));
            }
        }
        Parser.prototype.readWhitespaceOrComment = function () {
            while (this.index < this.str.length &&
                whitespace.test(this.str[this.index])) {
                this.index++;
            }
            var start = this.index;
            if (this.eat('/')) {
                if (this.eat('/')) {
                    // line comment
                    var text = this.readUntil(/(?:\r\n|\n|\r)/);
                    this.onComment({
                        start: start,
                        end: this.index,
                        type: 'Comment',
                        text: text,
                        block: false
                    });
                    this.eat('\n');
                }
                else if (this.eat('*')) {
                    // block comment
                    var text = this.readUntil(/\*\//);
                    this.onComment({
                        start: start,
                        end: this.index,
                        type: 'Comment',
                        text: text,
                        block: true
                    });
                    this.eat('*/', true);
                }
            }
            else {
                return;
            }
            this.readWhitespaceOrComment();
        };
        Parser.prototype.error = function (message, index) {
            if (index === void 0) { index = this.index; }
            var loc = locate(this.str, index, { offsetLine: 1 });
            // console.debug(`Error ${message}:`);
            // console.debug(`  string: ${this.str}`);
            // console.debug(`          ` + ' '.repeat(this.index) + `^-- here (${this.str[this.index]})`)
            // console.debug(`  around here `, this.str.slice(this.index-3, this.index+3));
            throw new ParseError(message, index, loc);
        };
        Parser.prototype.eat = function (str, required) {
            if (this.str.slice(this.index, this.index + str.length) === str) {
                this.index += str.length;
                return str;
            }
            if (required) {
                this.error("Expected '".concat(str, "' instead of '").concat(this.str[this.index], "'"));
            }
            return null;
        };
        Parser.prototype.peek = function () {
            return this.str[this.index];
        };
        Parser.prototype.read = function (pattern) {
            var match = pattern.exec(this.str.slice(this.index));
            if (!match || match.index !== 0)
                return null;
            this.index += match[0].length;
            return match[0];
        };
        Parser.prototype.readUntil = function (pattern) {
            if (this.index >= this.str.length)
                this.error('Unexpected end of input');
            var start = this.index;
            var match = pattern.exec(this.str.slice(start));
            if (match) {
                var start_1 = this.index;
                this.index = start_1 + match.index;
                return this.str.slice(start_1, this.index);
            }
            this.index = this.str.length;
            return this.str.slice(start);
        };
        Parser.prototype.readArray = function () {
            var start = this.index;
            if (!this.eat('['))
                return null;
            var array = {
                start: start,
                end: null,
                type: 'ArrayExpression',
                elements: []
            };
            this.readWhitespaceOrComment();
            while (this.peek() !== ']') {
                array.elements.push(this.readValue());
                this.readWhitespaceOrComment();
                if (!this.eat(','))
                    break;
                this.readWhitespaceOrComment();
            }
            if (!this.eat(']')) {
                this.error("Expected ']' instead of '".concat(this.str[this.index], "'"));
            }
            array.end = this.index;
            return array;
        };
        Parser.prototype.readBoolean = function () {
            var start = this.index;
            var raw = this.read(/^(true|false)/);
            if (raw) {
                return {
                    start: start,
                    end: this.index,
                    type: 'Literal',
                    raw: raw,
                    value: raw === 'true'
                };
            }
        };
        Parser.prototype.readNull = function () {
            var start = this.index;
            if (this.eat('null')) {
                return {
                    start: start,
                    end: this.index,
                    type: 'Literal',
                    raw: 'null',
                    value: null
                };
            }
        };
        Parser.prototype.readLiteral = function () {
            return (this.readBoolean() ||
                this.readNumber() ||
                this.readString() ||
                this.readNull());
        };
        Parser.prototype.readNumber = function () {
            var start = this.index;
            var raw = this.read(number);
            if (raw) {
                return {
                    start: start,
                    end: this.index,
                    type: 'Literal',
                    raw: raw,
                    value: Number(raw)
                };
            }
        };
        Parser.prototype.readObject = function () {
            var start = this.index;
            if (!this.eat('{'))
                return;
            var object = {
                start: start,
                end: null,
                type: 'ObjectExpression',
                properties: []
            };
            this.readWhitespaceOrComment();
            while (this.peek() !== '}') {
                object.properties.push(this.readProperty());
                this.readWhitespaceOrComment();
                if (!this.eat(','))
                    break;
                this.readWhitespaceOrComment();
            }
            this.eat('}', true);
            object.end = this.index;
            return object;
        };
        Parser.prototype.readProperty = function () {
            this.readWhitespaceOrComment();
            var property = {
                start: this.index,
                end: null,
                type: 'Property',
                key: this.readPropertyKey(),
                value: this.readValue()
            };
            property.end = this.index;
            return property;
        };
        Parser.prototype.readPropertyKey = function () {
            var key = this.readString();
            if (!key)
                this.error("Bad identifier");
            if (key.type === 'Literal') {
                key.name = String(key.value);
            }
            this.readWhitespaceOrComment();
            this.eat(':', true);
            return key;
        };
        Parser.prototype.readString = function () {
            var start = this.index;
            var quote = this.eat('"');
            if (!quote)
                return;
            var end = this.str.indexOf('"', start + 1);
            while (end > 0 && this.str[end - 1] === '\\') {
                end = this.str.indexOf('"', end + 1);
            }
            if (end === -1)
                this.error("Unexpected end of input");
            end++;
            this.index = end;
            var raw = this.str.slice(start, end);
            return {
                start: start,
                end: end,
                type: 'Literal',
                raw: raw,
                value: JSON.parse(raw)
            };
        };
        Parser.prototype.readValue = function () {
            this.readWhitespaceOrComment();
            var value = (this.readArray() ||
                this.readObject() ||
                this.readLiteral());
            if (value) {
                this.onValue(value);
                return value;
            }
            // console.debug('string', this.str);
            // console.debug("at pos", ' '.repeat(this.index) + '^   ', this.str[this.index]);
            this.error("Unexpected EOF");
        };
        return Parser;
    }());

    function evaluate(str, opts) {
        var ast = parse(str, opts);
        return getValue(ast);
    }
    function getValue(node) {
        if (node.type === 'Literal') {
            return node.value;
        }
        if (node.type === 'ArrayExpression') {
            return node.elements.map(getValue);
        }
        if (node.type === 'ObjectExpression') {
            var obj_1 = {};
            node.properties.forEach(function (prop) {
                obj_1[prop.key.name] = getValue(prop.value);
            });
            return obj_1;
        }
    }

    function stringify(value, options) {
        var indentString = (options && options.spaces) ? spaces(options.spaces) : '\t';
        return stringifyValue(value, '\n', indentString, true);
    }
    function stringifyProperty(key, value, indentation, indentString, newlines) {
        return (JSON.stringify(key) + ': ' + stringifyValue(value, indentation, indentString, newlines));
    }
    function stringifyValue(value, indentation, indentString, newlines) {
        var type = typeof value;
        if (type === 'boolean' || type === 'number' || type === 'string' || type === null) {
            return JSON.stringify(value);
        }
        else if (Array.isArray(value)) {
            var elements = value.map(function (element) {
                return stringifyValue(element, indentation + indentString, indentString, true);
            });
            if (newlines) {
                return ("[\n".concat(indentation + indentString) +
                    elements.join(",\n".concat(indentation + indentString)) +
                    "\n".concat(indentation, "]"));
            }
            return "[ ".concat(elements.join(', '), " ]");
        }
        else if (type === 'object') {
            var keys = Object.keys(value);
            var properties = keys.map(function (key) {
                return stringifyProperty(key, value[key], indentation + indentString, indentString, newlines);
            });
            if (newlines) {
                return ("{".concat(indentation + indentString) +
                    properties.join(",".concat(indentation + indentString)) +
                    "".concat(indentation, "}"));
            }
            return "{ ".concat(properties.join(', '), " }");
        }
        throw new Error("Cannot stringify ".concat(type));
    }

    function patch(str, value) {
        var indentString = guessIndentString(str);
        var root = parse(str);
        var newlines = (/\n/.test(str.slice(root.start, root.end)) ||
            root.type === 'ArrayExpression' && root.elements.length === 0 ||
            root.type === 'ObjectExpression' && root.properties.length === 0);
        return (str.slice(0, root.start) +
            patchValue(root, value, str, '', indentString, newlines) +
            str.slice(root.end));
    }
    function patchValue(node, value, str, indentation, indentString, newlines) {
        var type = typeof value;
        if (type === 'string') {
            return JSON.stringify(value);
        }
        if (type === 'number') {
            return patchNumber(node.raw, value);
        }
        if (type === 'boolean' || value === null) {
            return String(value);
        }
        if (Array.isArray(value)) {
            if (node.type === 'ArrayExpression') {
                return patchArray(node, value, str, indentation, indentString);
            }
            return stringifyValue(value, indentation, indentString, newlines);
        }
        if (type === 'object') {
            if (node.type === 'ObjectExpression') {
                return patchObject(node, value, str, indentation, indentString);
            }
            return stringifyValue(value, indentation, indentString, newlines);
        }
        throw new Error("Cannot stringify ".concat(type, "s"));
    }
    function patchNumber(raw, value) {
        return String(value);
    }
    function patchArray(node, value, str, indentation, indentString, newlines) {
        if (value.length === 0) {
            return node.elements.length === 0 ? str.slice(node.start, node.end) : '[]';
        }
        var precedingWhitespace = getPrecedingWhitespace(str, node.start);
        var empty = precedingWhitespace === '';
        var newline = empty || /\n/.test(precedingWhitespace);
        if (node.elements.length === 0) {
            return stringifyValue(value, indentation, indentString, newline);
        }
        var i = 0;
        var c = node.start;
        var patched = '';
        var newlinesInsideValue = str.slice(node.start, node.end).split('\n').length > 1;
        for (; i < value.length; i += 1) {
            var element = node.elements[i];
            if (element) {
                patched +=
                    str.slice(c, element.start) +
                        patchValue(element, value[i], str, indentation, indentString, newlinesInsideValue);
                c = element.end;
            }
            else {
                // append new element
                if (newlinesInsideValue) {
                    patched +=
                        ",\n".concat(indentation + indentString) +
                            stringifyValue(value[i], indentation, indentString, true);
                }
                else {
                    patched +=
                        ", " +
                            stringifyValue(value[i], indentation, indentString, false);
                }
            }
        }
        if (i < node.elements.length) {
            c = node.elements[node.elements.length - 1].end;
        }
        patched += str.slice(c, node.end);
        return patched;
    }
    function patchObject(node, value, str, indentation, indentString, newlines) {
        var keys = Object.keys(value);
        if (keys.length === 0) {
            return node.properties.length === 0
                ? str.slice(node.start, node.end)
                : '{}';
        }
        var existingProperties = {};
        node.properties.forEach(function (prop) {
            existingProperties[prop.key.name] = prop;
        });
        var precedingWhitespace = getPrecedingWhitespace(str, node.start);
        var empty = precedingWhitespace === '';
        var newline = empty || /\n/.test(precedingWhitespace);
        if (node.properties.length === 0) {
            return stringifyValue(value, indentation, indentString, newline);
        }
        var i = 0;
        var c = node.start;
        var patched = '';
        var newlinesInsideValue = /\n/.test(str.slice(node.start, node.end));
        var started = false;
        var intro = str.slice(node.start, node.properties[0].start);
        for (; i < node.properties.length; i += 1) {
            var property = node.properties[i];
            var propertyValue = value[property.key.name];
            indentation = getIndentation(str, property.start);
            if (propertyValue !== undefined) {
                patched += started
                    ? str.slice(c, property.value.start)
                    : intro + str.slice(property.key.start, property.value.start);
                patched += patchValue(property.value, propertyValue, str, indentation, indentString, newlinesInsideValue);
                started = true;
            }
            c = property.end;
        }
        // append new properties
        keys.forEach(function (key) {
            if (key in existingProperties)
                return;
            var propertyValue = value[key];
            patched +=
                (started ? ',' + (newlinesInsideValue ? indentation : ' ') : intro) +
                    stringifyProperty(key, propertyValue, indentation, indentString, newlinesInsideValue);
            started = true;
        });
        patched += str.slice(c, node.end);
        return patched;
    }
    function getIndentation(str, i) {
        while (i > 0 && !whitespace.test(str[i - 1]))
            i -= 1;
        var end = i;
        while (i > 0 && whitespace.test(str[i - 1]))
            i -= 1;
        return str.slice(i, end);
    }
    function getPrecedingWhitespace(str, i) {
        var end = i;
        while (i > 0 && whitespace.test(str[i]))
            i -= 1;
        return str.slice(i, end);
    }
    function guessIndentString(str) {
        var lines = str.split('\n');
        var tabs = 0;
        var spaces = 0;
        var minSpaces = 8;
        lines.forEach(function (line) {
            var match = /^(?: +|\t+)/.exec(line);
            if (!match)
                return;
            var whitespace = match[0];
            if (whitespace.length === line.length)
                return;
            if (whitespace[0] === '\t') {
                tabs += 1;
            }
            else {
                spaces += 1;
                if (whitespace.length > 1 && whitespace.length < minSpaces) {
                    minSpaces = whitespace.length;
                }
            }
        });
        if (spaces > tabs) {
            var result = '';
            while (minSpaces--)
                result += ' ';
            return result;
        }
        else {
            return '\t';
        }
    }

    exports.evaluate = evaluate;
    exports.parse = parse;
    exports.patch = patch;
    exports.stringify = stringify;

}));
