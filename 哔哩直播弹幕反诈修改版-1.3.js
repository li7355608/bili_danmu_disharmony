// ==UserScript==
// @name         [哔哩哔哩直播]---弹幕反诈与防河蟹
// @version      1.3
// @description  本脚本会提示你在直播间发送的弹幕是否被秒删，被什么秒删，有助于用户规避河蟹词，避免看似发了弹幕结果主播根本看不到，不被发送成功的谎言所欺骗！
// @author       Asuna
// @icon         https://www.bilibili.com/favicon.ico
// @license      GPL 3.0
// @match        https://live.bilibili.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @namespace https://greasyfork.org/users/1390050
// @downloadURL https://update.greasyfork.org/scripts/516801/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E7%9B%B4%E6%92%AD%E5%BC%B9%E5%B9%95%E5%8F%8D%E8%AF%88%E4%BF%AE%E6%94%B9%E7%89%88.user.js
// @updateURL https://update.greasyfork.org/scripts/516801/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9%E7%9B%B4%E6%92%AD%E5%BC%B9%E5%B9%95%E5%8F%8D%E8%AF%88%E4%BF%AE%E6%94%B9%E7%89%88.meta.js
// ==/UserScript==

(function() {
    'use strict';

    //系统过滤器权限高于主播，出现关键词后系统会优先删除你的弹幕，其次才是主播

    //脚本加载消息计时器
    const msg_time = 7000

    //弹幕同屏发送次数，默认为1
    const exp = 1

    //不同对象屏蔽后显示的弹幕颜色，支持英文和16进制颜色编码
    const ban_color_system = "#90EE90"
    const ban_color_user = "deepskyblue"
    const success_color = "DarkCyan"
    const error_color = "Crimson"

    //此处调整弹幕滚动速度
    const speed = 0.1

    // 默认固定从左侧开始滚动的位置
    const dm_left = '-16%'

    //弹幕距离顶部的位置，如果想要随机可以替换为：`${Math.random() * 100}%`
    const dm_top = '50%'

    //弹幕字号
    const dm_fontSize = '36px'

    //发送成功的回调开关，如不需要启用则填写false
    const success_send = true

    //弹幕内容
    const ban_system_msg = "发送失败：你的弹幕被系统秒删，修改关键词后重新发吧"
    const ban_user_msg = "发送失败：你的弹幕被主播删除，看来主播不喜欢某些关键词"
    const success_load_msg = "弹幕反诈与防河蟹脚本加载完毕！"
    const success_msg = "恭喜，你的弹幕正常显示！"
    const error_msg = "[弹幕反诈] use window mode (your userscript extensions not support unsafeWindow)"
    const error_send_msg = "发送失败：捕获到的未知错误，详情请检查控制台输出日志！"


    let windowCtx = self.window;
    if (self.unsafeWindow) {
        console.log("[弹幕反诈] use unsafeWindow mode");
        setTimeout(() => {
           showFloatingMessage(success_load_msg, success_color);
        }, msg_time);
        windowCtx = self.unsafeWindow;
    } else {
        console.log("[弹幕反诈] use window mode (your userscript extensions not support unsafeWindow)");
        setTimeout(() => {
           showFloatingMessage(error_msg, error_color);
        }, msg_time);
    }

    function checkSendDm(url) {
        return url.indexOf('api.live.bilibili.com/msg/send') > -1;
    }

    function showFloatingMessage(message, color) {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.position = 'fixed';
        div.style.top = dm_top;
        div.style.left = dm_left;
        div.style.color = color;
        div.style.fontSize = dm_fontSize;
        div.style.zIndex = '9999';
        div.style.whiteSpace = 'nowrap';
        document.body.appendChild(div);

        function animate() {
            let left = parseFloat(div.style.left);
            if (left > 100) {
                div.remove();
                return;
            }
            div.style.left = `${left + speed}%`;
            requestAnimationFrame(animate);
        }
        animate();

        setTimeout(() => {
            div.remove();
        }, 10000);
    }

    const originFetchBLDMAF = windowCtx.fetch;
    windowCtx.fetch = (...arg) => {
        let arg0 = arg[0];
        let url = "";
        switch (typeof arg0) {
            case "object":
                url = arg0.url;
                break;
            case "string":
                url = arg0;
                break;
            default:
                break;
        }

        if (checkSendDm(url)) {
            return new Promise((resolve, reject) => {
                originFetchBLDMAF(...arg).then(r => {
                    r.json().then(data => {
                        if (data.code === 0 && data.msg === "f") {
                            for(let i = 0; i< exp; i++){
                                showFloatingMessage(ban_system_msg, ban_color_system);
                            }
                            data.code = -101;
                            data.message = "你的弹幕没发出去，你被骗了，系统干的";
                            data.ttl = 1;
                            delete data.msg;
                            delete data.data;
                        } else if (data.code === 0 && data.msg === "k") {
                            for(let i = 0; i< exp; i++){
                                showFloatingMessage(ban_user_msg, ban_color_user);
                            }
                            data.code = -101;
                            data.message = "你的弹幕没发出去，你被骗了，主播干的";
                            data.ttl = 1;
                            delete data.msg;
                            delete data.data;
                        }else{
                            console.log("恭喜，您的弹幕正常显示！")
                            if(success_send === true){
                                showFloatingMessage(success_msg, success_color);
                            }
                        }
                        let body = JSON.stringify(data);
                        let newRes = new Response(body, {
                            status: r.status,
                            statusText: r.statusText,
                            headers: r.headers
                        });
                        resolve(newRes);
                    });
                }).catch(e => {
                    showFloatingMessage(error_send_msg, error_color);
                    reject(e);
                });
            });
        } else {
            return originFetchBLDMAF(...arg);
        }
    };
})();
