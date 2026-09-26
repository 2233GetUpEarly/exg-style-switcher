(function () {
    'use strict';

    const KEY = 'user_bg_js_code';

    let canvas = null;
    let ctx = null;
    let W = 0;
    let H = 0;
    let rafId = null;
    let resizeHandler = null;
    let cleanups = [];
    /* ============================================================
     * canvas 背景
     * ============================================================ */
    function ensureCanvas() {
        if (canvas) return;
        canvas = document.createElement('canvas');
        canvas.id = 'user-bg-canvas';
        Object.assign(canvas.style, {
            position: 'fixed', inset: '0',
            width: '100%', height: '100%',
            zIndex: '-1', pointerEvents: 'none', background: 'transparent'
        });
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resizeHandler = function () {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resizeHandler);
        resizeHandler();
    }

    function stopUserCode() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (canvas) { canvas.remove(); canvas = null; ctx = null; }
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }

        // ★ 执行用户注册的清理
        while (cleanups.length) {
            try { cleanups.pop()(); } catch (e) { console.error('cleanup 出错:', e); }
        }

        // 兜底：清掉常见“自己建”的 canvas
        document.querySelectorAll('canvas').forEach(function (c) {
            if (c.id === 'myCanvas' || c.dataset.userBg === '1') c.remove();
        });
    }

    function runUserCode(code) {
        stopUserCode();
        cleanups = [];
        if (!code || !code.trim()) return;
        ensureCanvas();

        const env = {
            canvas: canvas,
            ctx: ctx,
            get W() { return W; },
            get H() { return H; },
            requestAnimationFrame: function (cb) {
                rafId = requestAnimationFrame(function (t) {
                    if (canvas) {
                        W = canvas.width = window.innerWidth;
                        H = canvas.height = window.innerHeight;
                    }
                    cb(t);
                });
                return rafId;
            },
            cancelAnimationFrame: cancelAnimationFrame,
            window: window,
            document: document,

            // 注册清理函数
            registerCleanup: function (fn) {
                if (typeof fn === 'function') cleanups.push(fn);
            }
        };

        try {
            const fn = new Function('env', `
                with (env) {
                    ${code}
                }
            `);
            fn(env);
        } catch (e) {
            console.error('用户脚本执行出错:', e);
            if (ctx) {
                ctx.fillStyle = '#f00';
                ctx.font = '16px monospace';
                ctx.fillText('脚本错误: ' + e.message, 20, 40);
            }
        }
    }

    /* ============================================================
     * 示例
     * ============================================================ */
    const SAMPLES = {
        '粒子星空': `
const stars = [];
for (let i = 0; i < 130; i++) {
    stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        a: Math.random() * 0.7 + 0.3
    });
}
function loop() {
    ctx.fillStyle = 'rgba(11,11,26,1)';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')';
        ctx.fill();
    }
    requestAnimationFrame(loop);
}
loop();
`,
        '流星雨': `
const stars = [], meteors = [];
for (let i = 0; i < 100; i++) {
    stars.push({ x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.2+0.2, a: Math.random()*0.7+0.2,
        tw: Math.random()*0.02+0.005 });
}
function loop() {
    ctx.fillStyle = 'rgba(2,3,10,0.35)';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
        s.a += s.tw;
        if (s.a > 0.95 || s.a < 0.15) s.tw *= -1;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,'+s.a+')'; ctx.fill();
    }
    for (let i = meteors.length-1; i>=0; i--) {
        const m = meteors[i];
        const tx = m.x - Math.cos(m.angle)*m.len;
        const ty = m.y - Math.sin(m.angle)*m.len;
        const g = ctx.createLinearGradient(m.x,m.y,tx,ty);
        g.addColorStop(0,'rgba(255,255,255,.9)');
        g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(tx,ty); ctx.stroke();
        m.x += Math.cos(m.angle)*m.speed;
        m.y += Math.sin(m.angle)*m.speed;
        if (m.x > W+100 || m.y > H+100) meteors.splice(i,1);
    }
    if (Math.random() < 0.03) {
        meteors.push({ x: Math.random()*W*1.2-W*0.2, y:-50,
            len: Math.random()*120+80, speed: Math.random()*6+6, angle: Math.PI/4 });
    }
    requestAnimationFrame(loop);
}
loop();
`,
        '渐变流动': `
let t = 0;
function loop() {
    t += 0.005;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'hsl(' + ((t*60)%360) + ', 45%, 12%)');
    g.addColorStop(0.5, 'hsl(' + ((t*60+120)%360) + ', 50%, 10%)');
    g.addColorStop(1, 'hsl(' + ((t*60+240)%360) + ', 55%, 14%)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(loop);
}
loop();
`,
        '黑客帝国代码雨': `
const canvas = document.createElement('canvas');
canvas.id = 'myCanvas';
Object.assign(canvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '-1',
    pointerEvents: 'none'
});
document.body.appendChild(canvas);

const width = canvas.width = window.innerWidth;
const height = canvas.height = window.innerHeight;
const ctx2 = canvas.getContext("2d");
const arr = Array(Math.ceil(width / 10)).fill(0);
const str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

function rain() {
    ctx2.fillStyle = "rgba(0,0,0,0.05)";
    ctx2.fillRect(0, 0, width, height);
    ctx2.fillStyle = "#0f0";
    arr.forEach(function (value, index) {
        ctx2.fillText(str[Math.floor(Math.random() * str.length)], index * 10, value + 10);
        arr[index] = value >= height || value > 8888 * Math.random() ? 0 : value + 10;
    });
    requestAnimationFrame(rain);
}
rain();
`,
        '代码雨':
`
// 自己建 canvas
const myCanvas = document.createElement('canvas');
myCanvas.id = 'myCanvas';
myCanvas.dataset.userBg = '1';   // 打标记，方便兜底清理
Object.assign(myCanvas.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '-1',
    pointerEvents: 'none'
});
document.body.appendChild(myCanvas);

const width = myCanvas.width = window.innerWidth;
const height = myCanvas.height = window.innerHeight;
const ctx2 = myCanvas.getContext("2d");
const arr = Array(Math.ceil(width / 10)).fill(0);
const str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

let myRaf = null;

function rain() {
    ctx2.fillStyle = "rgba(0,0,0,0.05)";
    ctx2.fillRect(0, 0, width, height);
    ctx2.fillStyle = "#0f0";
    arr.forEach(function (value, index) {
        ctx2.fillText(str[Math.floor(Math.random() * str.length)], index * 10, value + 10);
        arr[index] = value >= height || value > 8888 * Math.random() ? 0 : value + 10;
    });
    myRaf = requestAnimationFrame(rain);
}
rain();

// ★ 注册清理：框架停止/切主题时会调用
registerCleanup(function () {
    if (myRaf) cancelAnimationFrame(myRaf);
    myCanvas.remove();
});
`
    };

    /* ============================================================
     * 背景模块的 mount（由 UISlot 调用）
     * ============================================================ */
    function mount(container) {
        container.innerHTML = `
            <div style="font-size:12px;color:#ff9;margin-bottom:12px;">
                ⚠️ 代码直接在主页面运行，只运行你信任的代码
            </div>

            <div style="margin-bottom:8px;font-size:13px;opacity:.8;">快速示例：</div>
            <div id="sample-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;"></div>

            <input type="file" id="bgFile" accept=".js,.txt"
                style="margin-bottom:8px;color:#eee;font-size:12px;">

            <textarea id="bgText" placeholder="在此粘贴 JS 代码...
可用变量：canvas, ctx, W, H, requestAnimationFrame, window, document"
                style="width:100%;height:200px;box-sizing:border-box;
                background:#000;color:#0f0;border:1px solid #444;border-radius:6px;
                font-family:monospace;font-size:12px;padding:8px;resize:vertical;"></textarea>

            <div style="display:flex;gap:8px;margin-top:10px;">
                <button id="applyBtn" style="flex:1;padding:8px;border:none;border-radius:6px;
                    background:#667eea;color:#fff;cursor:pointer;font-weight:bold;">应用</button>
                <button id="clearBtn" style="flex:1;padding:8px;border:none;border-radius:6px;
                    background:rgba(255,255,255,.12);color:#eee;cursor:pointer;">清除</button>
            </div>
        `;

        const sampleList = container.querySelector('#sample-list');
        Object.keys(SAMPLES).forEach(function (name) {
            const b = document.createElement('button');
            b.textContent = name;
            Object.assign(b.style, {
                padding: '5px 10px', border: 'none', borderRadius: '6px',
                background: 'rgba(102,126,234,.35)', color: '#cfe0ff',
                cursor: 'pointer', fontSize: '12px'
            });
            b.onclick = function () {
                container.querySelector('#bgText').value = SAMPLES[name].trim();
            };
            sampleList.appendChild(b);
        });

        container.querySelector('#bgFile').onchange = function (e) {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = function (ev) {
                container.querySelector('#bgText').value = ev.target.result;
            };
            r.readAsText(f);
        };

        container.querySelector('#applyBtn').onclick = function () {
            const code = container.querySelector('#bgText').value;
            GM_setValue(KEY, code);
            runUserCode(code);
        };

        container.querySelector('#clearBtn').onclick = function () {
            GM_setValue(KEY, '');
            container.querySelector('#bgText').value = '';
            stopUserCode();
        };

        // 默认回填已保存
        container.querySelector('#bgText').value = GM_getValue(KEY, '');
    }

    /* ============================================================
     * 启动
     * ============================================================ */
    function init() {
        // 先恢复已保存的背景
        const saved = GM_getValue(KEY, '');
        if (saved) runUserCode(saved);

        // 注册到 UISlot
        if (window.UISlot && typeof window.UISlot.register === 'function') {
            window.UISlot.register({
                id: 'bg',
                title: '背景',
                icon: '🖼️',
                mount: mount
            });
        } else {
            console.warn('[style-switcher] UISlot 未加载');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();