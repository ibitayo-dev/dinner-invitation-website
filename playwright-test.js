const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    await page.goto('http://localhost:4200');
    await page.evaluate(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .hero-composition {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2vw;
                width: 100%;
                /* Aggressively scale down so it never cuts off a 14-character string + image */
                padding: 0 4vw;
                box-sizing: border-box;
            }
            .hero-name {
                flex: 0 1 auto;
                min-width: 0;
            }
            .hero-name--left { justify-content: flex-end; }
            .hero-name--right { justify-content: flex-start; }
            .hero-name h1, .hero-name p {
                font-family: 'Playfair Display', serif !important;
                font-size: clamp(1.5rem, 6.2vw, 8rem) !important;
                font-style: italic !important;
                font-weight: 500 !important;
                letter-spacing: 0.05em !important;
                line-height: 1 !important;
                text-transform: uppercase !important;
                margin: 0;
                white-space: nowrap;
            }
            .hero-portrait {
                /* Text is ~1em tall. Make image a bit taller to match reference */
                width: clamp(70px, 12vw, 140px) !important;
                flex-shrink: 0;
            }
            .hero-portrait-frame {
                aspect-ratio: 3/4;
                border: 2px solid var(--ink) !important;
                padding: 4px !important; /* creates the inner matting effect from inspiration */
                background: #fff;
            }
        `;
        document.head.appendChild(style);
    });
    // Wait for fonts
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test_fixed.png', fullPage: false });
    await browser.close();
})();
