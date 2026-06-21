
(function () {
    const scriptSrc = document.currentScript?.src || "";
    const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf("/") + 1);
    const gifUrl = baseUrl + "img/loader.gif";
    const gifSize = 120;
    const title = "three-player-controller";
    const fade = 600;

    /* Google Fonts */
    if (!document.querySelector('link[href*="Cinzel"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=swap";
        document.head.appendChild(link);
    }

    const style = document.createElement("style");
    style.id = "__loader-style__";
    style.textContent = `
        html { height: 100%; }

        #__loading-overlay__ {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: #ececec;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity ${fade}ms cubic-bezier(0.4,0,0.2,1);
        }
        #__loading-overlay__.fade-out {
            opacity: 0;
            pointer-events: none;
        }
        .__ldr-content__ {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            user-select: none;
        }
        .__ldr-gif__ {
            width: ${gifSize}px;
            height: ${gifSize}px;
            object-fit: contain;
            display: block;
        }
        .__ldr-title__ {
            font-family: "Cinzel", serif;
            font-size: clamp(1.4rem, 3.5vw, 2.2rem);
            font-weight: 900;
            letter-spacing: 0.06em;
            white-space: nowrap;
            color: #1a1a2e;
            text-align: center;
        }
        .__ldr-progress__ {
            width: 220px;
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 6px;
        }
        .__ldr-track__ {
            width: 100%;
            height: 4px;
            background: rgba(0,0,0,0.12);
            border-radius: 2px;
            overflow: hidden;
        }
        .__ldr-fill__ {
            height: 100%;
            width: 0%;
            background: #4a7fcb;
            border-radius: 2px;
            transition: width 0.25s ease;
        }
        .__ldr-pct__ {
            font-family: system-ui, sans-serif;
            font-size: 12px;
            color: #555;
            letter-spacing: 0.05em;
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "__loading-overlay__";
    overlay.innerHTML = `
    <div class="__ldr-content__">
        <img class="__ldr-gif__" src="${gifUrl}" alt="loading" />
        <div class="__ldr-title__">${title}</div>
        <div class="__ldr-progress__" id="__ldr-progress__">
            <div class="__ldr-track__"><div class="__ldr-fill__" id="__ldr-fill__"></div></div>
            <div class="__ldr-pct__" id="__ldr-pct__">0%</div>
        </div>
    </div>`;

    document.documentElement.appendChild(overlay);

    /* Public API */
    window.setLoaderProgress = function (loaded, total) {
        const wrap = document.getElementById("__ldr-progress__");
        const fill = document.getElementById("__ldr-fill__");
        const pct  = document.getElementById("__ldr-pct__");
        if (!fill) return;
        if (wrap) wrap.style.display = "flex";
        if (total > 0) {
            const p = Math.min(100, Math.round(loaded / total * 100));
            fill.style.width = p + "%";
            if (pct) pct.textContent = p + "%";
        } else {
            // total 未知时显示已加载量
            const mb = (loaded / 1048576).toFixed(1);
            fill.style.width = "100%"; // 用满格表示"仍在加载"
            if (pct) pct.textContent = mb + " MB";
        }
    };

    window.hideLoader = function () {
        const el = document.getElementById("__loading-overlay__");
        if (!el) return;
        el.classList.add("fade-out");
        el.addEventListener("transitionend", () => {
            el.remove();
            document.getElementById("__loader-style__")?.remove();
        }, { once: true });
    };
})();