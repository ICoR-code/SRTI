
Using "electron-packager" (see package2.json)

> npm start .
	- quick way to launch 'electron' version of GUI project

> npm run start
	- same as "npm start ."

> npm run build
	- compiles Windows version of project in /dist/ folder, uses command in "package.json"





Using "electron-builder" (see package.json)

> npm run dist
	- compile both portable stand-alone and directory .exe files for Windows
	- slow to compile, slow to unpackage when running .exe 
		( > 15 seconds to launch portable .exe, < 2 seconds to launch unpacked .exe)
	- (doesn't always work? try running "> electron-builder" as alternative command)

> npm start .
	- same command as "electron-packager" above