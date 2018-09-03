// pages/bluetooth/bluetooth.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    connectState: 0, //0:设备未连接 1:已启用搜索,正在获取设备 2:获取设备失败 3:正在连接设备 4:连接设备失败 5:正在监听设备
    targetDeviceId: 0, //设备id
    primaryServiceId: 0,
    characterId: 0, //主服务可notify的特征值id
    clickNum: 0//监听到的按钮点击数
  },

  ab2hex: function(buffer) { // ArrayBuffer转16进度字符串示例
    var hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function(bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  },

  connectDevices: function(id) { //连接设备
    const deviceId = id || this.data.targetDeviceId;
    this.setData({
      connectState: 3
    })

    wx.createBLEConnection({
      deviceId: deviceId,
      timeout: 30000,
      success: (res) => {
        if (res.errMsg === 'createBLEConnection:ok') {
          console.log('连接设备成功:', res);

          wx.getBLEDeviceServices({
            deviceId: deviceId,
            success: (res) => {
              console.log('device services:', res);
              const services = res.services;
              const len = services.length;
              for (let i = 0; i < len; i++) {
                const service = services[i];
                if (service.isPrimary) {
                  console.log('主服务为:', service);
                  const uuid = service.uuid;
                  this.setData({
                    primaryServiceId: uuid
                  });

                  wx.getBLEDeviceCharacteristics({
                    deviceId: deviceId,
                    serviceId: uuid,
                    success: (res) => {
                      console.log('获取服务特征值列表:', res.characteristics);
                      const characteristics = res.characteristics;
                      const len = characteristics.length;
                      for (let i = 0; i < len; i++) {
                        const character = characteristics[i];
                        if (character.properties.notify) { //这里只获取了第一个notify为true的特征值uuid
                          const id = character.uuid
                          this.setData({
                            characterId: id
                          });

                          wx.notifyBLECharacteristicValueChange({
                            state: true, // 启用 notify 功能
                            // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接  
                            deviceId: this.data.targetDeviceId,
                            // 这里的 serviceId 需要在上面的 getBLEDeviceServices 接口中获取
                            serviceId: this.data.primaryServiceId,
                            // 这里的 characteristicId 需要在上面的 getBLEDeviceCharacteristics 接口中获取
                            characteristicId: id,
                            success: (res) => {
                              console.log('启用notify功能success', res.errMsg);

                              wx.onBLECharacteristicValueChange((res) => {
                                console.log('接收到设备信息为:', res);
                                const {
                                  targetDeviceId,
                                  primaryServiceId,
                                  characterId
                                } = this.data;
                                if (res.deviceId === targetDeviceId && res.serviceId === primaryServiceId && res.characteristicId === characterId) {
                                  console.log('接收到的特征值为:', this.ab2hex(res.value));
                                  this.setData({
                                    clickNum: this.data.clickNum + 1
                                  });
                                }
                              });

                              this.setData({
                                connectState: 5
                              });
                            },
                            fail: () => {
                              console.log('启用notify功能失败');
                            }
                          })
                          break;
                        }
                      }
                    },
                    fail: () => {
                      console.log('获取主服务特征值列表失败');
                    }
                  })
                  break;
                }
              }
            },
            fail: () => {
              console.log('获取设备服务失败');
            }
          });

          wx.stopBluetoothDevicesDiscovery({ //连接成功后取消搜寻设备
            success: (res) => {
              console.log('连接成功后取消搜寻设备', res)
            }
          });
        }

        // wx.onBLEConnectionStateChange(function (res) {//监听设备连接状态
        //   // 该方法回调中可以用于处理连接意外断开等异常情况
        //   console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
        // })
      },
      fail: () => {
        console.log('连接设备失败');
        this.setData({
          connectState: 4
        })
      }
    })
  },

  getDevices: function() { //获取设备
    this.setData({
      connectState: 1
    })
    wx.getBluetoothDevices({ //获取所有设备 包括已连接设备
      success: (res) => {
        console.log('Devices:', res);
        const devices = res.devices;
        const len = devices.length;
        if (devices && len) {
          for (let i = 0; i < len; i++) {
            const device = devices[i];

            if (device.name.indexOf('MS1793') > -1) {
              console.log('找到目标设备:', device);
              const id = device.deviceId;
              this.setData({
                targetDeviceId: id
              });
              this.connectDevices(id)
              return;
            }
            if (i === len - 1) {
              this.setData({
                connectState: 2
              })
            }
          }
        } else {
          this.setData({
            connectState: 2
          })
        }
      },
      fail: () => {
        this.setData({
          connectState: 2
        })
      }
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    /**Bluetooth test */
    if (wx.openBluetoothAdapter) {
      wx.openBluetoothAdapter({ //开启蓝牙适配器
        success: (res) => {
          console.log('openBluetoothAdapter success:', res)

          wx.getBluetoothAdapterState({ //获取蓝牙适配器状态
            success: (res) => {
              console.log('getBluetoothAdapterState', res.available)
              if (res.available) {
                setTimeout(() => {
                  wx.startBluetoothDevicesDiscovery({ //开始搜索设备
                    success: (res) => {
                      console.log('search success:', res);

                      this.setData({
                        connectState: 1
                      })

                      setTimeout(() => {
                        this.getDevices();
                      }, 3000);
                      // wx.onBluetoothDeviceFound(function (devices) {//监听寻找到新设备的事件
                      //   console.log('new device list has founded:', devices)
                      // })
                      // wx.stopBluetoothDevicesDiscovery({
                      //   success: function (res) {
                      //     console.log('stop search success:',res)
                      //   },
                      //   fail: function () {
                      //     console.log('stop search fail');
                      //   }
                      // })
                    },
                    fail: function() {
                      console.log('search fail');
                      wx.showModal({
                        title: '提示',
                        content: '搜寻蓝牙设备失败'
                      })
                    }
                  })
                }, 3000);
              }
            }
          })

        },
        fail: (err) => {
          console.log('openBluetoothAdapter fail:', err);
          wx.showModal({
            title: '提示',
            content: '当前蓝牙适配器不可用'
          })
        }
      })
    } else {
      // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
      })
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  }
})