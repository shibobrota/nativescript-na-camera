# NativeScript NA Camera plugin

<img src="/docs/img/screenshot-ios.png" width="188" alt="Demo screenshot (iOS)" title="Demo screenshot (iOS)" />

**NOTE! Android is currently not supported.**

A NativeScript camera that utilizes *AVFoundation* for iOS.

## Installation

**Prerequisites:** TNS 3.0.0+

`$ tns plugin add nativescript-na-camera`

## Usage

**XML**

```xml
<Page navigatingTo="onNavigatingTo" xmlns:NACamera="nativescript-na-camera">
  <StackLayout>
    <NACamera:Camera id="cameraView" />
    <Button text="Capture" id="capturePhoto" tap="capturePhoto" />
    <Button text="New photo" id="newPhoto" tap="newPhoto" />
  </StackLayout>
</Page>
```

**JS**

```js
const NACamera = require("nativescript-na-camera");

let cameraView;
let page;

exports.onNavigatingTo = function(args) {
  page = args.object;

  cameraView = page.getViewById("cameraView");
  
  // Ask the user for access to camera and library.
  Promise.all([NACamera.requestCameraAccess(), NACamera.requestLibraryAccess()])
    .then(() => NACamera.start());
};

exports.capturePhoto = function(args) {
  cameraView.capturePhoto({
    saveToLibrary: true
  }).then((image, savedToLibrary) => {
    NACamera.stop();
    if(savedToLibrary) console.log("Photo was saved to library!");
    // Do something more...
  }, error => {
    console.error(error);
  });
};

exports.newPhoto = function(args) {
  NACamera.start();
};
```

**Note!** `NACamera.start()` must be fired to initiate the camera view. It is recommended to stop the camera once the view is out of screen using `NACamera.stop()`.

### Classes

#### Camera

The camera view (preview layer)

```js
const NACamera = require("nativescript-na-camera");
cameraView = new NACamera.Camera();
```

```xml
<Page navigatingTo="onNavigatingTo" xmlns:NACamera="nativescript-na-camera">
  <NACamera:Camera id="cameraView" />
</Page>
```

##### Methods

`Camera.capturePhoto(props)`

To capture a photo.

*The resolution of captured photo is the proportion of the camera view.*

- **props** - Set any capture properties (optional).
  - **saveToLibrary** - Saves the photo to the library upon capture (defaults to `false`).
  - **mirrorCorrection** - Correct mirroring when capturing with the front camera (defaults to `true`).
  - **playSound** - Plays a capture sound (defaults to `true`).
- Returns a promise:
  - **then**
    - **image** - The captured photo as an image source.
    - **savedToLibrary** - Reference to `props.saveToLibrary` which is either `true` or `false`.
  - **catch**
    - **error** - The error message.

```js
NACamera.capturePhoto({
  saveToLibrary: true
}).then((image, savedToLibrary) => {
  NACamera.stop();
  if(savedToLibrary) console.log("Photo was saved to library!");
  // Do something more...
}, error => {
  console.error(error);
});
```

### Functions

#### saveToLibrary()

Save an image to the library.

`saveToLibrary(image)`

* **image** - The image source that should be saved to the library.
* Returns `true`.

```js
NACamera.saveToLibrary(image);
```

------

#### setTorchMode()

Set the torch mode (if available).

`setTorchMode(condition)`

- **condition** - Boolean value.
- Returns `true` or `false` depending on availability.

```js
NACamera.setTorchMode(true); // Torch on
NACamera.setTorchMode(false); // Torch off
```

------

#### setFlashMode()

Set the flash mode (if available).

`setFlashMode(condition)`

- **condition** - Boolean value.
- Returns `true` or `false` depending on availability.

```js
NACamera.setFlashMode(true); // Flash on
NACamera.setFlashMode(false); // Flash off
```

------

#### setDevicePosition()

Set the camera device position (back or front camera, if available).

`setDevicePosition(position)`

- **position** - String value. Must be either `"back"` or `"front"`.
- Returns `true` or `false` depending on availability.

```js
NACamera.setDevicePosition("back"); // Back camera
NACamera.setDevicePosition("front"); // Front camera
```

------

#### hasDevicePosition()

Check if a camera device position is available.

`hasDevicePosition(position)`

- **position** - String value. Must be either `"back"` or `"front"`.
- Returns `true` or `false` depending on availability.

```js
const hasBackCamera = NACamera.hasDevicePosition("back");
const hasFrontCamera = NACamera.hasDevicePosition("front");
```

------

#### Other methods

- `requestCameraAccess()` - Ask for permission to access the camera.
  - Returns `promise`
- `requestLibraryAccess()` - Ask for permission to access the library.
  - Returns `promise`
- `start()` - Start the camera session.
  - Returns `boolean`
- `stop()` - Stop the camera session.
  - Returns `boolean`
- `devicesAvailable()` - Check if any camera is available.
  - Returns `boolean`
- `getTorchMode()` - Get the current torch mode.
  - Returns `boolean`
- `hasTorchMode()` - Check if the camera's current device position has a torch available.
  - Returns `boolean`
- `getFlashMode()` - Get the current flash mode.
  - Returns `boolean`
- `hasFlashMode()` - Check if the camera's current device position has a flash available.
  - Returns `boolean`
- `getDevicePosition()` - Check if the camera's current device position is either back or front.
  - Returns `"back"` or `"front"`

## Known issues

- No Android compatibility, yet.

## To-do list

- Video recording

Please post an issue if you have any other ideas!

## History

#### Version 2.0.0 (April #, 2017)

- This plugin now requires TNS 3.0.0+.
- Shutter sound now works.
- Fixed bug that stretched captured photos at specific aspect ratios.
- Fxied device orientation issue.
- `capturePhoto()` method is now an instance method of `NACamera.Camera`;
- Two new functions; `requestCameraAccess` & `requestLibraryAccess`. These can be used before starting a camera view, or saving to library, to make sure a user has granted permission.
- Documentation changes.

#### Version 1.2.1 (November 21, 2016)

- This plugin now requires TNS 2.4.0+

#### Version 1.2.0 (November 21, 2016)

- Pinch-to-zoom feature
- Tap-to-focus feature
- Added mirror correction property when capturing with the front camera (See `capturePhoto()` documentation).

#### Version 1.0.0 (November 10, 2016)

- First release!

## Credits

- [NordlingArt](https://github.com/NordlingArt)

## License

[MIT](/LICENSE) - for {N} version 3.0.0+