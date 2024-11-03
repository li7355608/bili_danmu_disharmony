// ==UserScript==
// @name         哔哩哔哩直播弹幕反诈修改版
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  发不出去弹幕时不会假装发出去（弹幕列表和播放器上不会出现没发出去的弹幕，且会弹出高亮弹幕提示被什么诈骗），修改自 TGSAN-哔哩哔哩直播弹幕反诈
// @author       cheeys
// @match        https://live.bilibili.com/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    let windowCtx = self.window;
    if (self.unsafeWindow) {
        console.log("[弹幕反诈] use unsafeWindow mode");
        windowCtx = self.unsafeWindow;
    } else {
        console.log("[弹幕反诈] use window mode (your userscript extensions not support unsafeWindow)");
    }

    function checkSendDm(url) {
        return url.indexOf('api.live.bilibili.com/msg/send') > -1;
    }

    function showFloatingMessage(message, color) {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.position = 'fixed';
        div.style.top = `${Math.random() * 100}%`;
        div.style.left = '0%'; // 固定从左侧开始
        div.style.color = color;
        div.style.fontSize = '36px';
        div.style.zIndex = '9999';
        div.style.whiteSpace = 'nowrap';
        document.body.appendChild(div);

        function animate() {
            let left = parseFloat(div.style.left);
            if (left > 100) {
                div.remove();
                return;
            }
            div.style.left = `${left + 0.07}%`; // 此处调整弹幕速度
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
                       // console.log(data) 系统过滤器权限高于主播，出现多个诈骗词会优先被系统删除
                        if (data.code === 0 && data.msg === "f") {
                            showFloatingMessage("发送失败：你的弹幕被系统秒删，你被骗了", "green");
                            data.code = -101;
                            data.message = "没发出去，你被骗了，系统干的";
                            data.ttl = 1;
                            delete data.msg;
                            delete data.data;
                        } else if (data.code === 0 && data.msg === "k") {
                            showFloatingMessage("你的弹幕逃过系统秒删但被主播个人过滤器过滤，你又被骗了", "deepskyblue");
                            data.code = -101;
                            data.message = "没发出去，你被骗了，主播干的";
                            data.ttl = 1;
                            delete data.msg;
                            delete data.data;
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
                    showFloatingMessage("发送失败：捕获到的未知错误", "red");
                    reject(e);
                });
            });
        } else {
            return originFetchBLDMAF(...arg);
        }
    };
})();
