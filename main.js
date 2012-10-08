/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, CodeMirror */

// TODO: handle languages other than JS/CSS
// TODO: should scroll to beginning of block?
// TODO: do you expect it to select the function () or other header at the beginning of block?
// TODO: do you want to skip to functions, or any block?

define(function (require, exports, module) {
    "use strict";
    
    var TokenUtils = brackets.getModule("utils/TokenUtils"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus");
    
    var ID_SELECT_PARENT = "com.notwebsafe.select-parent",
        ID_SELECT_CHILD = "com.notwebsafe.select-child";

    var selectStack = [], ignoreNextSel = false, curEditor;
    
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
     * Return the number of end braces minus the number of start braces in the selected text.
     */
    function numExcessEndBraces(editor, sel) {
        var numStartBraces = 0, numEndBraces = 0, ctx;
        sel = cloneSelection(sel);
        
        ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.start);
        while (ctx.pos.line < sel.end.line || (ctx.pos.line === sel.end.line && ctx.pos.ch <= sel.end.ch)) {
            TokenUtils.moveNextToken(ctx);
            if (ctx.token.string === "{") {
                numStartBraces++;
            } else if (ctx.token.string === "}") {
                numEndBraces++;
            }
        }
        return numEndBraces - numStartBraces;
    }
    
    /**
     * Given the current selection in the current editor, find the block immediately surrounding it
     * and set the selection to encompass it.
     */
    function handleSelectParent() {
        var editor = EditorManager.getFocusedEditor();
        if (!editor) {
            return;
        }
        
        var sel = editor.getSelection(),
            origSel = cloneSelection(sel),
            ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.start),
            start, end, 
            nest, braceBalance = numExcessEndBraces(editor, sel);
        
        // Search backward for the next outer brace.
        // If there are more end braces than start braces in the original selection, it's like we started at a deeper nest level.
        nest = (braceBalance > 0 ? braceBalance : 0);
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
        
        // Search forward for the matching brace.
        ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.end);
        TokenUtils.moveNextToken(ctx);
        // If there are more start braces than end braces in the original selection, it's like we started at a deeper nest level.
        nest = (braceBalance < 0 ? -braceBalance : 0);
        do {
            if (ctx.token.string === "}") {
                if (nest === 0) {
                    end = ctx.pos;
                    break;
                }
                else {
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
        }
    }
    
    function handleSelectChild() {
        var editor = EditorManager.getFocusedEditor();
        if (!editor) {
            return;
        }

        var sel;
        if (sel = selectStack.pop()) {
            ignoreNextSel = true;
            editor.setSelection(sel.start, sel.end);
        }
    }
    
    function maybeClearStack(force) {
        // If the current document changed, or if this selection isn't one that came from us,
        // clear the selection stack.
        if (force === true || !ignoreNextSel) {
            selectStack = [];
        }
        ignoreNextSel = false;
    }
    
    function updateEditor() {
        if (curEditor) {
            $(curEditor).off("cursorActivity", maybeClearStack);
        }
        curEditor = EditorManager.getFocusedEditor();
        if (curEditor) {
            $(curEditor).on("cursorActivity", maybeClearStack);
        }
        maybeClearStack(true);
    }
    
    CommandManager.register("Select Parent", ID_SELECT_PARENT, handleSelectParent);
    CommandManager.register("Select Child", ID_SELECT_CHILD, handleSelectChild);
    
    var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
    navigateMenu.addMenuDivider();
    navigateMenu.addMenuItem(ID_SELECT_PARENT, "Ctrl-Shift-,");
    navigateMenu.addMenuItem(ID_SELECT_CHILD, "Ctrl-Shift-.");
    
    $(EditorManager).on("focusedEditorChange", updateEditor);
    updateEditor();
});