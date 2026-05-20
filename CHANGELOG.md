# Changelog

## [0.5.0](https://github.com/wshmkr/astral-terminal/compare/v0.4.0...v0.5.0) (2026-05-19)


### Features

* add browser surface with WebContentsView portal ([#33](https://github.com/wshmkr/astral-terminal/issues/33)) ([9db7dbe](https://github.com/wshmkr/astral-terminal/commit/9db7dbe136f1f71df45d83d3bdd043b75517a305))
* dim everything behind the settings window ([#60](https://github.com/wshmkr/astral-terminal/issues/60)) ([ea6d315](https://github.com/wshmkr/astral-terminal/commit/ea6d315e6f2e739020674551601f24acfd32fc63))
* expand theme catalog ([#54](https://github.com/wshmkr/astral-terminal/issues/54)) ([8dc8d29](https://github.com/wshmkr/astral-terminal/commit/8dc8d29d384e46a9e719b9bb02894d1089ba47df))
* fade settings window and dim in/out ([#61](https://github.com/wshmkr/astral-terminal/issues/61)) ([9e0c0bc](https://github.com/wshmkr/astral-terminal/commit/9e0c0bccc62d33cd944cbe1ec22c7632961f0599))
* fall back to Google search in browser URL bar ([#52](https://github.com/wshmkr/astral-terminal/issues/52)) ([5e914ac](https://github.com/wshmkr/astral-terminal/commit/5e914ac82d1ac21576ed44a089077c01b3027cb7))
* notifications popover in a frameless window ([#53](https://github.com/wshmkr/astral-terminal/issues/53)) ([a017348](https://github.com/wshmkr/astral-terminal/commit/a017348446a95974bf3800cab9327d66e3a43ef5))
* route popup and terminal links into the in-app browser ([#50](https://github.com/wshmkr/astral-terminal/issues/50)) ([6b0cd61](https://github.com/wshmkr/astral-terminal/commit/6b0cd619a2e4d640ba193163d5cf0a8065308ce9))
* settings dialog in a frameless window ([#59](https://github.com/wshmkr/astral-terminal/issues/59)) ([0a82568](https://github.com/wshmkr/astral-terminal/commit/0a82568b67aa058a362f929a22471b0dbffcb722))
* tie browser surface to terminal theme ([#51](https://github.com/wshmkr/astral-terminal/issues/51)) ([8dab0fa](https://github.com/wshmkr/astral-terminal/commit/8dab0fa9e70c2fd2d53f2d3b5dc89556dc78bdbd))
* WSL distro picker ([#63](https://github.com/wshmkr/astral-terminal/issues/63)) ([145ee45](https://github.com/wshmkr/astral-terminal/commit/145ee45fe12a814723ae1f2be3cc5ea0be5ba9ae))


### Bug Fixes

* keep titlebar lit when browser surface holds focus ([#55](https://github.com/wshmkr/astral-terminal/issues/55)) ([f619111](https://github.com/wshmkr/astral-terminal/commit/f619111b96b398eff7f810a1f46f441b484bc237))
* scale browser overlay offsets by ui zoom ([#62](https://github.com/wshmkr/astral-terminal/issues/62)) ([f77fea6](https://github.com/wshmkr/astral-terminal/commit/f77fea654639e98bde07ebff166dad86dd705505))


### Performance

* speed up cold start with many surfaces ([#28](https://github.com/wshmkr/astral-terminal/issues/28)) ([b20c4b2](https://github.com/wshmkr/astral-terminal/commit/b20c4b2eafc2837fd4dc3a7f3ed02cd4474b000d))

## [0.4.0](https://github.com/wshmkr/astral-terminal/compare/v0.3.0...v0.4.0) (2026-05-13)


### Features

* auto-updates ([#45](https://github.com/wshmkr/astral-terminal/issues/45)) ([5c8a405](https://github.com/wshmkr/astral-terminal/commit/5c8a405db7c5f5a0ee70e64079dcfb231371e74b))


### Bug Fixes

* route hook OSC output through claude's tty by $PPID ([#44](https://github.com/wshmkr/astral-terminal/issues/44)) ([d65fed1](https://github.com/wshmkr/astral-terminal/commit/d65fed114e6efeaaef6166bb18e665c3a853693d))

## [0.3.0](https://github.com/wshmkr/astral-terminal/compare/v0.2.1...v0.3.0) (2026-05-08)


### Features

* add first-run welcome splash ([#20](https://github.com/wshmkr/astral-terminal/issues/20)) ([621a78f](https://github.com/wshmkr/astral-terminal/commit/621a78fb41a743ed6f31af68a6591df9928332e2))
* drag tabs across panes while keeping terminals alive ([#26](https://github.com/wshmkr/astral-terminal/issues/26)) ([b4bc211](https://github.com/wshmkr/astral-terminal/commit/b4bc2114364c09259d9a3ac44f7a7e1db8d67bf1))
* drag to reorder tabs within a pane ([#27](https://github.com/wshmkr/astral-terminal/issues/27)) ([de0d1c0](https://github.com/wshmkr/astral-terminal/commit/de0d1c09079b8ceb2755aa59154e8d4a76b9c17a))
* drag to reorder workspaces in the sidebar ([#25](https://github.com/wshmkr/astral-terminal/issues/25)) ([84f039c](https://github.com/wshmkr/astral-terminal/commit/84f039c051e8db6fbec7e6e3a9052b9f605d16ab))
* drag-and-drop file paths and text into terminal ([#38](https://github.com/wshmkr/astral-terminal/issues/38)) ([b2a483a](https://github.com/wshmkr/astral-terminal/commit/b2a483afe37e805f73c31b5aea84bdaadaec85a4))
* highlight panes and sidebar previews with unread activity ([#19](https://github.com/wshmkr/astral-terminal/issues/19)) ([c209906](https://github.com/wshmkr/astral-terminal/commit/c209906746e7d0251c6dc76afe168b02ebbe8a0d))
* let users pick the app accent color ([#32](https://github.com/wshmkr/astral-terminal/issues/32)) ([e662b87](https://github.com/wshmkr/astral-terminal/commit/e662b876cd959a0f2dab4444e582ba8a15be8917))
* persist window size and position across restarts ([#31](https://github.com/wshmkr/astral-terminal/issues/31)) ([25b79f1](https://github.com/wshmkr/astral-terminal/commit/25b79f1198721b5f86c7abe9f5072f581bb230f3))
* show app version in settings dialog ([#24](https://github.com/wshmkr/astral-terminal/issues/24)) ([71c14ac](https://github.com/wshmkr/astral-terminal/commit/71c14acea884ded09640364d7ae8d64d20d1a55d))


### Bug Fixes

* clear pane attention outline when clicking the terminal area ([#39](https://github.com/wshmkr/astral-terminal/issues/39)) ([10149cb](https://github.com/wshmkr/astral-terminal/commit/10149cbe1a03c47287426929a784d80457c6db33))
* dark native theme to hide maximized white edge sliver ([#36](https://github.com/wshmkr/astral-terminal/issues/36)) ([d045732](https://github.com/wshmkr/astral-terminal/commit/d0457328534a2e9c65f3b59eef708dbf5b9bf1b8))
* keep agent-session cwd at launch dir so resume works ([#41](https://github.com/wshmkr/astral-terminal/issues/41)) ([f9c1932](https://github.com/wshmkr/astral-terminal/commit/f9c1932eb050d618f520177ed2ad6f7d8e48230c))
* preserve Claude session cwd across worktree changes ([#29](https://github.com/wshmkr/astral-terminal/issues/29)) ([6b4142c](https://github.com/wshmkr/astral-terminal/commit/6b4142c8e4d94d4764592ff45cb23aa6c88acfa3))
* propagate Claude worktree cwd to renderer surface ([#35](https://github.com/wshmkr/astral-terminal/issues/35)) ([b49136e](https://github.com/wshmkr/astral-terminal/commit/b49136e2e0648fa08c9dca23b003eeb079c1b063))

## [0.2.1](https://github.com/wshmkr/astral-terminal/compare/v0.2.0...v0.2.1) (2026-04-27)


### Bug Fixes

* upload release assets to existing GitHub release ([#21](https://github.com/wshmkr/astral-terminal/issues/21)) ([e787a54](https://github.com/wshmkr/astral-terminal/commit/e787a542f82fcaf269e443e1010daac7691a6dda))

## [0.2.0](https://github.com/wshmkr/astral-terminal/compare/v0.1.0...v0.2.0) (2026-04-26)


### Features

* add find bar to terminal ([#3](https://github.com/wshmkr/astral-terminal/issues/3)) ([15a1008](https://github.com/wshmkr/astral-terminal/commit/15a10080b73638453ef557b5fbe157bcaf49e567))
* add settings dialog ([#7](https://github.com/wshmkr/astral-terminal/issues/7)) ([9e0994d](https://github.com/wshmkr/astral-terminal/commit/9e0994de48de89f42bcab105c3e5b21e57ffa20a))
* enforce single-instance lock ([#4](https://github.com/wshmkr/astral-terminal/issues/4)) ([25d0a3b](https://github.com/wshmkr/astral-terminal/commit/25d0a3b830facfd8753e1f79016d419243a1ea09))
* isolate dev instance from installed build ([#17](https://github.com/wshmkr/astral-terminal/issues/17)) ([64fd630](https://github.com/wshmkr/astral-terminal/commit/64fd63078c16613ac0b9a74d130c222490123058))
* resume Claude Code sessions on app restart ([#15](https://github.com/wshmkr/astral-terminal/issues/15)) ([c8093ec](https://github.com/wshmkr/astral-terminal/commit/c8093ec911bd2890206d753a4582edd0f5afc04a))


### Bug Fixes

* align pty and xterm dimensions around scrollback replay ([#16](https://github.com/wshmkr/astral-terminal/issues/16)) ([dc5f204](https://github.com/wshmkr/astral-terminal/commit/dc5f204b72c6d22a642b7c4a2b6dea4e44b80ba8))
* **ci:** correct release-please tag format and bootstrap-sha placement ([#11](https://github.com/wshmkr/astral-terminal/issues/11)) ([40b23d5](https://github.com/wshmkr/astral-terminal/commit/40b23d57cb01744e86675b3c4d80282044a8fe8d))
* handle Squirrel startup events to create shortcuts and exit fast ([#2](https://github.com/wshmkr/astral-terminal/issues/2)) ([5b01375](https://github.com/wshmkr/astral-terminal/commit/5b01375be8fb813e2d45c7430b6937e151eca5b6))
* ignore ConPTY-seeded .exe path as terminal title ([#1](https://github.com/wshmkr/astral-terminal/issues/1)) ([c7f6d35](https://github.com/wshmkr/astral-terminal/commit/c7f6d35cd6a2d3d397f04378d0af3c59c3e3f4aa))
* route clipboard paste through xterm.js ([#18](https://github.com/wshmkr/astral-terminal/issues/18)) ([2844692](https://github.com/wshmkr/astral-terminal/commit/2844692fb0cc28bf6cd90fbd795c3747ed15b1f0))
