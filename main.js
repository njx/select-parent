/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, CodeMirror */

// TODO: doesn't properly balance block if initial selection crosses blocks
// TODO: clear select stack on document switch or selection change
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

    var selectStack = [];
    
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
            origSel = { start: { line: sel.start.line, ch: sel.start.ch }, end: { line: sel.end.line, ch: sel.end.ch } },
            ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.start),
            start, end, nest = 0;
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
        ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.end);
        TokenUtils.moveNextToken(ctx);
        nest = 0;
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
            editor.setSelection(sel.start, sel.end);
        }
    }
    
    CommandManager.register("Select Parent", ID_SELECT_PARENT, handleSelectParent);
    CommandManager.register("Select Child", ID_SELECT_CHILD, handleSelectChild);
    
    var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
    navigateMenu.addMenuDivider();
    navigateMenu.addMenuItem(ID_SELECT_PARENT, "Ctrl-Shift-,");
    navigateMenu.addMenuItem(ID_SELECT_CHILD, "Ctrl-Shift-.");
});