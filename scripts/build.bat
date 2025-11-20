@echo off
REM Automated build script for Windows

REM Install root dependencies
npm install

REM Build core package
cd packages\core
npm install
npm run build
cd ..\..

REM Build memory adapter
cd packages\adapters\memory
npm install
npm run build
cd ..\..\..

REM Build localStorage adapter
cd packages\adapters\localstorage
npm install
npm run build
cd ..\..\..

REM Build IndexedDB adapter
cd packages\adapters\indexeddb
npm install
npm run build
cd ..\..\..

REM Build FileSystem adapter
cd packages\adapters\filesystem
npm install
npm run build
cd ..\..\..

REM Build validation plugin
cd packages\plugins\validation
npm install
npm run build
cd ..\..\..

REM Build encryption plugin
cd packages\plugins\encryption
npm install
npm run build
cd ..\..\..

REM Build versioning plugin
cd packages\plugins\versioning
npm install
npm run build
cd ..\..\..

REM Install test dependencies
cd tests
npm install
cd ..

echo Build completed successfully! 