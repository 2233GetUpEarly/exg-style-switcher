/* ui-slot.js
 * 通用插槽 UI 框架（供 @require 使用）
 * 暴露：window.UISlot = { register, init, open, close, toggle }
 *
 * 功能：
 *  - 统一的悬浮按钮 + 面板
 *  - 每个模块通过 register({ id, title, icon, mount }) 注册一个标签页
 *  - 面板自动根据注册的模块生成标签栏和内容区
 *  - 面板样式统一，模块只管在自己的容器里画 UI
 */

(function (global) {
    const BUTTON_ID = 'ui-slot-button';
    const PANEL_ID  = 'ui-slot-panel';

    let button = null;
    let panel = null;
    let tabBar = null;
    let pageContainer = null;
    let activeId = null;

    const modules = [];   // { id, title, icon, mount, container, tabBtn, pageEl }

    /* ============================================================
     * 创建按钮和面板骨架
     * ============================================================ */
    function createShell() {
        if (button) return;

        // 悬浮按钮
        button = document.createElement('div');
        button.id = BUTTON_ID;
        button.textContent = '🎨';
        Object.assign(button.style, {
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            color: '#fff',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: '2147483647',
            boxShadow: '0 4px 16px rgba(0,0,0,.35)',
            userSelect: 'none'
        });
        button.onclick = toggle;
        document.body.appendChild(button);

        // 面板
        panel = document.createElement('div');
        panel.id = PANEL_ID;
        Object.assign(panel.style, {
            position: 'fixed',
            right: '20px',
            bottom: '84px',
            width: '420px',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: 'rgba(25,25,35,.98)',
            color: '#eee',
            borderRadius: '14px',
            padding: '16px',
            zIndex: '2147483647',
            display: 'none',
            fontFamily: 'system-ui,"微软雅黑",sans-serif',
            fontSize: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,.5)'
        });

        // 标签栏
        tabBar = document.createElement('div');
        Object.assign(tabBar.style, {
            display: 'flex',
            gap: '8px',
            marginBottom: '14px'
        });
        panel.appendChild(tabBar);

        // 内容区
        pageContainer = document.createElement('div');
        panel.appendChild(pageContainer);

        document.body.appendChild(panel);
    }

    /* ============================================================
     * 注册模块
     * ============================================================ */
    function register(mod) {
        if (!mod || !mod.id || typeof mod.mount !== 'function') {
            console.warn('[UISlot] register 参数不合法:', mod);
            return;
        }

        createShell();

        // 标签按钮
        const tabBtn = document.createElement('button');
        tabBtn.textContent = (mod.icon || '') + ' ' + (mod.title || mod.id);
        Object.assign(tabBtn.style, {
            flex: '1',
            padding: '8px',
            border: 'none',
            borderRadius: '8px',
            background: 'rgba(255,255,255,.12)',
            color: '#eee',
            cursor: 'pointer',
            fontSize: '14px'
        });

        // 页面容器
        const pageEl = document.createElement('div');
        pageEl.style.display = 'none';

        tabBtn.onclick = function () { activate(mod.id); };

        tabBar.appendChild(tabBtn);
        pageContainer.appendChild(pageEl);

        const entry = {
            id: mod.id,
            title: mod.title || mod.id,
            icon: mod.icon || '',
            mount: mod.mount,
            container: pageEl,
            tabBtn: tabBtn,
            pageEl: pageEl,
            mounted: false
        };
        modules.push(entry);

        // 默认激活第一个
        if (!activeId) activate(mod.id);

        return entry;
    }

    /* ============================================================
     * 激活某个标签
     * ============================================================ */
    function activate(id) {
        const target = modules.find(function (m) { return m.id === id; });
        if (!target) return;

        activeId = id;

        modules.forEach(function (m) {
            const active = (m.id === id);
            m.pageEl.style.display = active ? 'block' : 'none';
            m.tabBtn.style.background = active
                ? 'linear-gradient(135deg,#667eea,#764ba2)'
                : 'rgba(255,255,255,.12)';
            m.tabBtn.style.fontWeight = active ? 'bold' : 'normal';
        });

        // 懒挂载
        if (!target.mounted) {
            try {
                target.mount(target.container);
                target.mounted = true;
            } catch (e) {
                console.error('[UISlot] mount 出错:', e);
                target.container.innerHTML =
                    '<div style="color:#f88;font-size:12px;">模块加载失败: ' + e.message + '</div>';
            }
        }
    }

    /* ============================================================
     * 开关
     * ============================================================ */
    function open() {
        createShell();
        panel.style.display = 'block';
    }

    function close() {
        if (panel) panel.style.display = 'none';
    }

    function toggle() {
        if (!panel) createShell();
        panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
    }

    /* ============================================================
     * 对外 API
     * ============================================================ */
    global.UISlot = {
        register: register,
        activate: activate,
        open: open,
        close: close,
        toggle: toggle,
        getModules: function () { return modules.slice(); }
    };

})(window);