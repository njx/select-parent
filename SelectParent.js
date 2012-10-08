/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";
    
    var TokenUtils = brackets.getModule("utils/TokenUtils");
        
    var selectStack = [], ignoreNextSel = false;
    
    /**
     * Take the given position and return the position immediately before it,
     * or the same position if it's at the beginning of the document.
     */
    function nudgeBackward(editor, pos) {
        if (pos.ch === 0) {
            if (pos.line === 0) {
                return pos;
            } else {
                var prevLineText = editor.document.getLine(pos.line - 1);
                return { line: pos.line - 1, ch: prevLineText.length };
            }
        } else {
            return { line: pos.line, ch: pos.ch - 1 };
        }
    }
    
    /**
     * Take the given position and return the position immediately after it,
     * or the same position if it's at the end of the document.
     */
    function nudgeForward(editor, pos) {
        var thisLineText = editor.document.getLine(pos.line);
        if (pos.ch >= thisLineText.length) {
            // TODO: lineCount() should be in Document
            if (pos.line >= editor.lineCount) {
                return pos;
            } else {
                return { line: pos.line + 1, ch: 0 };
            }
        } else {
            return { line: pos.line, ch: pos.ch + 1 };
        }
    }
    
    function cloneSelection(sel) {
        return { start: { line: sel.start.line, ch: sel.start.ch }, end: { line: sel.end.line, ch: sel.end.ch } };
    }
    
    /**
     * Return the number of unopened close braces and unclosed open braces.
     */
    function numMismatchedBraces(editor, sel) {
        var nest = 0, numUnopenedCloseBraces = 0, ctx;
        sel = cloneSelection(sel);
        
        ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.start);
        while (ctx.pos.line < sel.end.line || (ctx.pos.line === sel.end.line && ctx.pos.ch <= sel.end.ch)) {
            TokenUtils.moveNextToken(ctx);
            if (ctx.token.string === "{") {
                nest++;
            } else if (ctx.token.string === "}") {
                nest--;
                if (nest < 0) {
                    numUnopenedCloseBraces++;
                    nest = 0;
                }
            }
        }
        return { numUnclosedOpenBraces: nest, numUnopenedCloseBraces: numUnopenedCloseBraces };
    }

    function selectParent(editor) {
        var sel = editor.getSelection(),
            origSel = cloneSelection(sel),
            ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.start),
            start,
            end,
            nest,
            braceInfo = numMismatchedBraces(editor, sel);
        
        // Search backward for the next outer open brace, skipping open braces that match end braces
        // in the selection.
        nest = braceInfo.numUnopenedCloseBraces;
        do {
            if (ctx.token.string === "{") {
                if (nest === 0) {
                    start = nudgeBackward(editor, ctx.pos);
                    break;
                } else {
                    nest--;
                }
            } else if (ctx.token.string === "}") {
                nest++;
            }
        } while (TokenUtils.movePrevToken(ctx));
        
        // Search forward for the next outer close brace, skipping close braces that match open braces
        // in the selection.
        ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.end);
        TokenUtils.moveNextToken(ctx);
        nest = braceInfo.numUnclosedOpenBraces;
        do {
            if (ctx.token.string === "}") {
                if (nest === 0) {
                    end = ctx.pos;
                    break;
                } else {
                    nest--;
                }
            } else if (ctx.token.string === "{") {
                nest++;
            }
        } while (TokenUtils.moveNextToken(ctx));
        if (start && end) {
            ignoreNextSel = true;
            selectStack.push({start: origSel.start, end: origSel.end});
            editor.setSelection(start, end);
            $(exports).triggerHandler("stackChange");
        }
    }

    function selectChild(editor) {
        var sel = selectStack.pop();
        if (sel) {
            ignoreNextSel = true;
            editor.setSelection(sel.start, sel.end);
            $(exports).triggerHandler("stackChange");
        }
    }
    
    function canSelectChild() {
        return selectStack.length > 0;
    }
    
    function maybeClearStack(force) {
        // If the current document changed, or if this selection isn't one that came from us,
        // clear the selection stack.
        if (force === true || !ignoreNextSel) {
            selectStack = [];
            $(exports).triggerHandler("stackChange");
        }
        ignoreNextSel = false;
    }
    
    exports.selectParent = selectParent;
    exports.selectChild = selectChild;
    exports.canSelectChild = canSelectChild;
    exports.maybeClearStack = maybeClearStack;
});