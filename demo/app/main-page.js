const NACamera = require("nativescript-na-camera");
const observable = require("data/observable");
const gestures = require("ui/gestures");

let cameraPreview, capturePreview;
let page, pageData, createPageData = () => observable.fromObject({
  capturePreview: null,
  cameraAvailable: null,
  torchMode: false,
  flashMode: false,
  cameraPosition: null,
  saveToLibrary: false
});

exports.onNavigatingTo = function(args) {
  page = args.object;
  page.bindingContext = pageData = createPageData();
  page.backgroundSpanUnderStatusBar = true;
  
  if(page.ios) {
    UIApplication.sharedApplication.setStatusBarStyleAnimated(UIStatusBarStyle.UIStatusBarStyleLightContent, true);
  }
  
  pageData.set("cameraAvailable", NACamera.devicesAvailable());
  pageData.set("cameraPosition", NACamera.getDevicePosition());
  
  cameraPreview = page.getViewById("cameraPreview");
  capturePreview = page.getViewById("capturePreview");
  
  // Request permission to use camera and library, then start the camera.
  Promise.all([NACamera.requestCameraAccess(), NACamera.requestLibraryAccess()])
    .then(() => NACamera.start());
};

exports.capturePhoto = function(args) {
  cameraPreview.capturePhoto({
    saveToLibrary: pageData.saveToLibrary
  }).then((image, savedToLibrary) => {
    NACamera.stop();
    
    console.log("Photo captured" + (savedToLibrary ? " and saved to library!" : "!"));
    console.log("Photo width/height: " + image.width + "x" + image.height);
    
    pageData.set("capturePreview", image);
    pageData.set("saveToLibrary", !pageData.saveToLibrary ? true : false);
  });
};

exports.newPhoto = function(args) {
  NACamera.start();
  
  pageData.capturePreview = null;
  pageData.saveToLibrary = false;
  
  if(page.ios) {
    UIApplication.sharedApplication.setStatusBarHiddenWithAnimation(false, UIStatusBarAnimation.UIStatusBarAnimationSlide);
  }
};

exports.saveToLibrary = function(args) {
  if(pageData.saveToLibrary) {
    pageData.set("saveToLibrary", false);
    NACamera.saveToLibrary(pageData.capturePreview);
    console.log("Photo saved to library!");
  }
};

exports.toggleTorchMode = function(args) {
  pageData.torchMode = NACamera.setTorchMode(!pageData.torchMode ? true : false);
};

exports.toggleFlashMode = function(args) {
  pageData.flashMode = NACamera.setFlashMode(!pageData.flashMode ? true : false);
};

exports.toggleCameraPosition = function(args) {
  NACamera.setDevicePosition(pageData.cameraPosition);
  
  if(NACamera.hasDevicePosition("front") && NACamera.hasDevicePosition("back")) {
    const toggleCameraPosition = page.getViewById("toggleCameraPosition");

    toggleCameraPosition.animate({ rotate: 180, duration: 250 })
      .then(() => toggleCameraPosition.rotate = 0);
    
    pageData.set("cameraPosition", NACamera.getDevicePosition());
  }
};