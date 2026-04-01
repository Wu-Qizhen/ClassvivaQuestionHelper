/**
 * 代码不注释，同事两行泪！（给！爷！写！）
 * Elegance is not a dispensable luxury but a quality that decides between success and failure!
 * Created by Wu Qizhen on 2025.12.06
 */

// ==UserScript==
// @name         Classviva Question Helper | 题式精萃
// @description  智能提取 Classviva 题目、处理 LaTeX 公式，支持一键复制，可附加自定义提示词
// @author       Code IntelliX
// @version      0.2
// @icon         https://www.classviva.org/pluginfile.php?file=%2F1%2Fcore_admin%2Flogocompact%2F100x100%2F1731391655%2Ffavicon.png
// @match        *://*.classviva.org/*
// @match        *://*.classviva.hkust-gz.edu.cn/*
// @namespace    http://tampermonkey.net/
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ========== 配置 ==========
    const CONFIG = {
        debug: false,
        version: '0.2',
        author: 'Code IntelliX',
        github: 'https://github.com/Wu-Qizhen/ClassvivaQuestionHelper'
    };

    // 默认提示词配置
    const DEFAULT_CONFIG = {
        enablePrompt: false,
        promptText: '请使用 LaTeX 语法给出最终解答，并确保公式格式正确'
    };

    // ========== 日志工具 ==========
    const logger = {
        log: (...args) => CONFIG.debug && console.log('[CQH] ', ...args),
        error: (...args) => console.error('[CQH] ', ...args),
        warn: (...args) => console.warn('[CQH] ', ...args)
    };

    logger.log('脚本已加载，版本 ', CONFIG.version);

    // ========== 存储管理 ==========
    const StorageManager = {
        getEnablePrompt() {
            return GM_getValue('cv_enable_prompt', DEFAULT_CONFIG.enablePrompt);
        },
        setEnablePrompt(value) {
            GM_setValue('cv_enable_prompt', value);
        },
        getPromptText() {
            return GM_getValue('cv_prompt_text', DEFAULT_CONFIG.promptText);
        },
        setPromptText(text) {
            GM_setValue('cv_prompt_text', text);
        }
    };

    // ========== 样式管理 ==========
    const StyleManager = {
        init() {
            if (typeof GM_addStyle === "undefined") return;

            GM_addStyle(`
                /* 按钮样式覆盖 */
                .cv-copy-btn {
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                
                .cv-copy-btn:focus {
                    box-shadow: 0 0 0 3px rgba(45, 142, 10, 0.3) !important;
                }
                
                /* 模态框样式 */
                .cv-modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                    z-index: 9998;
                    display: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .cv-modal-backdrop.show {
                    display: block;
                    opacity: 1;
                }
                
                .cv-modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.9);
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                    width: 90%;
                    max-width: 500px;
                    opacity: 0;
                    transition: all 0.3s ease;
                    overflow: hidden;
                }
                
                .cv-modal.show {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                
                .cv-modal-header {
                    background: linear-gradient(135deg, #67c23a 0%, #3ecc5f 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .cv-modal-title {
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                }
                
                .cv-modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    font-weight: bold;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background-color 0.2s;
                }
                
                .cv-modal-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .cv-fun-close {}
                
                .cv-modal-body {
                    padding: 25px 25px 10px 25px;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                
                .cv-modal-footer {
                    padding: 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                
                .cv-feature-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    transition: background-color 0.2s;
                }
                
                .cv-feature-item:hover {
                    background: #e9ecef;
                }
                
                .cv-feature-icon {
                    color: #67c23a;
                    font-size: 20px;
                }
                
                .cv-feature-text {
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                }
                
                /* 设置区域样式 */
                .cv-settings-section {
                    margin: 0 0 20px;
                }
                
                .cv-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 15px;
                    color: #000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .cv-settings-item {
                    margin-left: 0;
                    margin-bottom: 5px;
                }
                
                /* 定位伪元素 */
                .cv-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-weight: 500;
                    color: #555;
                    position: relative; /* 为绝对定位的子元素提供参考 */
                }

                /* 隐藏原生 input */
                .cv-checkbox-label input {
                    position: absolute;
                    opacity: 0; /* 透明 */
                    width: 0;
                    height: 0;
                    margin: 0;
                    padding: 0;
                }
                
                /* 绘制方框 */
                .cv-checkbox-label::before {
                    content: '';
                    width: 16px;
                    height: 16px;
                    border: 1px solid #555;
                    border-radius: 4px;
                    background-color: #fff;
                    transition: all 0.2s;
                    flex-shrink: 0; /* 防止被文字挤压 */
                }
                
                /* 绘制“勾” */
                .cv-checkbox-label::after {
                    content: '';
                    position: absolute;
                    left: 6px; /* 勾的水平位置微调 */
                    top: 5px; /* 勾的垂直位置微调 */
                    width: 5px;
                    height: 8px;
                    border: solid white;
                    border-width: 0 2px 2px 0; /* 勾的粗细 */
                    transform: rotate(45deg) scale(0);
                    transition: transform 0.2s;
                }
                
                /* 选中状态改变方框颜色和显示勾 */
                .cv-checkbox-label:has(input:checked)::before {
                    background-color: #409eff;
                    border-color: #409eff;
                }
                
                .cv-checkbox-label:has(input:checked)::after {
                    transform: rotate(45deg) scale(1); /* 恢复大小，显示勾 */
                }
                
                .cv-prompt-textarea {
                    width: 100%;
                    border: 2px solid #f8f9fa;
                    border-radius: 10px;
                    background: #f8f9fa;
                    padding: 10px;
                    font-size: 12px;
                    font-family: inherit;
                    resize: vertical;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                
                .cv-prompt-textarea:focus {
                    outline: none;
                    border-color: #67c23a;
                }
                
                .cv-hint-text {
                    font-size: 12px;
                    color: #555;
                    margin-bottom: 5px;
                }
                
                .cv-version-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #555;
                    font-size: 14px;
                    font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                    margin-right: auto;
                }
                
                .cv-button {
                    padding: 6px 12px;
                    background: #67c23a;
                    color: white;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s;
                    outline: none !important;
                    border: none !important;
                    box-shadow: none !important;
                }
                
                .cv-button:hover {
                    background: #509f6c;
                    transform: translateY(-1px) !important;
                }
                
                .cv-button:active {
                    transform: scale(0.98) !important;
                }
                
                .cv-button-secondary {
                    background: #409eff;
                }
                
                .cv-button-secondary:hover {
                    background: #3375b9;
                }
                
                /* 导航栏图标样式 */
                .cv-nav-icon {
                    position: relative;
                    cursor: pointer;
                }
                
                /* 通知样式 */
                .cv-notification {
                    animation: cv-slideIn 0.3s ease;
                }
                
                @keyframes cv-slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `);
        }
    };

    // ========== 模态框管理 ==========
    const ModalManager = {
        backdrop: null,
        modal: null,
        isInitialized: false,
        enableCheckbox: null,
        promptTextarea: null,

        reset() {
            if (this.backdrop && this.backdrop.parentNode) {
                this.backdrop.remove();
            }
            if (this.modal && this.modal.parentNode) {
                this.modal.remove();
            }
            this.backdrop = null;
            this.modal = null;
            this.isInitialized = false;
            this.enableCheckbox = null;
            this.promptTextarea = null;
            logger.log('模态框已重置');
        },

        init() {
            if (this.isInitialized) return;

            // 创建背景遮罩
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'cv-modal-backdrop';
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) this.hide();
            });

            // 创建模态框
            this.modal = document.createElement('div');
            this.modal.className = 'cv-modal';
            this.modal.innerHTML = `
                <div class="cv-modal-header">
                    <h3 class="cv-modal-title">Classviva Question Helper | 题式精萃</h3>
                    <button class="cv-modal-close cv-fun-close cv-button" style="
                        background: transparent !important;
                        color: white !important;
                        padding: 0 !important;
                        min-width: auto !important;
                    ">✕</button>
                </div>
                <div class="cv-modal-body">
                     <!-- 设置区域：提示词选项 -->
                    <div class="cv-settings-section">
                        <div class="cv-title">
                            <span>⚙️</span> 设置
                        </div>
                        <div class="cv-settings-item">
                            <label class="cv-checkbox-label">
                                <input type="checkbox" id="cv-prompt-enable">
                                <span>启用提示词附加</span>
                            </label>
                            <div style="margin-left: 26px;">
                                <div class="cv-hint-text">
                                    💡 开启后，复制题目时会在末尾自动附加此提示词，方便向 AI 提问
                                </div>
                                <textarea id="cv-prompt-text" class="cv-prompt-textarea" rows="3" placeholder="输入附加提示词，例如：请用 LaTeX 语法给出最终解答"></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 功能特性 -->
                    <div class="cv-title">
                        <span>⭐</span> 功能特性
                    </div>
                    <div class="cv-feature-item">
                        <span class="cv-feature-icon">📋</span>
                        <div class="cv-feature-text">
                            <strong>智能提取</strong><br>
                            自动识别并提取题目，保持格式完整
                        </div>
                    </div>
                    <div class="cv-feature-item">
                        <span class="cv-feature-icon">🧮</span>
                        <div class="cv-feature-text">
                            <strong>公式处理</strong><br>
                            支持行内公式和显式公式，LaTeX 格式完美适配 AI 分析
                        </div>
                    </div>
                    <div class="cv-feature-item">
                        <span class="cv-feature-icon">⚡</span>
                        <div class="cv-feature-text">
                            <strong>一键复制</strong><br>
                            点击按钮即可复制题目内容，无需手动选择
                        </div>
                    </div>
                    <!-- <div class="cv-feature-item">
                        <span class="cv-feature-icon">🎯</span>
                        <div class="cv-feature-text">
                            <strong>即将推出</strong><br>
                            自动跳转与自动填充、批量处理等功能
                        </div>
                    </div> -->
                </div>
                <div class="cv-modal-footer">
                    <div class="cv-version-info">
                        <span>Version ${CONFIG.version} | Developed by ${CONFIG.author}</span>
                    </div>
                    <button class="cv-button cv-button-secondary" id="cv-github-btn">
                        项目主页
                    </button>
                    <button class="cv-button cv-fun-close">
                        确定
                    </button>
                </div>
            `;

            // 获取设置元素
            this.enableCheckbox = this.modal.querySelector('#cv-prompt-enable');
            this.promptTextarea = this.modal.querySelector('#cv-prompt-text');

            // 加载存储的设置
            this._loadSettings();

            // 绑定设置变化事件（实时保存）
            if (this.enableCheckbox) {
                this.enableCheckbox.addEventListener('change', () => {
                    StorageManager.setEnablePrompt(this.enableCheckbox.checked);
                    logger.log('提示词启用状态已保存：', this.enableCheckbox.checked);
                });
            }
            if (this.promptTextarea) {
                this.promptTextarea.addEventListener('input', () => {
                    StorageManager.setPromptText(this.promptTextarea.value);
                    logger.log('提示词内容已保存');
                });
            }

            // 绑定关闭按钮
            this.modal.querySelectorAll('.cv-fun-close').forEach(btn => {
                // 添加鼠标事件
                /*btn.addEventListener('mouseover', (e) => {
                    e.target.style.background = '#509f6c';
                });

                btn.addEventListener('mouseout', (e) => {
                    e.target.style.background = '#67c23a';
                });*/

                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.target.style.transform = 'scale(0.98)';
                });

                btn.addEventListener('mouseup', (e) => {
                    e.target.style.transform = 'scale(1)';
                });

                // 点击关闭功能
                btn.addEventListener('click', () => this.hide());
            });

            // 项目主页按钮
            const githubBtn = this.modal.querySelector('#cv-github-btn');
            if (githubBtn) {
                githubBtn.addEventListener('click', () => {
                    window.open(CONFIG.github, '_blank');
                });
            }

            document.body.appendChild(this.backdrop);
            document.body.appendChild(this.modal);
            this.isInitialized = true;

            logger.log('模态框已初始化');
        },

        _loadSettings() {
            if (this.enableCheckbox) {
                this.enableCheckbox.checked = StorageManager.getEnablePrompt();
            }
            if (this.promptTextarea) {
                this.promptTextarea.value = StorageManager.getPromptText();
            }
        },

        // 每次显示时同步最新设置（确保外部修改后显示正确）
        _syncSettings() {
            if (this.enableCheckbox) {
                this.enableCheckbox.checked = StorageManager.getEnablePrompt();
            }
            if (this.promptTextarea) {
                this.promptTextarea.value = StorageManager.getPromptText();
            }
        },

        show() {
            if (!this.isInitialized) this.init();
            this._syncSettings(); // 显示时同步最新设置

            this.backdrop.classList.add('show');
            this.modal.classList.add('show');
            document.body.style.overflow = 'hidden';

            logger.log('模态框显示');
        },

        hide() {
            this.backdrop.classList.remove('show');
            this.modal.classList.remove('show');
            document.body.style.overflow = '';

            logger.log('模态框隐藏');
        }
    };

    // ========== 通知管理 ==========
    const NotificationManager = {
        notificationElement: null,
        notificationTimeout: null,

        show(message) {
            this.clear();

            const aboutLi = document.getElementById('cv-nav-icon');
            const notificationsLi = document.querySelector('li.nav-item div#nav-notification-popover-container')?.closest('li');
            const targetInsertionPoint = aboutLi || notificationsLi;
            const navUl = targetInsertionPoint?.parentNode;

            if (!navUl || !targetInsertionPoint) {
                logger.error('无法显示通知：找不到导航栏');
                return;
            }

            this.notificationElement = document.createElement('li');
            this.notificationElement.className = 'nav-item d-flex align-items-center cv-notification mr-3';
            this.notificationElement.innerHTML = `
                <span style="
                    background: linear-gradient(135deg, #67c23a 0%, #3ecc5f 100%);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    box-shadow: 0 4px 12px rgba(45, 142, 10, 0.2);
                    white-space: nowrap;
                ">${message}</span>
            `;

            navUl.insertBefore(this.notificationElement, targetInsertionPoint);

            this.notificationTimeout = setTimeout(() => this.clear(), 3000);
            logger.log('通知显示：', message);
        },

        clear() {
            if (this.notificationTimeout) {
                clearTimeout(this.notificationTimeout);
                this.notificationTimeout = null;
            }

            if (this.notificationElement?.parentNode) {
                this.notificationElement.remove();
                this.notificationElement = null;
            }
        }
    };

    // ========== 内容提取器 ==========
    const ContentExtractor = {
        extract(container) {
            const clone = container.cloneNode(true);

            // 清理不需要的元素
            this._cleanElements(clone);

            // 提取内容
            const contentPieces = [];
            this._traverseNodes(clone, contentPieces);

            // 处理结果
            return this._processContent(contentPieces);
        },

        _cleanElements(element) {
            const selectors = [
                'input[type="hidden"]',
                'script:not([type*="math/tex"])',
                'button',
                '.material-icons',
                '.MathJax_Preview',
                'p.footer'
            ];

            selectors.forEach(selector => {
                element.querySelectorAll(selector).forEach(el => el.remove());
            });
        },

        _traverseNodes(node, pieces) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) pieces.push(text);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'SCRIPT' && node.type?.includes('math/tex')) {
                    const latex = node.textContent.trim();
                    if (latex) {
                        const isDisplay = node.type.includes('mode=display');
                        pieces.push(isDisplay ? `\\[${latex}\\]` : `\\(${latex}\\)`);
                    }
                } else if (!this._isMathJaxElement(node)) {
                    const isBlockElement = ['P', 'BR', 'DIV'].includes(node.tagName);
                    Array.from(node.childNodes).forEach(child => this._traverseNodes(child, pieces));
                    if (isBlockElement) pieces.push('\n\n');
                }
            }
        },

        _isMathJaxElement(element) {
            if (!element.classList) return false;
            const mathJaxClasses = ['MathJax_Preview', 'mjx-chtml', 'MathJax_CHTML', 'MathJax'];
            return mathJaxClasses.some(cls => element.classList.contains(cls));
        },

        _processContent(pieces) {
            return pieces
                .join(' ')
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .trim();
        }
    };

    // ========== 按钮管理器 ==========
    const ButtonManager = {
        init() {
            this._setupCopyButtons();
            this._setupNavIcon();
        },

        _setupCopyButtons() {
            const questions = document.querySelectorAll('div[id^="question-"]');
            let addedCount = 0;

            questions.forEach(questionDiv => {
                if (!/^question-\d+-\d+$/.test(questionDiv.id)) return;

                const infoElement = questionDiv.querySelector('.info');
                const contentElement = questionDiv.querySelector('.local_testopaqueqe');

                if (infoElement && contentElement && !infoElement.querySelector('.cv-copy-btn')) {
                    const button = this._createCopyButton(questionDiv.id, contentElement);
                    infoElement.appendChild(button);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                logger.log(`添加了 ${addedCount} 个复制按钮`);
            }
        },

        _createCopyButton(questionId, contentElement) {
            const button = document.createElement('button');
            button.className = 'cv-copy-btn';
            button.textContent = '复制题目';

            Object.assign(button.style, {
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '10px',
                padding: '6px 12px',
                background: '#67c23a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif"
            });

            // 事件处理
            button.addEventListener('mouseover', () => {
                button.style.background = '#509f6c';
                button.style.transform = 'translateY(-1px)';
                button.style.boxShadow = '0 4px 12px rgba(45, 142, 10, 0.3)';
            });

            button.addEventListener('mouseout', () => {
                button.style.background = '#67c23a';
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            });

            button.addEventListener('mousedown', (e) => {
                e.preventDefault();
                button.style.transform = 'scale(0.98)';
            });

            button.addEventListener('mouseup', () => {
                button.style.transform = 'scale(1)';
            });

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // 提取题目原始内容
                const originalContent = ContentExtractor.extract(contentElement);

                // 处理提示词附加
                let finalContent = originalContent;
                const enablePrompt = StorageManager.getEnablePrompt();
                const promptText = StorageManager.getPromptText();

                if (enablePrompt && promptText && promptText.trim() !== '') {
                    // 在末尾附加提示词，增加两个换行符使格式更清晰
                    finalContent = originalContent + '\n\n' + promptText.trim();
                    logger.log('已附加提示词');
                }

                // 复制到剪贴板
                GM_setClipboard(finalContent);

                // 显示反馈
                button.textContent = '✓ 已复制';
                button.style.background = 'linear-gradient(135deg, #4caf50 0%, #3ecc5f 100%)';
                const lastNumber = questionId.split('-').pop();
                const promptStatus = enablePrompt && promptText?.trim() ? '（含提示词）' : '';
                NotificationManager.show(`✓ 题目 ${lastNumber} 已复制${promptStatus}`);

                setTimeout(() => {
                    button.textContent = '复制题目';
                    button.style.background = 'linear-gradient(135deg, #67c23a 0%, #3ecc5f 100%)';
                }, 1500);

                logger.log(`已复制题目 ${lastNumber}`);
            });

            return button;
        },

        _setupNavIcon() {
            const notificationsLi = document.querySelector('li.nav-item div#nav-notification-popover-container')?.closest('li');
            const navUl = notificationsLi?.parentNode;

            if (!navUl || !notificationsLi) {
                logger.warn('导航栏未找到，无法添加图标');
                return;
            }

            // 移除旧的（如果存在）
            const oldIcon = document.getElementById('cv-nav-icon');
            if (oldIcon) oldIcon.remove();

            // 创建新图标
            const navIcon = document.createElement('li');
            navIcon.id = 'cv-nav-icon';
            navIcon.className = 'nav-item cv-nav-icon';
            navIcon.title = '题式精萃';
            navIcon.style.cursor = 'pointer';
            navIcon.style.marginRight = '10px';
            navIcon.style.display = 'flex';
            navIcon.style.flexDirection = 'column';
            navIcon.style.alignItems = 'center';
            navIcon.style.justifyContent = 'center';
            navIcon.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #67c23a 0%, #3ecc5f 100%);
                    padding: 6px 12px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 14px;
                    box-shadow: 0 4px 8px rgba(45, 142, 10, 0.2);
                    transition: all 0.2s ease;
                ">
                    题式精萃
                </div>
            `;

            /*navIcon.addEventListener('mouseover', () => {
                navIcon.style.background = 'linear-gradient(135deg, #3ecc5f 0%, #67c23a 100%)';
            });

            navIcon.addEventListener('mouseout', () => {
                navIcon.style.background = 'linear-gradient(135deg, #67c23a 0%, #3ecc5f 100%)';
            });*/

            navIcon.addEventListener('click', (e) => {
                e.preventDefault();
                ModalManager.show();
            });

            navUl.insertBefore(navIcon, notificationsLi);
            logger.log('导航栏图标已添加');
        }
    };

    // ========== 主控制器 ==========
    const MainController = {
        init() {
            logger.log('正在初始化');

            // 初始化样式
            StyleManager.init();

            // 重置并初始化模态框（确保使用最新版本，包含设置区域）
            ModalManager.reset();
            ModalManager.init();

            // 初始化组件
            ButtonManager.init();

            // 设置观察者
            this._setupObserver();

            // 显示欢迎通知
            setTimeout(() => {
                NotificationManager.show('✓ 就绪');
            }, 1000);

            logger.log('初始化完成');
        },

        _setupObserver() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // 检测新题目
                                if (node.matches('div[id^="question-"]') || node.querySelector('div[id^="question-"]')) {
                                    shouldUpdate = true;
                                }
                                // 检测导航栏变化
                                if (node.matches('li.nav-item') || node.closest('li.nav-item')) {
                                    if (!document.getElementById('cv-nav-icon')) {
                                        ButtonManager._setupNavIcon();
                                    }
                                }
                            }
                        });
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => ButtonManager._setupCopyButtons(), 200);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            logger.log('DOM 观察者已启动');
        }
    };

    // ========== 启动脚本 ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MainController.init());
    } else {
        MainController.init();
    }

    window.addEventListener('load', () => {
        // 确保在页面完全加载后再次检查
        setTimeout(() => ButtonManager._setupCopyButtons(), 500);
    });

})();
