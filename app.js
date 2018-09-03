//app.js
App({
  onLaunch: function () {
  },
  onHide: function () {
    this.globalData.webViewShowed = false;
  },
  globalData: {
    webViewShowed: false
  }
})