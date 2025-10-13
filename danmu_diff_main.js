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

    // 创建浮动文本框用于记录被拦截的弹幕
    function createDanmuLogBox() {
        const logBox = document.createElement('div');
        logBox.id = 'danmu-log-box';
        logBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            height: 200px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 2px solid #00a1d6;
            border-radius: 8px;
            padding: 10px;
            font-size: 12px;
            z-index: 10000;
            font-family: 'Microsoft YaHei', sans-serif;
            overflow-y: auto;
            resize: both;
        `;

        // 添加标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #00a1d6;
        `;

        const title = document.createElement('span');
        title.textContent = '弹幕记录板';
        title.style.fontWeight = 'bold';

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空';
        clearBtn.style.cssText = `
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 2px 8px;
            font-size: 10px;
            cursor: pointer;
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 2px 8px;
            font-size: 10px;
            cursor: pointer;
            margin-left: 5px;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: #666;
            color: white;
            border: none;
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 12px;
            cursor: pointer;
            margin-left: 5px;
        `;

        titleBar.appendChild(title);
        titleBar.appendChild(clearBtn);
        titleBar.appendChild(saveBtn);
        titleBar.appendChild(closeBtn);

        // 添加内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'danmu-log-content';
        contentArea.style.cssText = `
            height: calc(100% - 30px);
            overflow-y: auto;
            word-wrap: break-word;
        `;

        logBox.appendChild(titleBar);
        logBox.appendChild(contentArea);
        document.body.appendChild(logBox);

        // 绑定事件
        clearBtn.onclick = () => {
            contentArea.innerHTML = '';
        };

        saveBtn.onclick = () => {
            saveDanmuLogs(contentArea, saveBtn);
        };

        closeBtn.onclick = () => {
            logBox.style.display = 'none';
        };

        // 添加拖拽功能
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        titleBar.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === titleBar || titleBar.contains(e.target)) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                logBox.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        return logBox;
    }

    // 保存弹幕记录到文件
    function saveDanmuLogs(contentArea, saveBtn) {
        const entries = contentArea.children;
        if (entries.length === 0) {
            alert('没有弹幕记录可保存！');
            return;
        }

        let saveContent = '弹幕记录保存文件\n';
        saveContent += '='.repeat(50) + '\n';
        saveContent += `保存时间: ${new Date().toLocaleString()}\n`;
        saveContent += `记录总数: ${entries.length} 条\n`;
        saveContent += '='.repeat(50) + '\n\n';

        // 统计信息
        let systemCount = 0;
        let userCount = 0;
        let normalCount = 0;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const typeDiv = entry.querySelector('div:nth-child(2)');
            const contentDiv = entry.querySelector('div:nth-child(3)');
            const timeDiv = entry.querySelector('div:nth-child(1)');
            
            if (typeDiv && contentDiv && timeDiv) {
                const type = typeDiv.textContent;
                const content = contentDiv.textContent;
                const time = timeDiv.textContent;
                
                // 统计数量
                if (type.includes('系统屏蔽')) systemCount++;
                else if (type.includes('主播屏蔽')) userCount++;
                else if (type.includes('正常显示')) normalCount++;
                
                saveContent += `[${time}] ${type}\n`;
                saveContent += `内容: ${content}\n`;
                saveContent += '-'.repeat(30) + '\n';
            }
        }

        // 添加统计信息
        saveContent += '\n' + '='.repeat(50) + '\n';
        saveContent += '统计信息:\n';
        saveContent += `系统屏蔽: ${systemCount} 条\n`;
        saveContent += `主播屏蔽: ${userCount} 条\n`;
        saveContent += `正常显示: ${normalCount} 条\n`;
        saveContent += `总计: ${entries.length} 条\n`;
        saveContent += '='.repeat(50) + '\n';

        // 创建下载链接
        const blob = new Blob([saveContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `弹幕记录_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 显示保存成功提示
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '已保存';
        saveBtn.style.background = '#2196F3';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '#4CAF50';
        }, 2000);
    }

    // 记录弹幕到文本框
    function logDanmuToBox(content, type) {
        let logBox = document.getElementById('danmu-log-box');
        if (!logBox) {
            logBox = createDanmuLogBox();
        }

        const contentArea = document.getElementById('danmu-log-content');
        const timestamp = new Date().toLocaleTimeString();
        const typeText = type === 'system' ? '系统屏蔽' : type === 'user' ? '主播屏蔽' : '正常显示';
        const typeColor = type === 'system' ? '#ff6b6b' : type === 'user' ? '#ffa500' : '#00ff00';

        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 5px;
            padding: 3px;
            border-left: 3px solid ${typeColor};
            background: rgba(255, 255, 255, 0.1);
        `;
        logEntry.innerHTML = `
            <div style="font-size: 10px; color: #ccc;">${timestamp}</div>
            <div style="color: ${typeColor}; font-weight: bold;">[${typeText}]</div>
            <div>${content}</div>
        `;

        contentArea.appendChild(logEntry);
        contentArea.scrollTop = contentArea.scrollHeight;

        // 限制记录数量，避免占用过多内存
        const entries = contentArea.children;
        if (entries.length > 50) {
            contentArea.removeChild(entries[0]);
        }
    }


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
                        // 在修改数据前提取弹幕内容
                        if (data.data && data.data.mode_info && data.data.mode_info.extra) {
                            try {
                                const extraData = JSON.parse(data.data.mode_info.extra);
                                if (extraData.content) {
                                    // 根据屏蔽类型进行针对性输出
                                    if (data.msg === "f") {
                                        console.log("系统屏蔽弹幕:", extraData.content);
                                        logDanmuToBox(extraData.content, 'system');
                                    } else if (data.msg === "k") {
                                        console.log("主播屏蔽弹幕:", extraData.content);
                                        logDanmuToBox(extraData.content, 'user');
                                    } else {
                                        console.log("正常弹幕:", extraData.content);
                                        logDanmuToBox(extraData.content, 'normal');
                                    }
                                }
                            } catch (e) {
                                console.log("解析弹幕内容失败:", e);
                            }
                        }

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
