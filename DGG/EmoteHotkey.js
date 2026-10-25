// ==UserScript==
// @name         DGG Chat Emote Hotkey
// @namespace    https://destiny.gg/
// @version      1.0.0
// @description  Adds a hotkey picker to destiny.gg chat to toggle the emote menu with a custom key combination.
// @author       Zed Agent
// @match        *://*.destiny.gg/embed/chat*
// @match        *://*.destiny.gg/chat*
// @match        *://*.destiny.gg/bigscreen*
// @match        *://*.destiny.gg/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=destiny.gg
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // Inject custom styles matching the Destiny.gg UI theme
    GM_addStyle(`
        #dgg-hotkey-picker-container {
            position: fixed;
            top: 8px;
            right: 40px;
            z-index: 10000;
            font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #eee;
            font-size: 11px;
            user-select: none;
        }

        .dgg-hotkey-compact-view {
            background: rgba(20, 20, 20, 0.9);
            border: 1px solid #333;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
        }

        .dgg-hotkey-compact-view:hover {
            background: rgba(30, 30, 30, 0.95);
            border-color: #3c8a2e; /* Destiny green hover */
        }

        .dgg-hotkey-icon {
            font-size: 13px;
        }

        .dgg-hotkey-text {
            font-weight: bold;
            color: #449e33; /* Destiny green text */
        }

        .dgg-hotkey-expanded-view {
            background: #111111;
            border: 1px solid #3c8a2e;
            border-radius: 6px;
            padding: 12px;
            width: 220px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.8);
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 4px;
        }

        .dgg-hotkey-title {
            font-weight: bold;
            text-align: center;
            color: #fff;
            border-bottom: 1px solid #222;
            padding-bottom: 6px;
            font-size: 12px;
        }

        .dgg-hotkey-btn {
            background: #1a1a1a;
            border: 1px solid #444;
            color: #eee;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            font-size: 12px;
            text-align: center;
            transition: all 0.2s ease;
        }

        .dgg-hotkey-btn:hover {
            background: #252525;
            border-color: #3c8a2e;
        }

        .dgg-hotkey-btn.recording {
            background: #3c8a2e;
            border-color: #449e33;
            color: #fff;
            animation: dgg-pulse 1.5s infinite;
        }

        @keyframes dgg-pulse {
            0% { opacity: 1; }
            50% { opacity: 0.6; }
            100% { opacity: 1; }
        }

        .dgg-hotkey-hint {
            font-size: 10px;
            color: #888;
            text-align: center;
            line-height: 1.3;
        }

        .dgg-hotkey-footer {
            display: flex;
            gap: 6px;
            justify-content: space-between;
            margin-top: 4px;
        }

        .dgg-hotkey-sub-btn {
            background: #1a1a1a;
            border: 1px solid #333;
            color: #aaa;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            flex: 1;
            text-align: center;
            transition: all 0.15s ease;
        }

        .dgg-hotkey-sub-btn:hover {
            background: #222;
            color: #fff;
            border-color: #888;
        }

        #dgg-hotkey-reset-btn:hover {
            border-color: #b33a3a;
            color: #ff6b6b;
        }
    `);

    // State Variables
    let isRecording = false;

    // Default Emote Shortcut: Alt + E
    const defaultHotkey = {
        ctrlKey: false,
        altKey: true,
        shiftKey: false,
        metaKey: false,
        key: 'e',
        code: 'KeyE',
        display: 'Alt + E'
    };

    let currentHotkey = defaultHotkey;

    // Load hotkey representation from GM storage
    function loadHotkey() {
        const saved = GM_getValue('emote_hotkey');
        if (saved) {
            try {
                currentHotkey = JSON.parse(saved);
            } catch (e) {
                console.error('[DGG Emote Hotkey] Failed to parse saved hotkey, reverting to default:', e);
                currentHotkey = defaultHotkey;
            }
        }
    }

    // Save hotkey representation to GM storage
    function saveHotkey(hotkey) {
        currentHotkey = hotkey;
        try {
            GM_setValue('emote_hotkey', JSON.stringify(hotkey));
        } catch (e) {
            console.error('[DGG Emote Hotkey] Failed to save hotkey:', e);
        }
    }

    // Helper to click the emote menu button
    function toggleEmoteMenu() {
        const btn = document.getElementById('chat-emoticon-btn');
        if (btn) {
            btn.click();
        } else {
            console.warn('[DGG Emote Hotkey] Could not find the Emote button (#chat-emoticon-btn) in the DOM.');
        }
    }

    // Inject hotkey UI picker
    function injectUI() {
        if (document.getElementById('dgg-hotkey-picker-container')) return;

        const container = document.createElement('div');
        container.id = 'dgg-hotkey-picker-container';

        container.innerHTML = `
            <div class="dgg-hotkey-compact-view" id="dgg-hotkey-compact" title="Click to edit emote hotkey">
                <span class="dgg-hotkey-icon">⌨️</span>
                <span class="dgg-hotkey-text" id="dgg-hotkey-display-compact">Alt + E</span>
            </div>
            <div class="dgg-hotkey-expanded-view" id="dgg-hotkey-expanded" style="display: none;">
                <div class="dgg-hotkey-title">Emote Menu Hotkey</div>
                <button class="dgg-hotkey-btn" id="dgg-hotkey-record-btn">Alt + E</button>
                <div class="dgg-hotkey-hint">Click the button, then press your desired key combination. Escape to cancel.</div>
                <div class="dgg-hotkey-footer">
                    <button class="dgg-hotkey-sub-btn" id="dgg-hotkey-reset-btn">Reset</button>
                    <button class="dgg-hotkey-sub-btn" id="dgg-hotkey-close-btn">Close</button>
                </div>
            </div>
        `;

        // Try to find a native header/top elements to append to for perfect scrolling/scoping
        const target = document.querySelector('.chat-header') ||
                       document.querySelector('#chat-header') ||
                       document.querySelector('.chat-title') ||
                       document.body;

        if (target !== document.body) {
            container.style.position = 'absolute';
            container.style.top = '6px';
            container.style.right = '40px';
        } else {
            container.style.position = 'fixed';
            container.style.top = '8px';
            container.style.right = '40px';
        }

        target.appendChild(container);

        // UI Event Listeners
        const compactView = document.getElementById('dgg-hotkey-compact');
        const expandedView = document.getElementById('dgg-hotkey-expanded');
        const recordBtn = document.getElementById('dgg-hotkey-record-btn');
        const resetBtn = document.getElementById('dgg-hotkey-reset-btn');
        const closeBtn = document.getElementById('dgg-hotkey-close-btn');

        compactView.addEventListener('click', function(e) {
            e.stopPropagation();
            const isHidden = expandedView.style.display === 'none';
            expandedView.style.display = isHidden ? 'flex' : 'none';
        });

        expandedView.addEventListener('click', function(e) {
            e.stopPropagation();
        });

        document.addEventListener('click', function() {
            expandedView.style.display = 'none';
        });

        recordBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (!isRecording) {
                startRecording();
            }
        });

        resetBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            saveHotkey(defaultHotkey);
            updateUI();
        });

        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            expandedView.style.display = 'none';
        });

        updateUI();
    }

    // Update displays to match stored shortcut
    function updateUI() {
        const compactDisplay = document.getElementById('dgg-hotkey-display-compact');
        const recordBtn = document.getElementById('dgg-hotkey-record-btn');

        const displayText = currentHotkey ? currentHotkey.display : 'None';

        if (compactDisplay) compactDisplay.textContent = displayText;
        if (recordBtn) recordBtn.textContent = displayText;
    }

    // Recording Logic
    function startRecording() {
        isRecording = true;
        const recordBtn = document.getElementById('dgg-hotkey-record-btn');
        recordBtn.textContent = 'Recording... Press Keys';
        recordBtn.classList.add('recording');

        function onRecordKeyDown(e) {
            e.preventDefault();
            e.stopPropagation();

            // Escape with no modifiers cancels the recording
            if (e.key === 'Escape' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                stopRecording();
                return;
            }

            const isModifier = ['Control', 'Alt', 'Shift', 'Meta'].includes(e.key);

            let modifiers = [];
            if (e.ctrlKey) modifiers.push('Ctrl');
            if (e.altKey) modifiers.push('Alt');
            if (e.shiftKey) modifiers.push('Shift');
            if (e.metaKey) modifiers.push('Cmd');

            if (isModifier) {
                // Update text to show active modifiers being held
                recordBtn.textContent = modifiers.join(' + ') + ' + ...';
                return;
            }

            // Capture non-modifier key press
            let keyName = e.key;
            if (keyName === ' ') {
                keyName = 'Space';
            } else if (keyName.length === 1) {
                keyName = keyName.toUpperCase();
            }

            const finalDisplay = [...modifiers, keyName].join(' + ');

            const newHotkey = {
                ctrlKey: e.ctrlKey,
                altKey: e.altKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey,
                key: e.key,
                code: e.code,
                display: finalDisplay
            };

            saveHotkey(newHotkey);
            stopRecording();
        }

        function stopRecording() {
            isRecording = false;
            recordBtn.classList.remove('recording');
            window.removeEventListener('keydown', onRecordKeyDown, true);
            updateUI();
        }

        // Intercept keys on capture phase to prevent browser action
        window.addEventListener('keydown', onRecordKeyDown, true);
    }

    // Global Key Listener for Triggering the Emote Menu
    window.addEventListener('keydown', function(e) {
        if (isRecording || !currentHotkey) return;

        // Check if focused in input or textarea
        const activeEl = document.activeElement;
        const isInputFocused = activeEl && (
            activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable
        );

        // Match key/code and modifiers
        const keyMatches = (
            e.key.toLowerCase() === currentHotkey.key.toLowerCase() ||
            e.code === currentHotkey.code
        );

        const modifiersMatch = (
            e.ctrlKey === currentHotkey.ctrlKey &&
            e.altKey === currentHotkey.altKey &&
            e.shiftKey === currentHotkey.shiftKey &&
            e.metaKey === currentHotkey.metaKey
        );

        if (keyMatches && modifiersMatch) {
            // Smart Input Protection:
            // If focused in chat input and binding is a single printable key without modifiers,
            // ignore the shortcut so typing is not interrupted.
            if (isInputFocused) {
                const hasModifiers = currentHotkey.ctrlKey || currentHotkey.altKey || currentHotkey.metaKey;
                if (!hasModifiers) {
                    const isSpecialKey = /^F[0-9]+$/.test(currentHotkey.key) ||
                                         ['Escape', 'Tab', 'PageUp', 'PageDown', 'End', 'Home'].includes(currentHotkey.key);
                    if (!isSpecialKey) {
                        return; // Let user type normally
                    }
                }
            }

            // Execute toggle
            e.preventDefault();
            e.stopPropagation();
            toggleEmoteMenu();
        }
    }, true);

    // Initialization: Wait until the document body exists and then inject the UI
    function init() {
        loadHotkey();
        injectUI();

        // Re-inject if DOM changes dynamically (e.g. iframe switches embeds or navigates)
        const observer = new MutationObserver(function() {
            injectUI();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.body) {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }
})();
