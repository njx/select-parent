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

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, describe, it, xit, expect, beforeEach, afterEach, waitsFor, runs, $, brackets, waitsForDone */

define(function (require, exports, module) {
    "use strict";

    var SpecRunnerUtils = brackets.getModule("spec/SpecRunnerUtils"),
        Editor = brackets.getModule("editor/Editor").Editor,
        SelectParent = require("SelectParent");
    
    describe("Select Parent or Child", function () {

        //                              1         2         3         4
        //                    01234567890123456789012345678901234567890
        var defaultContent = "function () {\n" +
                             "    if (nest1) {\n" +
                             "        if (nest2) {\n" +
                             "             var x = { foo: 'bar' }; /*{*/ // }{\n" +
                             "        } else {\n" +
                             "             var y = { baz: 'boo' };\n" +
                             "        }\n" +
                             "    }\n" +
                             "}";
        
        var testWindow;
        var testDocument, testEditor;
        
        beforeEach(function () {
            // create dummy Document for the Editor
            testDocument = SpecRunnerUtils.createMockDocument(defaultContent);
            
            // create Editor instance (containing a CodeMirror instance)
            $("body").append("<div id='editor'/>");
            testEditor = new Editor(testDocument, true, $("#editor").get(0));
        });
        
        afterEach(function () {
            testEditor.destroy();
            testEditor = null;
            $("#editor").remove();
            testDocument = null;
            SelectParent.maybeClearStack(true);
        });
        
        it("should expand once within innermost block", function () {
            testEditor.setCursorPos(3, 23); // before "foo:"
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 3, ch: 21 }, end: { line: 3, ch: 35 } }); // x obj
        });
        
        it("should return to original selection after one expand", function () {
            testEditor.setCursorPos(3, 23); // before "foo:"
            SelectParent.selectParent(testEditor);
            SelectParent.selectChild(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 3, ch: 23 }, end: { line: 3, ch: 23 } });
        });
        
        it("should expand twice from within innermost block", function () {
            testEditor.setCursorPos(3, 23); // before "foo:"
            SelectParent.selectParent(testEditor);
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 2, ch: 19 }, end: { line: 4, ch: 9 } }); // nest2 block          
        });

        it("should contract twice after two expands", function () {
            testEditor.setCursorPos(3, 23); // before "foo:"
            SelectParent.selectParent(testEditor);
            SelectParent.selectParent(testEditor);
            SelectParent.selectChild(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 3, ch: 21 }, end: { line: 3, ch: 35 } }); // x obj

            SelectParent.selectChild(testEditor);
            result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 3, ch: 23 }, end: { line: 3, ch: 23 } });
        });
        
        it("should expand from before innermost block", function () {
            testEditor.setCursorPos(3, 17); // before "x"
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 2, ch: 19 }, end: { line: 4, ch: 9 } }); // nest2 block                    
        });
        
        it("should expand from after innermost block", function () {
            testEditor.setCursorPos(3, 35); // after x object close brace
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 2, ch: 19 }, end: { line: 4, ch: 9 } }); // nest2 block                    
        });
        
        it("should balance properly when selection contains equal but unbalanced braces", function () {
            testEditor.setSelection({ line: 4, ch: 8 }, { line: 4, ch: 16 }); // around "} else {"
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 1, ch: 15 }, end: { line: 7, ch: 5 } }); // nest1 block                                
        });

        it("should balance properly when selection contains extra start brace", function () {
            testEditor.setSelection({ line: 3, ch: 13 }, { line: 3, ch: 26 }); // around start of x obj
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 2, ch: 19 }, end: { line: 4, ch: 9 } }); // nest2 block                                
        });

        it("should balance properly when selection contains extra end brace", function () {
            testEditor.setSelection({ line: 3, ch: 23 }, { line: 3, ch: 36 }); // around end of x obj
            SelectParent.selectParent(testEditor);
            var result = testEditor.getSelection();
            expect(result).toEqual({ start: { line: 2, ch: 19 }, end: { line: 4, ch: 9 } }); // nest2 block                                
        });
        
        it("should not select child after stack is cleared", function () {
            testEditor.setCursorPos(3, 23); // before "foo:"
            SelectParent.selectParent(testEditor);
            var parentSel = testEditor.getSelection();
            expect(SelectParent.canSelectChild()).toBe(true);
            SelectParent.maybeClearStack(true);
            expect(SelectParent.canSelectChild()).toBe(false);
            SelectParent.selectChild(testEditor); // should be a no op
            var result = testEditor.getSelection();
            expect(result).toEqual(parentSel);
        });
    });
});