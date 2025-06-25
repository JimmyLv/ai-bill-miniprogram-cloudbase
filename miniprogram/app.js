// app.js
App({
  onLaunch: function() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // 请将下面的环境ID替换为您自己的云开发环境ID
        // 可以在微信开发者工具的云开发控制台中找到环境ID
        env: 'cloud1-4g0v6uhy5c7dc674', // 替换为你的云开发环境 ID  
        traceUser: true,
      });
      console.log('云开发初始化成功');
    }

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res);
              }
            }
          });
        }
      }
    });
  },
  
  globalData: {
  }
}); 