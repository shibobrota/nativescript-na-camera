const NACamera = require("nativescript-na-camera");
const observable = require("data/observable");
const gestures = require("ui/gestures");

let cameraPreview, simulatorPreview, capturePreview;
let page, pageData, createPageData = function() {
  return observable.fromObject({
    simulatorImage: "http://i.imgur.com/bSkPf1j.jpg",
    simulatorDebug: true,
    capturePreview: null,
    cameraAvailable: null,
    torchMode: false,
    flashMode: false,
    cameraPosition: null,
    saveToLibrary: false
  });
};

exports.onNavigatingTo = function(args) {
  page = args.object;
  page.bindingContext = pageData = createPageData();
  
  page.backgroundSpanUnderStatusBar = true;
  
  pageData.set("cameraAvailable", NACamera.devicesAvailable());
  pageData.set("cameraPosition", NACamera.getDevicePosition());
  
  cameraPreview = page.getViewById("cameraPreview");
  simulatorPreview = page.getViewById("simulatorPreview");
  capturePreview = page.getViewById("capturePreview");
  
  NACamera.start();
  
  if(page.ios) {
    UIApplication.sharedApplication.setStatusBarStyleAnimated(UIStatusBarStyle.UIStatusBarStyleLightContent, true);
  }
};

exports.capturePhoto = function(args) {
  NACamera.capturePhoto({
    saveToLibrary: pageData.saveToLibrary,
    simulatorDebug: pageData.simulatorDebug,
    simulatorImage: pageData.simulatorDebug ? simulatorPreview : false
  }).then((image, savedToLibrary) => {
    NACamera.stop();
    
    console.log("Photo captured" + (savedToLibrary ? " and saved to library!" : "!"));
    console.log("Photo width/height: " + image.width + "x" + image.height);
    
    pageData.set("capturePreview", image);
    pageData.set("saveToLibrary", !pageData.saveToLibrary ? true : false);
    
    if(page.ios) {
      UIApplication.sharedApplication.setStatusBarHiddenWithAnimation(true, UIStatusBarAnimation.UIStatusBarAnimationSlide);
    }
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