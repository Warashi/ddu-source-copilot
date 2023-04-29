# ddu-source-copilot

Copilot completion for ddu.vim  
NOTE: It is based on "ddc-source-copilot".  
<https://github.com/Shougo/ddc-source-copilot>

## Required
### copilot.vim
https://github.com/github/copilot.vim

### denops.vim
https://github.com/vim-denops/denops.vim

### ddu.vim
https://github.com/Shougo/ddu.vim

### ddu-kind-word
https://github.com/Shougo/ddu-kind-word

## Configuration
```vim
inoremap <C-x><C-l> <Cmd>:call ddu#start(#{ sources: [#{ name: "copilot", options: #{ defaultAction: "append" }}]})<CR>
```
