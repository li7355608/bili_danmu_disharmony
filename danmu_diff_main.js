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

    // 敏感词管理器初始化配置
    const sensitiveWordsConfig = {
        // 默认配置参数，仅在初始化时有效，初始化配置修改此处
        defaultConfig: {
            // 是否启用敏感词检测
            enabled: true,
            // 是否区分大小写
            caseSensitive: false,
            // 是否启用模糊匹配
            fuzzyMatch: true,
            // 是否默认显示弹幕记录板
            showLogBoxByDefault: true,
            // 弹幕记录板容量限制
            logBoxCapacity: 50,
            // 默认敏感词列表
            words: [
                '敏感', '违规', '不当', '禁止', '限制', '屏蔽', '过滤',
                '政治', '色情', '暴力', '赌博', '毒品', '诈骗', '传销', '邪教',
                '反动', '分裂', '恐怖', '极端', '仇恨', '歧视', '侮辱', '诽谤'
            ]
        },
        // 敏感词高亮样式
        highlightStyle: {
            backgroundColor: '#ffeb3b',
            color: '#d32f2f',
            fontWeight: 'bold',
            padding: '1px 2px',
            borderRadius: '2px',
            textShadow: '0 0 2px rgba(255, 0, 0, 0.3)'
        },
        // 当前运行时配置（用户自定义，会从本地存储中更新，修改默认参数请勿修改此处）
        words: [],
        enabled: true,
        caseSensitive: false,
        fuzzyMatch: true,
        showLogBoxByDefault: true,
        logBoxCapacity: 50
    };

    // 重置所有选项到默认配置
    function resetToDefaultConfig() {
        sensitiveWordsConfig.enabled = sensitiveWordsConfig.defaultConfig.enabled;
        sensitiveWordsConfig.caseSensitive = sensitiveWordsConfig.defaultConfig.caseSensitive;
        sensitiveWordsConfig.fuzzyMatch = sensitiveWordsConfig.defaultConfig.fuzzyMatch;
        sensitiveWordsConfig.showLogBoxByDefault = sensitiveWordsConfig.defaultConfig.showLogBoxByDefault;
        sensitiveWordsConfig.logBoxCapacity = sensitiveWordsConfig.defaultConfig.logBoxCapacity;
        sensitiveWordsConfig.words = [...sensitiveWordsConfig.defaultConfig.words];
    }

    // 敏感词管理器
    const sensitiveWordManager = {
        // 获取敏感词列表
        getWords() {
            const saved = localStorage.getItem('danmu_sensitive_words');
            if (saved) {
                try {
                    const config = JSON.parse(saved);
                    return config.words || sensitiveWordsConfig.defaultConfig.words;
                } catch (e) {
                    console.warn('解析敏感词配置失败，使用默认配置');
                    return sensitiveWordsConfig.defaultConfig.words;
                }
            }
            // 如果localStorage中没有数据，返回初始初始化的词汇配置
            return sensitiveWordsConfig.defaultConfig.words;
        },

        // 保存敏感词列表
        saveWords(words) {
            const config = {
                words: words,
                enabled: sensitiveWordsConfig.enabled,
                caseSensitive: sensitiveWordsConfig.caseSensitive,
                fuzzyMatch: sensitiveWordsConfig.fuzzyMatch,
                showLogBoxByDefault: sensitiveWordsConfig.showLogBoxByDefault,
                logBoxCapacity: sensitiveWordsConfig.logBoxCapacity
            };
            localStorage.setItem('danmu_sensitive_words', JSON.stringify(config));
        },

        // 添加敏感词
        addWord(word) {
            const words = this.getWords();
            if (!words.includes(word)) {
                words.push(word);
                this.saveWords(words);
                return true;
            }
            return false;
        },

        // 删除敏感词
        removeWord(word) {
            const words = this.getWords();
            const index = words.indexOf(word);
            if (index > -1) {
                words.splice(index, 1);
                this.saveWords(words);
                return true;
            }
            return false;
        },

        // 检测敏感词
        detectSensitiveWords(text) {
            if (!sensitiveWordsConfig.enabled || !text) return [];
            
            const words = this.getWords();
            const detectedWords = [];
            const textToCheck = sensitiveWordsConfig.caseSensitive ? text : text.toLowerCase();
            
            words.forEach(word => {
                const wordToCheck = sensitiveWordsConfig.caseSensitive ? word : word.toLowerCase();
                
                if (sensitiveWordsConfig.fuzzyMatch) {
                    // 模糊匹配：检查是否包含敏感词
                    if (textToCheck.includes(wordToCheck)) {
                        detectedWords.push({
                            word: word,
                            originalWord: word,
                            startIndex: textToCheck.indexOf(wordToCheck),
                            endIndex: textToCheck.indexOf(wordToCheck) + wordToCheck.length
                        });
                    }
                } else {
                    // 精确匹配：使用正则表达式
                    const regex = new RegExp(`\\b${wordToCheck.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
                    let match;
                    while ((match = regex.exec(textToCheck)) !== null) {
                        detectedWords.push({
                            word: word,
                            originalWord: word,
                            startIndex: match.index,
                            endIndex: match.index + match[0].length
                        });
                    }
                }
            });
            
            return detectedWords;
        },

        // 高亮敏感词
        highlightSensitiveWords(text) {
            const detectedWords = this.detectSensitiveWords(text);
            if (detectedWords.length === 0) return text;
            
            // 按位置排序，从后往前替换避免位置偏移
            detectedWords.sort((a, b) => b.startIndex - a.startIndex);
            
            let highlightedText = text;
            detectedWords.forEach(item => {
                const before = highlightedText.substring(0, item.startIndex);
                const sensitive = highlightedText.substring(item.startIndex, item.endIndex);
                const after = highlightedText.substring(item.endIndex);
                
                const highlightSpan = `<span style="background-color: ${sensitiveWordsConfig.highlightStyle.backgroundColor}; color: ${sensitiveWordsConfig.highlightStyle.color}; font-weight: ${sensitiveWordsConfig.highlightStyle.fontWeight}; padding: ${sensitiveWordsConfig.highlightStyle.padding}; border-radius: ${sensitiveWordsConfig.highlightStyle.borderRadius}; text-shadow: ${sensitiveWordsConfig.highlightStyle.textShadow};">${sensitive}</span>`;
                
                highlightedText = before + highlightSpan + after;
            });
            
            return highlightedText;
        }
    };

    // 创建浮动文本框用于记录被拦截的弹幕
    function createDanmuLogBox() {
        const logBox = document.createElement('div');
        logBox.id = 'danmu-log-box';
        logBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 320px;
            height: 250px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: 2px solid #00a1d6;
            border-radius: 12px;
            padding: 15px;
            font-size: 12px;
            z-index: 10000;
            font-family: 'Microsoft YaHei', sans-serif;
            overflow: hidden;
            resize: both;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        // 添加标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #00a1d6;
            background: linear-gradient(90deg, rgba(0, 161, 214, 0.1), transparent);
            border-radius: 8px 8px 0 0;
            padding: 8px 12px;
            margin: -15px -15px 10px -15px;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        const title = document.createElement('span');
        title.textContent = '弹幕记录板';
        title.style.cssText = `
            font-weight: bold;
            font-size: 14px;
            color: #00a1d6;
            text-shadow: 0 0 8px rgba(0, 161, 214, 0.5);
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空';
        clearBtn.style.cssText = `
            background: linear-gradient(135deg, #ff6b6b, #e53e3e);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
            transition: all 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 清空按钮悬停效果
        clearBtn.onmouseenter = () => {
            clearBtn.style.transform = 'scale(1.05)';
            clearBtn.style.boxShadow = '0 4px 8px rgba(255, 107, 107, 0.4)';
        };
        clearBtn.onmouseleave = () => {
            clearBtn.style.transform = 'scale(1)';
            clearBtn.style.boxShadow = '0 2px 6px rgba(255, 107, 107, 0.3)';
        };

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '保存';
        saveBtn.style.cssText = `
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
            transition: all 0.2s ease;
            margin-left: 5px;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 保存按钮悬停效果
        saveBtn.onmouseenter = () => {
            saveBtn.style.transform = 'scale(1.05)';
            saveBtn.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.4)';
        };
        saveBtn.onmouseleave = () => {
            saveBtn.style.transform = 'scale(1)';
            saveBtn.style.boxShadow = '0 2px 6px rgba(76, 175, 80, 0.3)';
        };

        const sensitiveBtn = document.createElement('button');
        sensitiveBtn.textContent = '敏感词';
        sensitiveBtn.style.cssText = `
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(255, 152, 0, 0.3);
            transition: all 0.2s ease;
            margin-left: 5px;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 敏感词按钮悬停效果
        sensitiveBtn.onmouseenter = () => {
            sensitiveBtn.style.transform = 'scale(1.05)';
            sensitiveBtn.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.4)';
        };
        sensitiveBtn.onmouseleave = () => {
            sensitiveBtn.style.transform = 'scale(1)';
            sensitiveBtn.style.boxShadow = '0 2px 6px rgba(255, 152, 0, 0.3)';
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: linear-gradient(135deg, #666, #555);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(102, 102, 102, 0.3);
            transition: all 0.2s ease;
            margin-left: 5px;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 关闭按钮悬停效果
        closeBtn.onmouseenter = () => {
            closeBtn.style.transform = 'scale(1.05)';
            closeBtn.style.boxShadow = '0 4px 8px rgba(102, 102, 102, 0.4)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.transform = 'scale(1)';
            closeBtn.style.boxShadow = '0 2px 6px rgba(102, 102, 102, 0.3)';
        };

        titleBar.appendChild(title);
        titleBar.appendChild(clearBtn);
        titleBar.appendChild(saveBtn);
        titleBar.appendChild(sensitiveBtn);
        titleBar.appendChild(closeBtn);

        // 添加内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'danmu-log-content';
        contentArea.style.cssText = `
            height: calc(100% - 40px);
            overflow-y: auto;
            word-wrap: break-word;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
            border-radius: 8px;
            padding: 10px;
            border: 1px solid rgba(0, 161, 214, 0.2);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
        `;

        // 添加自定义滚动条样式
        const scrollbarStyle = document.createElement('style');
        scrollbarStyle.textContent = `
            #danmu-log-content::-webkit-scrollbar {
                width: 8px;
            }
            
            #danmu-log-content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 4px;
                margin: 2px;
            }
            
            #danmu-log-content::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #00a1d6, #0088cc);
                border-radius: 4px;
                border: 1px solid rgba(0, 161, 214, 0.3);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }
            
            #danmu-log-content::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #0088cc, #006699);
                box-shadow: 0 0 8px rgba(0, 161, 214, 0.4);
                transform: scale(1.1);
            }
            
            #danmu-log-content::-webkit-scrollbar-thumb:active {
                background: linear-gradient(135deg, #006699, #004466);
            }
            
            #danmu-log-content::-webkit-scrollbar-corner {
                background: transparent;
            }
            
            /* Firefox 滚动条样式 */
            #danmu-log-content {
                scrollbar-width: thin;
                scrollbar-color: #00a1d6 rgba(0, 0, 0, 0.1);
            }
        `;
        document.head.appendChild(scrollbarStyle);

        logBox.appendChild(titleBar);
        logBox.appendChild(contentArea);
        document.body.appendChild(logBox);

        // 绑定事件
        clearBtn.onclick = () => {
            // 检查是否有记录
            if (contentArea.children.length === 0) {
                showNotification('没有记录可清空！', 'warning', 2000);
                return;
            }
            
            // 二级确认
            if (confirm('确定要清空所有弹幕记录吗？\n\n此操作不可撤销！')) {
                contentArea.innerHTML = '';
                showNotification('弹幕记录已清空！', 'success', 2000);
            }
        };

        saveBtn.onclick = () => {
            saveDanmuLogs(contentArea, saveBtn);
        };

        sensitiveBtn.onclick = () => {
            showSensitiveWordManager();
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

    // 配置选项UI管理
    const configUI = {
        enableCheckbox: null,
        caseCheckbox: null,
        fuzzyCheckbox: null,
        showLogBoxCheckbox: null,
        capacityInput: null,
        
        // 初始化配置选项UI
        init(enableCheckbox, caseCheckbox, fuzzyCheckbox, showLogBoxCheckbox, capacityInput) {
            this.enableCheckbox = enableCheckbox;
            this.caseCheckbox = caseCheckbox;
            this.fuzzyCheckbox = fuzzyCheckbox;
            this.showLogBoxCheckbox = showLogBoxCheckbox;
            this.capacityInput = capacityInput;
        },
        
        // 重置配置选项UI到默认状态
        resetToDefault() {
            if (this.enableCheckbox) this.enableCheckbox.checked = sensitiveWordsConfig.defaultConfig.enabled;
            if (this.caseCheckbox) this.caseCheckbox.checked = sensitiveWordsConfig.defaultConfig.caseSensitive;
            if (this.fuzzyCheckbox) this.fuzzyCheckbox.checked = sensitiveWordsConfig.defaultConfig.fuzzyMatch;
            if (this.showLogBoxCheckbox) this.showLogBoxCheckbox.checked = sensitiveWordsConfig.defaultConfig.showLogBoxByDefault;
            if (this.capacityInput) this.capacityInput.value = sensitiveWordsConfig.defaultConfig.logBoxCapacity;
        }
    };

    // 敏感词管理界面
    function showSensitiveWordManager() {
        // 检查是否已经存在管理界面
        let managerModal = document.getElementById('sensitive-word-manager');
        if (managerModal) {
            managerModal.style.display = 'block';
            // 每次打开时清空输入框
            const addInput = managerModal.querySelector('input[type="text"]');
            if (addInput) {
                addInput.value = '';
            }
            return;
        }

        // 创建模态框
        managerModal = document.createElement('div');
        managerModal.id = 'sensitive-word-manager';
        managerModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 20000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // 创建管理面板
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: linear-gradient(135deg, #2c2c2c, #1a1a1a);
            border: 2px solid #00a1d6;
            border-radius: 12px;
            padding: 20px;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            font-family: 'Microsoft YaHei', sans-serif;
            position: relative;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        // 添加自定义勾选框样式
        const checkboxStyle = document.createElement('style');
        checkboxStyle.textContent = `
            #sensitive-word-manager input[type="checkbox"] {
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                width: 18px;
                height: 18px;
                border: 2px solid rgba(0, 161, 214, 0.6);
                border-radius: 4px;
                background: linear-gradient(135deg, #333, #2a2a2a);
                cursor: pointer;
                position: relative;
                transition: all 0.3s ease;
                box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            #sensitive-word-manager input[type="checkbox"]:hover {
                border-color: #00a1d6;
                box-shadow: 0 0 8px rgba(0, 161, 214, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3);
                transform: scale(1.05);
            }
            
            #sensitive-word-manager input[type="checkbox"]:checked {
                background: linear-gradient(135deg, #00a1d6, #0088cc);
                border-color: #00a1d6;
                box-shadow: 0 0 12px rgba(0, 161, 214, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            #sensitive-word-manager input[type="checkbox"]:checked::after {
                content: '✓';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
            }
            
            #sensitive-word-manager input[type="checkbox"]:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(0, 161, 214, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            #sensitive-word-manager label {
                cursor: pointer;
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                transition: color 0.2s ease;
            }
            
            #sensitive-word-manager label:hover {
                color: #00a1d6;
            }
        `;
        document.head.appendChild(checkboxStyle);

        // 标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #00a1d6;
            cursor: move;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            background: linear-gradient(90deg, rgba(0, 161, 214, 0.1), transparent);
            border-radius: 8px 8px 0 0;
            padding: 10px 15px;
            margin: -20px -20px 15px -20px;
        `;

        const title = document.createElement('h3');
        title.textContent = '敏感词管理';
        title.style.margin = '0';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: linear-gradient(135deg, #ff6b6b, #e53e3e);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            transition: all 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 添加悬停效果
        closeBtn.onmouseenter = () => {
            closeBtn.style.transform = 'scale(1.05)';
            closeBtn.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.5)';
        };
        closeBtn.onmouseleave = () => {
            closeBtn.style.transform = 'scale(1)';
            closeBtn.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
        };

        titleBar.appendChild(title);
        titleBar.appendChild(closeBtn);

        // 添加敏感词区域
        const addSection = document.createElement('div');
        addSection.style.cssText = `
            margin-bottom: 20px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
            border-radius: 8px;
            border: 1px solid rgba(0, 161, 214, 0.3);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        const addLabel = document.createElement('label');
        addLabel.textContent = '添加敏感词:';
        addLabel.style.display = 'block';
        addLabel.style.marginBottom = '5px';

        const addInput = document.createElement('input');
        addInput.type = 'text';
        addInput.placeholder = '输入要添加的敏感词';
        addInput.style.cssText = `
            width: 70%;
            padding: 10px 15px;
            border: 2px solid rgba(0, 161, 214, 0.5);
            border-radius: 8px;
            background: linear-gradient(135deg, #333, #2a2a2a);
            color: white;
            margin-right: 10px;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
        `;
        
        // 输入框焦点效果
        addInput.onfocus = () => {
            addInput.style.borderColor = '#00a1d6';
            addInput.style.boxShadow = '0 0 0 3px rgba(0, 161, 214, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
        };
        addInput.onblur = () => {
            addInput.style.borderColor = 'rgba(0, 161, 214, 0.5)';
            addInput.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
        };

        const addBtn = document.createElement('button');
        addBtn.textContent = '添加';
        addBtn.style.cssText = `
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            transition: all 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 添加按钮悬停效果
        addBtn.onmouseenter = () => {
            addBtn.style.transform = 'translateY(-2px)';
            addBtn.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)';
        };
        addBtn.onmouseleave = () => {
            addBtn.style.transform = 'translateY(0)';
            addBtn.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
        };

        addSection.appendChild(addLabel);
        addSection.appendChild(addInput);
        addSection.appendChild(addBtn);

        // 敏感词列表区域
        const listSection = document.createElement('div');
        listSection.style.cssText = `
            margin-bottom: 20px;
        `;

        const listLabel = document.createElement('label');
        listLabel.textContent = '当前敏感词列表:';
        listLabel.style.display = 'block';
        listLabel.style.marginBottom = '10px';

        const wordList = document.createElement('div');
        wordList.id = 'sensitive-word-list';
        wordList.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
            border: 2px solid rgba(0, 161, 214, 0.3);
            border-radius: 8px;
            padding: 15px;
            background: linear-gradient(135deg, #333, #2a2a2a);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        // 为敏感词列表添加自定义滚动条样式
        const sensitiveWordScrollbarStyle = document.createElement('style');
        sensitiveWordScrollbarStyle.textContent = `
            #sensitive-word-list::-webkit-scrollbar {
                width: 8px;
            }
            
            #sensitive-word-list::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
                margin: 2px;
            }
            
            #sensitive-word-list::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #00a1d6, #0088cc);
                border-radius: 4px;
                border: 1px solid rgba(0, 161, 214, 0.3);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }
            
            #sensitive-word-list::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #0088cc, #006699);
                box-shadow: 0 0 8px rgba(0, 161, 214, 0.4);
                transform: scale(1.1);
            }
            
            #sensitive-word-list::-webkit-scrollbar-thumb:active {
                background: linear-gradient(135deg, #006699, #004466);
            }
            
            #sensitive-word-list::-webkit-scrollbar-corner {
                background: transparent;
            }
            
            /* Firefox 滚动条样式 */
            #sensitive-word-list {
                scrollbar-width: thin;
                scrollbar-color: #00a1d6 rgba(0, 0, 0, 0.2);
            }
        `;
        document.head.appendChild(sensitiveWordScrollbarStyle);

        listSection.appendChild(listLabel);
        listSection.appendChild(wordList);

        // 配置区域
        const configSection = document.createElement('div');
        configSection.style.cssText = `
            margin-bottom: 20px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
            border-radius: 8px;
            border: 1px solid rgba(0, 161, 214, 0.3);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;

        const configLabel = document.createElement('label');
        configLabel.textContent = '检测配置:';
        configLabel.style.display = 'block';
        configLabel.style.marginBottom = '10px';

        const enableCheckbox = document.createElement('input');
        enableCheckbox.type = 'checkbox';
        enableCheckbox.id = 'enable-sensitive-check';
        enableCheckbox.checked = sensitiveWordsConfig.enabled;

        const enableLabel = document.createElement('label');
        enableLabel.htmlFor = 'enable-sensitive-check';
        enableLabel.textContent = '启用敏感词检测';
        enableLabel.style.marginLeft = '5px';

        const caseCheckbox = document.createElement('input');
        caseCheckbox.type = 'checkbox';
        caseCheckbox.id = 'case-sensitive-check';
        caseCheckbox.checked = sensitiveWordsConfig.caseSensitive;

        const caseLabel = document.createElement('label');
        caseLabel.htmlFor = 'case-sensitive-check';
        caseLabel.textContent = '区分大小写';
        caseLabel.style.marginLeft = '5px';

        const fuzzyCheckbox = document.createElement('input');
        fuzzyCheckbox.type = 'checkbox';
        fuzzyCheckbox.id = 'fuzzy-match-check';
        fuzzyCheckbox.checked = sensitiveWordsConfig.fuzzyMatch;

        const fuzzyLabel = document.createElement('label');
        fuzzyLabel.htmlFor = 'fuzzy-match-check';
        fuzzyLabel.textContent = '模糊匹配';
        fuzzyLabel.style.marginLeft = '5px';

        const showLogBoxCheckbox = document.createElement('input');
        showLogBoxCheckbox.type = 'checkbox';
        showLogBoxCheckbox.id = 'show-logbox-check';
        showLogBoxCheckbox.checked = sensitiveWordsConfig.showLogBoxByDefault;

        const showLogBoxLabel = document.createElement('label');
        showLogBoxLabel.htmlFor = 'show-logbox-check';
        showLogBoxLabel.textContent = '默认显示弹幕记录板（取消则发送弹幕后展示）';
        showLogBoxLabel.style.marginLeft = '5px';

        // 添加容量配置
        const capacityLabel = document.createElement('label');
        capacityLabel.textContent = '弹幕记录板容量:';
        capacityLabel.style.display = 'block';
        capacityLabel.style.marginTop = '10px';
        capacityLabel.style.marginBottom = '5px';

        const capacityInput = document.createElement('input');
        capacityInput.type = 'number';
        capacityInput.id = 'logbox-capacity-input';
        capacityInput.min = '10';
        capacityInput.max = '1000';
        capacityInput.value = sensitiveWordsConfig.logBoxCapacity;
        capacityInput.style.cssText = `
            width: 80px;
            padding: 8px 12px;
            border: 2px solid rgba(0, 161, 214, 0.5);
            border-radius: 6px;
            background: linear-gradient(135deg, #333, #2a2a2a);
            color: white;
            margin-right: 10px;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
        `;
        
        // 输入框焦点效果
        capacityInput.onfocus = () => {
            capacityInput.style.borderColor = '#00a1d6';
            capacityInput.style.boxShadow = '0 0 0 3px rgba(0, 161, 214, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
        };
        capacityInput.onblur = () => {
            capacityInput.style.borderColor = 'rgba(0, 161, 214, 0.5)';
            capacityInput.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
        };

        const capacityUnitLabel = document.createElement('span');
        capacityUnitLabel.textContent = '条记录';
        capacityUnitLabel.style.color = '#888';
        capacityUnitLabel.style.fontSize = '12px';

        configSection.appendChild(configLabel);
        configSection.appendChild(enableCheckbox);
        configSection.appendChild(enableLabel);
        configSection.appendChild(document.createElement('br'));
        configSection.appendChild(caseCheckbox);
        configSection.appendChild(caseLabel);
        configSection.appendChild(document.createElement('br'));
        configSection.appendChild(fuzzyCheckbox);
        configSection.appendChild(fuzzyLabel);
        configSection.appendChild(document.createElement('br'));
        configSection.appendChild(showLogBoxCheckbox);
        configSection.appendChild(showLogBoxLabel);
        configSection.appendChild(document.createElement('br'));
        configSection.appendChild(capacityLabel);
        configSection.appendChild(capacityInput);
        configSection.appendChild(capacityUnitLabel);
        
        // 初始化配置选项UI管理器
        configUI.init(enableCheckbox, caseCheckbox, fuzzyCheckbox, showLogBoxCheckbox, capacityInput);

        // 操作按钮区域
        const buttonSection = document.createElement('div');
        buttonSection.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        `;

        const resetBtn = document.createElement('button');
        resetBtn.textContent = '重置默认';
        resetBtn.style.cssText = `
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
            transition: all 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 重置按钮悬停效果
        resetBtn.onmouseenter = () => {
            resetBtn.style.transform = 'translateY(-2px)';
            resetBtn.style.boxShadow = '0 6px 16px rgba(255, 152, 0, 0.4)';
        };
        resetBtn.onmouseleave = () => {
            resetBtn.style.transform = 'translateY(0)';
            resetBtn.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
        };

        const saveConfigBtn = document.createElement('button');
        saveConfigBtn.textContent = '保存配置';
        saveConfigBtn.style.cssText = `
            background: linear-gradient(135deg, #2196F3, #1976d2);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
            transition: all 0.2s ease;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // 保存按钮悬停效果
        saveConfigBtn.onmouseenter = () => {
            saveConfigBtn.style.transform = 'translateY(-2px)';
            saveConfigBtn.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.4)';
        };
        saveConfigBtn.onmouseleave = () => {
            saveConfigBtn.style.transform = 'translateY(0)';
            saveConfigBtn.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
        };

        buttonSection.appendChild(resetBtn);
        buttonSection.appendChild(saveConfigBtn);

        // 组装面板
        panel.appendChild(titleBar);
        panel.appendChild(addSection);
        panel.appendChild(listSection);
        panel.appendChild(configSection);
        panel.appendChild(buttonSection);
        managerModal.appendChild(panel);
        document.body.appendChild(managerModal);

        // 更新敏感词列表显示
        function updateWordList() {
            const words = sensitiveWordManager.getWords();
            wordList.innerHTML = '';
            
            if (words.length === 0) {
                wordList.innerHTML = '<div style="color: #888; text-align: center;">暂无敏感词</div>';
                return;
            }

            words.forEach(word => {
                const wordItem = document.createElement('div');
                wordItem.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 15px;
                    margin: 8px 0;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
                    border-radius: 8px;
                    border: 1px solid rgba(0, 161, 214, 0.2);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    transition: all 0.2s ease;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                `;
                
                // 列表项悬停效果
                wordItem.onmouseenter = () => {
                    wordItem.style.transform = 'translateX(5px)';
                    wordItem.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                    wordItem.style.borderColor = 'rgba(0, 161, 214, 0.5)';
                };
                wordItem.onmouseleave = () => {
                    wordItem.style.transform = 'translateX(0)';
                    wordItem.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                    wordItem.style.borderColor = 'rgba(0, 161, 214, 0.2)';
                };

                const wordText = document.createElement('span');
                wordText.textContent = word;

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除';
                deleteBtn.style.cssText = `
                    background: linear-gradient(135deg, #f44336, #d32f2f);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(244, 67, 54, 0.3);
                    transition: all 0.2s ease;
                    user-select: none;
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                `;
                
                // 删除按钮悬停效果
                deleteBtn.onmouseenter = () => {
                    deleteBtn.style.transform = 'scale(1.05)';
                    deleteBtn.style.boxShadow = '0 4px 8px rgba(244, 67, 54, 0.4)';
                };
                deleteBtn.onmouseleave = () => {
                    deleteBtn.style.transform = 'scale(1)';
                    deleteBtn.style.boxShadow = '0 2px 6px rgba(244, 67, 54, 0.3)';
                };

                deleteBtn.onclick = () => {
                    if (confirm(`确定要删除敏感词"${word}"吗？`)) {
                        if (sensitiveWordManager.removeWord(word)) {
                            updateWordList();
                            showNotification('敏感词删除成功！', 'success');
                        } else {
                            showNotification('删除失败！', 'error');
                        }
                    }
                };

                wordItem.appendChild(wordText);
                wordItem.appendChild(deleteBtn);
                wordList.appendChild(wordItem);
            });
        }

        // 添加拖拽功能
        let isDraggingPanel = false;
        let currentPanelX;
        let currentPanelY;
        let initialPanelX;
        let initialPanelY;
        let xPanelOffset = 0;
        let yPanelOffset = 0;
        let dragPanelThrottleTimer = null;

        titleBar.addEventListener('mousedown', dragPanelStart);
        document.addEventListener('mousemove', dragPanel);
        document.addEventListener('mouseup', dragPanelEnd);

        function dragPanelStart(e) {
            initialPanelX = e.clientX - xPanelOffset;
            initialPanelY = e.clientY - yPanelOffset;

            if (e.target === titleBar || titleBar.contains(e.target)) {
                isDraggingPanel = true;
                panel.style.willChange = 'transform';
            }
        }

        function dragPanel(e) {
            if (isDraggingPanel) {
                if (dragPanelThrottleTimer) return;
                
                dragPanelThrottleTimer = requestAnimationFrame(() => {
                    e.preventDefault();
                    currentPanelX = e.clientX - initialPanelX;
                    currentPanelY = e.clientY - initialPanelY;

                    xPanelOffset = currentPanelX;
                    yPanelOffset = currentPanelY;

                    panel.style.transform = `translate3d(${currentPanelX}px, ${currentPanelY}px, 0)`;
                    dragPanelThrottleTimer = null;
                });
            }
        }

        function dragPanelEnd(e) {
            initialPanelX = currentPanelX;
            initialPanelY = currentPanelY;
            isDraggingPanel = false;
            if (dragPanelThrottleTimer) {
                cancelAnimationFrame(dragPanelThrottleTimer);
                dragPanelThrottleTimer = null;
            }
            panel.style.willChange = 'auto';
        }

        // 绑定事件
        addBtn.onclick = () => {
            const word = addInput.value.trim();
            if (!word) {
                showNotification('内容不能为空！', 'error');
                return;
            }
            
            if (sensitiveWordManager.addWord(word)) {
                addInput.value = '';
                updateWordList();
                showNotification('敏感词添加成功！', 'success');
            } else {
                showNotification('该敏感词已存在！', 'warning');
            }
        };

        addInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // 防止表单提交等默认行为
                addBtn.click();
            }
        });

        resetBtn.onclick = () => {
            if (confirm('确定要重置为默认敏感词列表吗？\n\n这将清除所有自定义敏感词和本地配置！')) {
                // 清空本地保存的敏感词配置
                localStorage.removeItem('danmu_sensitive_words');
                
                // 重置敏感词配置对象到默认状态
                resetToDefaultConfig()

                // 重置敏感词管理器到默认状态
                sensitiveWordManager.saveWords(sensitiveWordsConfig.words);
                
                // 重置配置选项UI到默认状态
                configUI.resetToDefault();
                
                // 强制刷新敏感词列表显示
                updateWordList();
                
                // 清空输入框
                addInput.value = '';
                
                showNotification('重置默认设置成功！', 'success');
            }
        };

        saveConfigBtn.onclick = () => {
            sensitiveWordsConfig.enabled = enableCheckbox.checked;
            sensitiveWordsConfig.caseSensitive = caseCheckbox.checked;
            sensitiveWordsConfig.fuzzyMatch = fuzzyCheckbox.checked;
            sensitiveWordsConfig.showLogBoxByDefault = showLogBoxCheckbox.checked;
            
            // 验证并设置容量值
            const capacityValue = parseInt(capacityInput.value);
            if (capacityValue >= 10 && capacityValue <= 1000) {
                sensitiveWordsConfig.logBoxCapacity = capacityValue;
            } else {
                showNotification('容量值必须在10-1000之间！', 'warning', 3000);
                return;
            }
            
            // 保存配置到localStorage
            const config = {
                words: sensitiveWordManager.getWords(),
                enabled: sensitiveWordsConfig.enabled,
                caseSensitive: sensitiveWordsConfig.caseSensitive,
                fuzzyMatch: sensitiveWordsConfig.fuzzyMatch,
                showLogBoxByDefault: sensitiveWordsConfig.showLogBoxByDefault,
                logBoxCapacity: sensitiveWordsConfig.logBoxCapacity
            };
            localStorage.setItem('danmu_sensitive_words', JSON.stringify(config));
            
            // 如果弹幕记录板显示配置发生变化，需要重新创建或隐藏弹幕记录板
            const logBox = document.getElementById('danmu-log-box');
            if (sensitiveWordsConfig.showLogBoxByDefault) {
                // 如果启用默认显示，确保弹幕记录板存在并显示
                if (!logBox) {
                    createDanmuLogBox();
                } else {
                    logBox.style.display = 'block';
                    logBox.removeAttribute('data-closed');
                }
            } else {
                // 如果禁用默认显示，隐藏弹幕记录板
                if (logBox) {
                    logBox.style.display = 'none';
                    logBox.setAttribute('data-closed', 'true');
                }
            }
            
            // 显示保存成功提示
            showSaveSuccessNotification();
        };

        // 清空输入框的函数
        function clearInput() {
            addInput.value = '';
        }

        closeBtn.onclick = () => {
            managerModal.style.display = 'none';
            clearInput();
        };

        managerModal.onclick = (e) => {
            if (e.target === managerModal) {
                managerModal.style.display = 'none';
                clearInput();
            }
        };

        // 初始化显示
        updateWordList();
    }

    // 统一的通知函数
    function showNotification(message, type = 'info', duration = 3000) {
        // 检查是否已存在通知
        let notification = document.getElementById('unified-notification');
        if (notification) {
            notification.remove();
        }

        // 根据类型设置样式
        let bgColor, borderColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'linear-gradient(135deg, #4CAF50, #45a049)';
                borderColor = '#2e7d32';
                icon = '✅';
                break;
            case 'error':
                bgColor = 'linear-gradient(135deg, #f44336, #d32f2f)';
                borderColor = '#b71c1c';
                icon = '❌';
                break;
            case 'warning':
                bgColor = 'linear-gradient(135deg, #ff9800, #f57c00)';
                borderColor = '#e65100';
                icon = '⚠️';
                break;
            default:
                bgColor = 'linear-gradient(135deg, #2196F3, #1976d2)';
                borderColor = '#0d47a1';
                icon = 'ℹ️';
        }

        // 创建通知元素
        notification = document.createElement('div');
        notification.id = 'unified-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${bgColor};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 30000;
            font-family: 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            border: 2px solid ${borderColor};
            animation: slideDown 0.3s ease-out;
            user-select: none;
            pointer-events: auto;
            cursor: pointer;
        `;

        // 添加CSS动画（如果还没有添加）
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                @keyframes fadeOut {
                    from {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        notification.innerHTML = `${icon} ${message}`;
        document.body.appendChild(notification);

        // 自动消失
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification && notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);

        // 点击通知也可以关闭
        notification.onclick = () => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        };
    }

    // 显示保存成功通知（保持兼容性）
    function showSaveSuccessNotification() {
        showNotification('配置保存成功！', 'success', 5000);
    }

    // 统一的标题处理函数：清理标题并解析为主播名和直播名
    function processPageTitle(title) {
        if (!title) return { streamer: '', streamName: '', cleanTitle: '' };
        
        // 1. 去除无用的平台后缀
        const platformSuffixes = [
            ' - 哔哩哔哩直播，二次元弹幕直播平台',
            ' - 哔哩哔哩直播',
            ' - bilibili直播',
            ' - B站直播',
            ' - 哔哩哔哩',
            ' - bilibili',
            ' - B站',
            ' - 直播',
            ' - Live',
            ' - LIVE'
        ];
        
        let cleanTitle = title.trim();
        for (const suffix of platformSuffixes.sort((a, b) => b.length - a.length)) {
            if (cleanTitle.endsWith(suffix)) {
                cleanTitle = cleanTitle.slice(0, -suffix.length).trim();
                break;
            }
        }
        
        // 2. 解析主播名和直播名
        const parts = cleanTitle.split(' - ');
        let streamer = '', streamName = '';
        
        if (parts.length >= 2) {
            streamer = parts[parts.length - 1].trim();
            streamName = parts.slice(0, -1).join(' - ').trim();
        } else if (cleanTitle.length <= 10) {
            streamer = cleanTitle;
        } else {
            streamName = cleanTitle;
        }
        
        // 3. 清理文件名中的特殊字符
        const sanitize = (text) => {
            if (!text) return '';
            return text
                .replace(/[<>:"/\\|?*\s]+/g, '_')  // 替换特殊字符和空格
                .replace(/_{2,}/g, '_')            // 合并连续下划线
                .replace(/^_|_$/g, '')             // 去除首尾下划线
                .substring(0, 30);                // 限制长度
        };
        
        return {
            streamer: sanitize(streamer),
            streamName: sanitize(streamName),
            cleanTitle: cleanTitle
        };
    }

    // 保存弹幕记录到文件 - 优化版本
    function saveDanmuLogs(contentArea, saveBtn) {
        const entries = contentArea.children;
        if (entries.length === 0) {
            showNotification('没有弹幕记录可保存！', 'warning', 3000);
            return;
        }

        // 使用StringBuilder模式优化字符串拼接 - 简化排版
        const titleInfo = processPageTitle(document.title);
        const saveContent = [
            '================================================',
            '                弹幕记录保存文件',
            '================================================',
            '',
            '📅 保存时间: ' + new Date().toLocaleString(),
            '🎮 直播名称: ' + (titleInfo.streamName || '未知'),
            '👤 主播名称: ' + (titleInfo.streamer || '未知'),
            '📊 记录总数: ' + entries.length + ' 条',
            '',
            '================================================',
            '                    详细记录',
            '================================================',
            ''
        ];

        // 统计信息
        let systemCount = 0;
        let userCount = 0;
        let normalCount = 0;

        // 使用更高效的遍历方式
        Array.from(entries).forEach(entry => {
            const timeDiv = entry.querySelector('div:nth-child(1)');
            const typeDiv = entry.querySelector('div:nth-child(2)');
            
            if (!timeDiv || !typeDiv) return;
            
            const type = typeDiv.textContent;
            const time = timeDiv.textContent;
            
            // 检查是否有敏感词div（第3个div）
            const sensitiveDiv = entry.querySelector('div:nth-child(3)');
            let contentDiv, sensitiveWordsInfo = '';
            
            if (sensitiveDiv && sensitiveDiv.textContent.includes('检测到敏感词')) {
                // 有敏感词的情况：第3个div是敏感词，第4个div是内容
                contentDiv = entry.querySelector('div:nth-child(4)');
                sensitiveWordsInfo = sensitiveDiv.textContent.replace('⚠️ 检测到敏感词: ', '');
            } else {
                // 没有敏感词的情况：第3个div就是内容
                contentDiv = entry.querySelector('div:nth-child(3)');
            }
            
            if (!contentDiv) return;
            
            // 获取弹幕内容，需要去除HTML标签但保留文本内容
            let content = contentDiv.innerHTML;
            // 去除HTML标签，保留纯文本内容
            content = content.replace(/<[^>]*>/g, '');

            // 统计数量
            if (type.includes('系统屏蔽')) systemCount++;
            else if (type.includes('主播屏蔽')) userCount++;
            else if (type.includes('正常显示')) normalCount++;

            // 根据类型选择图标和颜色标识
            let typeIcon, typeColor;
            if (type.includes('系统屏蔽')) {
                typeIcon = '🚫';
                typeColor = '[系统屏蔽]';
            } else if (type.includes('主播屏蔽')) {
                typeIcon = '⚠️';
                typeColor = '[主播屏蔽]';
            } else {
                typeIcon = '✅';
                typeColor = '[正常显示]';
            }

            // 添加简化的弹幕记录格式
            saveContent.push('----------------------------------------');
            saveContent.push(`${typeIcon} ${typeColor} | 🕐 ${time}`);
            saveContent.push('----------------------------------------');
            saveContent.push('📝 弹幕内容:');
            
            // 处理长文本换行
            const maxLineLength = 50; // 每行最大字符数
            const lines = content.match(new RegExp(`.{1,${maxLineLength}}`, 'g')) || [content];
            lines.forEach(line => {
                saveContent.push(`   ${line}`);
            });
            
            // 如果有敏感词信息，添加到保存内容中
            if (sensitiveWordsInfo) {
                saveContent.push('');
                saveContent.push(`🔍 敏感词: ${sensitiveWordsInfo}`);
            }
            
            saveContent.push('');
        });

        // 添加统计信息 - 优化显示，使用百分比和固定长度进度条
        saveContent.push('================================================');
        saveContent.push('                    统计信息');
        saveContent.push('================================================');
        saveContent.push('');
        saveContent.push('📊 弹幕类型统计:');
        
        // 计算百分比
        const total = entries.length;
        const systemPercent = total > 0 ? Math.round((systemCount / total) * 100) : 0;
        const userPercent = total > 0 ? Math.round((userCount / total) * 100) : 0;
        const normalPercent = total > 0 ? Math.round((normalCount / total) * 100) : 0;
        
        // 固定长度进度条（20个字符）
        const maxBarLength = 20;
        const systemBarLength = Math.round((systemCount / Math.max(total, 1)) * maxBarLength);
        const userBarLength = Math.round((userCount / Math.max(total, 1)) * maxBarLength);
        const normalBarLength = Math.round((normalCount / Math.max(total, 1)) * maxBarLength);
        
        saveContent.push('🚫 系统屏蔽: ' + String(systemCount).padStart(3) + ' 条 (' + String(systemPercent).padStart(3) + '%) ' + '█'.repeat(systemBarLength) + ' '.repeat(maxBarLength - systemBarLength));
        saveContent.push('⚠️ 主播屏蔽: ' + String(userCount).padStart(3) + ' 条 (' + String(userPercent).padStart(3) + '%) ' + '█'.repeat(userBarLength) + ' '.repeat(maxBarLength - userBarLength));
        saveContent.push('✅ 正常显示: ' + String(normalCount).padStart(3) + ' 条 (' + String(normalPercent).padStart(3) + '%) ' + '█'.repeat(normalBarLength) + ' '.repeat(maxBarLength - normalBarLength));
        saveContent.push('');
        saveContent.push(`📈 总计: ${entries.length} 条弹幕记录`);
        saveContent.push('');
        saveContent.push('================================================');
        saveContent.push('                感谢使用弹幕反诈脚本');
        saveContent.push('================================================');

        // 创建下载链接 - 优化内存使用
        const blob = new Blob([saveContent.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // 生成文件名：主播_直播名_时间
        const now = new Date();
        const timePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        
        const { streamer, streamName } = titleInfo;
        let filename;
        if (streamer && streamName) {
            filename = `${streamer}_${streamName}_${timePart}.txt`;
        } else if (streamer) {
            filename = `${streamer}_${timePart}.txt`;
        } else if (streamName) {
            filename = `${streamName}_${timePart}.txt`;
        } else {
            filename = `弹幕记录_${timePart}.txt`;
        }
        a.download = filename;
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
        saveBtn.style.background = 'linear-gradient(135deg, #2196F3, #1976d2)';
        showNotification('弹幕记录保存成功！', 'success', 2000);
        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
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

    // 记录弹幕到文本框 - 优化版本，支持敏感词高亮
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

        // 检测敏感词并高亮显示
        // 对于正常弹幕（type === 'normal'），直接跳过所有检测，使用原始内容
        let highlightedContent = content;
        let detectedWords = [];

        // 弹幕内容被系统活主播屏蔽，对弹幕进行敏感词检测
        if (type === 'system' || type === 'user') {
            highlightedContent = sensitiveWordManager.highlightSensitiveWords(content);
            detectedWords = sensitiveWordManager.detectSensitiveWords(content);
        }
        
        // 使用DocumentFragment批量操作DOM
        const fragment = document.createDocumentFragment();
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 8px;
            padding: 12px;
            border-left: 4px solid ${config.color};
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
            border-radius: 8px;
            border: 1px solid rgba(0, 161, 214, 0.2);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
        `;
        
        // 弹幕记录项悬停效果
        logEntry.onmouseenter = () => {
            logEntry.style.transform = 'translateX(3px)';
            logEntry.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
            logEntry.style.borderColor = 'rgba(0, 161, 214, 0.5)';
        };
        logEntry.onmouseleave = () => {
            logEntry.style.transform = 'translateX(0)';
            logEntry.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
            logEntry.style.borderColor = 'rgba(0, 161, 214, 0.2)';
        };
        
        // 构建弹幕信息显示
        let danmuInfo = `
            <div style="font-size: 11px; color: #00a1d6; font-weight: bold; margin-bottom: 4px; text-shadow: 0 0 4px rgba(0, 161, 214, 0.3);">${timestamp}</div>
            <div style="color: ${config.color}; font-weight: bold; font-size: 12px; margin-bottom: 6px; text-shadow: 0 0 4px ${config.color}40;">[${config.text}]</div>
        `;
        
        // 如果有敏感词，添加敏感词提示
        if (detectedWords.length > 0) {
            const sensitiveWordsList = detectedWords.map(item => item.word).join(', ');
            danmuInfo += `<div style="font-size: 10px; color: #ff9800; margin: 4px 0; padding: 4px 8px; background: rgba(255, 152, 0, 0.1); border-radius: 4px; border-left: 3px solid #ff9800; font-weight: bold; text-shadow: 0 0 4px rgba(255, 152, 0, 0.3);">⚠️ 检测到敏感词: ${sensitiveWordsList}</div>`;
        }
        
        // 添加弹幕内容（支持HTML高亮）
        danmuInfo += `<div style="word-break: break-all; font-size: 13px; line-height: 1.4; margin-top: 6px; padding: 6px 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; border: 1px solid rgba(0, 161, 214, 0.1);">${highlightedContent}</div>`;
        
        logEntry.innerHTML = danmuInfo;
        
        fragment.appendChild(logEntry);
        contentArea.appendChild(fragment);
        contentArea.scrollTop = contentArea.scrollHeight;

        // 优化记录数量限制 - 批量删除旧记录
        const entries = contentArea.children;
        const maxCapacity = sensitiveWordsConfig.logBoxCapacity || sensitiveWordsConfig.defaultConfig.logBoxCapacity;
        if (entries.length > maxCapacity) {
            const toRemove = Array.from(entries).slice(0, entries.length - maxCapacity);
            toRemove.forEach(entry => entry.remove());
        }
    }


    // 从本地存储初始化敏感词配置
    function initSensitiveWordsConfig() {
        const saved = localStorage.getItem('danmu_sensitive_words');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                sensitiveWordsConfig.enabled = config.enabled !== undefined ? config.enabled : sensitiveWordsConfig.defaultConfig.enabled;
                sensitiveWordsConfig.caseSensitive = config.caseSensitive !== undefined ? config.caseSensitive : sensitiveWordsConfig.defaultConfig.caseSensitive;
                sensitiveWordsConfig.fuzzyMatch = config.fuzzyMatch !== undefined ? config.fuzzyMatch : sensitiveWordsConfig.defaultConfig.fuzzyMatch;
                sensitiveWordsConfig.showLogBoxByDefault = config.showLogBoxByDefault !== undefined ? config.showLogBoxByDefault : sensitiveWordsConfig.defaultConfig.showLogBoxByDefault;
                sensitiveWordsConfig.logBoxCapacity = config.logBoxCapacity !== undefined ? config.logBoxCapacity : sensitiveWordsConfig.defaultConfig.logBoxCapacity;
                if (config.words && Array.isArray(config.words)) {
                    sensitiveWordsConfig.words = config.words;
                }
            } catch (e) {
                console.warn('解析敏感词配置失败，使用默认配置');
                // 如果解析失败，清除损坏的配置
                localStorage.removeItem('danmu_sensitive_words');
            }
        } else {
            // 如果没有保存的配置，确保使用默认值
            resetToDefaultConfig()
        }
    }

    // 初始化配置
    initSensitiveWordsConfig();

    // 根据配置决定是否默认显示弹幕记录板
    if (sensitiveWordsConfig.showLogBoxByDefault) {
        // 延迟创建弹幕记录板，确保页面加载完成
        setTimeout(() => {
            createDanmuLogBox();
        }, 1000);
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
