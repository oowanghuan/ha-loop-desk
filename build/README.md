# Build Resources

Place application icons here:

| File | Platform | Size |
|------|----------|------|
| `icon.icns` | macOS | 512x512 or higher |
| `icon.ico` | Windows | 256x256 |
| `icon.png` | Linux | 512x512 |

## Generate icons

You can use tools like:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [iconutil](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html) (macOS)

Example with electron-icon-builder:
```bash
npx electron-icon-builder --input=./source-icon.png --output=./build
```
