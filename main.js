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

// Main module for Select Parent/Select Child extension. The main logic is in
// SelectParent.js, which deals with individual editors. The main module glues the 
// functionality into the menus and handles communication with EditorManager. It's
// mainly factored this way for unit testing.

define(function (require, exports, module) {
    "use strict";
    
    var TokenUtils = brackets.getModule("utils/TokenUtils"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        SelectParent = require("SelectParent");
    
    var ID_SELECT_PARENT = "com.notwebsafe.select-parent",
        ID_SELECT_CHILD = "com.notwebsafe.select-child";
    
    var curEditor;

    function withFocusedEditor(func) {
        return function () {
            var editor = EditorManager.getFocusedEditor();
            if (!editor) {
                return;
            }
            func.call(null, editor);
        };
    }

    function updateEditor() {
        if (curEditor) {
            $(curEditor).off("cursorActivity", SelectParent.maybeClearStack);
        }
        curEditor = EditorManager.getFocusedEditor();
        if (curEditor) {
            $(curEditor).on("cursorActivity", SelectParent.maybeClearStack);
        }
        SelectParent.maybeClearStack(true);
    }

    CommandManager.register("Select Parent", ID_SELECT_PARENT, withFocusedEditor(SelectParent.selectParent));
    var selectChildCmd = CommandManager.register("Select Child", ID_SELECT_CHILD, withFocusedEditor(SelectParent.selectChild));
    
    var navigateMenu = Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);
    navigateMenu.addMenuDivider();
    navigateMenu.addMenuItem(ID_SELECT_PARENT, "Ctrl-Shift-,");
    navigateMenu.addMenuItem(ID_SELECT_CHILD, "Ctrl-Shift-.");

    selectChildCmd.setEnabled(false);
    $(SelectParent).on("stackChange", function () {
        selectChildCmd.setEnabled(SelectParent.canSelectChild());
    });
    $(EditorManager).on("focusedEditorChange", updateEditor);
    updateEditor();
});