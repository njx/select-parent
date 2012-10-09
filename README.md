A simple [Brackets](https://github.com/adobe/brackets) extension that lets you quickly select the 
parent block of the current selection.

Use **Cmd/Ctrl-<** (Cmd/Ctrl-Shift-,) to select the parent block. You can keep hitting the same key
to go outward to larger scopes. If you go too far, you can use **Cmd/Ctrl->** (Cmd/Ctrl-Shift-.) to
go back down to the children that were previously selected. These are also available from
*Navigate > Select Parent* and *Navigate > Select Child.*

This also makes it easy to jump to the open or close brace of the surrounding block--do
Cmd/Ctrl-< to select the block, then hit the left arrow to go to the open brace, or right arrow
to go to the close brace.

Only works for brace-oriented files right now (e.g. JS, CSS, LESS/SASS, etc.). Will likely do
something nonsensical in other kinds of files.

TODO:
* handle languages other than JS/CSS
* add Closure comments
* should scroll to beginning of block?
* do you expect it to select the function () or other header at the beginning of block?
* do you want a way to jump all the way up to the enclosing function, not just any block?