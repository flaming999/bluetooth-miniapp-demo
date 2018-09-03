//index.js
//获取应用实例
const app = getApp();
Page({
  data: {
    canIUse: wx.canIUse('web-view')
  },
  onLoad: function () {
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (!app.globalData.webShowed) {
      wx.navigateTo({
        url: '/pages/home/home'
      })
    } else {
      app.globalData.webShowed = false;
      wx.navigateBack({
        delta: 1
      });
    }
  }
})
