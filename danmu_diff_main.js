// ==UserScript==
// @name         [哔哩哔哩直播]---弹幕反诈与防河蟹
// @version      2.2
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
            overflow: hidden;
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
            // 添加重新打开功能
            logBox.setAttribute('data-closed', 'true');
        };

        // 添加拖拽功能 - 优化版本
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        let dragThrottleTimer = null;

        titleBar.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === titleBar || titleBar.contains(e.target)) {
                isDragging = true;
                // 启用硬件加速
                logBox.style.willChange = 'transform';
            }
        }

        function drag(e) {
            if (isDragging) {
                // 使用requestAnimationFrame节流，避免频繁DOM更新
                if (dragThrottleTimer) return;
                
                dragThrottleTimer = requestAnimationFrame(() => {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;

                    xOffset = currentX;
                    yOffset = currentY;

                    // 使用transform3d启用硬件加速
                    logBox.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
                    dragThrottleTimer = null;
                });
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            // 清理节流定时器
            if (dragThrottleTimer) {
                cancelAnimationFrame(dragThrottleTimer);
                dragThrottleTimer = null;
            }
            // 禁用硬件加速以节省资源
            logBox.style.willChange = 'auto';
        }

        return logBox;
    }

    // 保存弹幕记录到文件 - 优化版本
    function saveDanmuLogs(contentArea, saveBtn) {
        const entries = contentArea.children;
        if (entries.length === 0) {
            alert('没有弹幕记录可保存！');
            return;
        }

        // 使用StringBuilder模式优化字符串拼接
        const saveContent = [
            '弹幕记录保存文件',
            '='.repeat(50),
            `保存时间: ${new Date().toLocaleString()}`,
            `记录总数: ${entries.length} 条`,
            '='.repeat(50),
            ''
        ];

        // 统计信息
        let systemCount = 0;
        let userCount = 0;
        let normalCount = 0;

        // 使用更高效的遍历方式
        Array.from(entries).forEach(entry => {
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

                saveContent.push(`[${time}] ${type}`);
                saveContent.push(`内容: ${content}`);
                saveContent.push('-'.repeat(30));
            }
        });

        // 添加统计信息
        saveContent.push('');
        saveContent.push('='.repeat(50));
        saveContent.push('统计信息:');
        saveContent.push(`系统屏蔽: ${systemCount} 条`);
        saveContent.push(`主播屏蔽: ${userCount} 条`);
        saveContent.push(`正常显示: ${normalCount} 条`);
        saveContent.push(`总计: ${entries.length} 条`);
        saveContent.push('='.repeat(50));

        // 创建下载链接 - 优化内存使用
        const blob = new Blob([saveContent.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `弹幕记录_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        a.style.display = 'none'; // 避免闪烁
        document.body.appendChild(a);
        a.click();
        
        // 立即清理DOM和URL
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        // 显示保存成功提示
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '已保存';
        saveBtn.style.background = '#2196F3';
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = '#4CAF50';
        }, 2000);
    }

    // 添加全局清理函数
    function cleanup() {
        // 清理DOM缓存
        domCache.clearCache();
        
        // 清理URL缓存
        urlCache.clear();
        
        // 清理所有动画定时器
        const animatedElements = document.querySelectorAll('[style*="will-change"]');
        animatedElements.forEach(el => {
            el.style.willChange = 'auto';
        });
        
        console.log('[弹幕反诈] 清理完成');
    }

    // 页面卸载时清理资源
    window.addEventListener('beforeunload', cleanup);

    // DOM缓存对象
    const domCache = {
        logBox: null,
        contentArea: null,
        getLogBox() {
            if (!this.logBox) {
                this.logBox = document.getElementById('danmu-log-box') || createDanmuLogBox();
            }
            return this.logBox;
        },
        getContentArea() {
            if (!this.contentArea) {
                this.contentArea = document.getElementById('danmu-log-content');
            }
            return this.contentArea;
        },
        clearCache() {
            this.logBox = null;
            this.contentArea = null;
        }
    };

    // 类型配置缓存
    const typeConfig = {
        system: { text: '系统屏蔽', color: '#ff6b6b' },
        user: { text: '主播屏蔽', color: '#ffa500' },
        normal: { text: '正常显示', color: '#00ff00' }
    };

    // 记录弹幕到文本框 - 优化版本
    function logDanmuToBox(content, type) {
        const logBox = domCache.getLogBox();
        
        if (logBox.getAttribute('data-closed') === 'true') {
            // 如果弹幕框被关闭，重新显示
            logBox.style.display = 'block';
            logBox.removeAttribute('data-closed');
        }

        const contentArea = domCache.getContentArea();
        const timestamp = new Date().toLocaleTimeString();
        const config = typeConfig[type] || typeConfig.normal;

        // 使用DocumentFragment批量操作DOM
        const fragment = document.createDocumentFragment();
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 5px;
            padding: 3px;
            border-left: 3px solid ${config.color};
            background: rgba(255, 255, 255, 0.1);
        `;
        logEntry.innerHTML = `
            <div style="font-size: 10px; color: #ccc;">${timestamp}</div>
            <div style="color: ${config.color}; font-weight: bold;">[${config.text}]</div>
            <div>${content}</div>
        `;
        
        fragment.appendChild(logEntry);
        contentArea.appendChild(fragment);
        contentArea.scrollTop = contentArea.scrollHeight;

        // 优化记录数量限制 - 批量删除旧记录
        const entries = contentArea.children;
        if (entries.length > 50) {
            const toRemove = Array.from(entries).slice(0, entries.length - 50);
            toRemove.forEach(entry => entry.remove());
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

    // 优化URL检查 - 使用正则表达式和缓存
    const SEND_DM_URL_REGEX = /api\.live\.bilibili\.com\/msg\/send/;
    const urlCache = new Map();
    
    function checkSendDm(url) {
        if (!url) return false;
        
        // 使用缓存避免重复计算
        if (urlCache.has(url)) {
            return urlCache.get(url);
        }
        
        const result = SEND_DM_URL_REGEX.test(url);
        urlCache.set(url, result);
        
        // 限制缓存大小，避免内存泄漏
        if (urlCache.size > 100) {
            const firstKey = urlCache.keys().next().value;
            urlCache.delete(firstKey);
        }
        
        return result;
    }

    function showFloatingMessage(message, color) {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.cssText = `
            position: fixed;
            top: ${dm_top};
            left: ${dm_left};
            color: ${color};
            font-size: ${dm_fontSize};
            z-index: 9999;
            white-space: nowrap;
            will-change: transform;
            transform: translateZ(0);
            pointer-events: none;
        `;
        document.body.appendChild(div);

        // 使用更高效的动画实现
        let startTime = null;
        const animationDuration = 10000; // 10秒动画
        const startLeft = -16; // 起始位置
        const endLeft = 100; // 结束位置

        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / animationDuration, 1);
            
            if (progress >= 1) {
                div.remove();
                return;
            }
            
            // 使用缓动函数让动画更自然
            const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const currentLeft = startLeft + (endLeft - startLeft) * easeProgress;
            
            div.style.transform = `translate3d(${currentLeft}%, 0, 0)`;
            requestAnimationFrame(animate);
        }
        
        requestAnimationFrame(animate);

        // 备用清理机制
        setTimeout(() => {
            if (div.parentNode) {
                div.remove();
            }
        }, animationDuration + 1000);
    }

    // 异步处理弹幕响应数据
    async function processDanmuResponse(data, originalResponse, resolve, reject) {
        try {
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

            // 处理响应数据
            if (data.code === 0 && data.msg === "f") {
                for(let i = 0; i < exp; i++){
                    showFloatingMessage(ban_system_msg, ban_color_system);
                }
                data.code = -101;
                data.message = "你的弹幕没发出去，你被骗了，系统干的";
                data.ttl = 1;
                delete data.msg;
                delete data.data;
            } else if (data.code === 0 && data.msg === "k") {
                for(let i = 0; i < exp; i++){
                    showFloatingMessage(ban_user_msg, ban_color_user);
                }
                data.code = -101;
                data.message = "你的弹幕没发出去，你被骗了，主播干的";
                data.ttl = 1;
                delete data.msg;
                delete data.data;
            } else {
                console.log("恭喜，您的弹幕正常显示！");
                if(success_send === true){
                    showFloatingMessage(success_msg, success_color);
                }
            }
            
            const body = JSON.stringify(data);
            const newRes = new Response(body, {
                status: originalResponse.status,
                statusText: originalResponse.statusText,
                headers: originalResponse.headers
            });
            resolve(newRes);
        } catch (error) {
            console.error("处理弹幕响应时出错:", error);
            showFloatingMessage(error_send_msg, error_color);
            reject(error);
        }
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
                originFetchBLDMAF(...arg).then(async r => {
                    try {
                        // 使用clone()避免消费原始响应
                        const clonedResponse = r.clone();
                        const data = await clonedResponse.json();
                        await processDanmuResponse(data, r, resolve, reject);
                    } catch (e) {
                        console.error("处理弹幕请求时出错:", e);
                        showFloatingMessage(error_send_msg, error_color);
                        reject(e);
                    }
                }).catch(e => {
                    console.error("弹幕请求失败:", e);
                    showFloatingMessage(error_send_msg, error_color);
                    reject(e);
                });
            });
        } else {
            return originFetchBLDMAF(...arg);
        }
    };
})();
