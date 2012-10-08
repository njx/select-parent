/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, CodeMirror */

define(function (require, exports, module) {
    "use strict";
    
    var TokenUtils = brackets.getModule("utils/TokenUtils"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus");
    
    var ID_SELECT_PARENT = "com.notwebsafe.select-parent",
        ID_SELECT_CHILD = "com.notwebsafe.select-child";

    var selectStack;
    
    // TODO: handle languages other than JS/CSS
    
    function handleSelectParent() {
        var editor = EditorManager.getFocusedEditor();
        if (!editor) {
            return;
        }
        
        // BUG: doesn't skip over blocks when moving forward/backward
        // BUG: should scroll to beginning of block?
        // TODO: do you expect it to select the function () or other header at the beginning of block?
        // TODO: do you want to skip to functions, or any block?
        var sel = editor.getSelection(),
            ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.start),
            start, end, nest = 0;
        do {
            if (ctx.token.string === "{") {
                if (nest === 0) {
                    TokenUtils.movePrevToken(ctx);
                    start = ctx.pos;
                    break;
                } else {
                    nest--;
                }
            } else if (ctx.token.string === "}") {
                nest++;
            }
        } while (TokenUtils.movePrevToken(ctx));
        ctx = TokenUtils.getInitialContext(editor._codeMirror, sel.end);
        nest = 0;
        do {
            if (ctx.token.string === "}") {
                if (nest === 0) {
                    TokenUtils.moveNextToken(ctx);
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
            editor.setSelection(start, end);
        }
    }
    
    function handleSelectChild() {
    }
    
    CommandManager.register("Select Parent", ID_SELECT_PARENT, handleSelectParent);
    CommandManager.register("Select Child", ID_SELECT_CHILD, handleSelectChild);
    
    var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
    navigateMenu.addMenuDivider();
    navigateMenu.addMenuItem(ID_SELECT_PARENT, "Ctrl-Shift-,");
    navigateMenu.addMenuItem(ID_SELECT_CHILD, "Ctrl-Shift-.");
});