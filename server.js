
const express = require('express');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(stealthPlugin());

const app = express();
const PORT = 3000;

app.get('/eps/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const url = `https://research.investors.com/stock-quotes/nasdaq-${symbol.toLowerCase()}-${symbol}.htm`;

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

       
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
       
        await page.screenshot({ path: 'capture.png', fullPage: true });

        // Attend que le bloc EPS Rating apparaisse (jusqu’à 20s)
        try {
            await page.waitForSelector('ul.smartRating', { timeout: 20000 });
        } catch (e) {
            console.warn('Élément smartRating non trouvé après 20s.');
        }

        // Pause manuelle pour laisser le temps au DOM
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extraction du EPS Rating
        const eps = await page.evaluate(() => {
            const allULs = Array.from(document.querySelectorAll('ul.smartRating'));
            for (let ul of allULs) {
                const labelSpan = ul.querySelector('span.typespan');
                if (labelSpan && labelSpan.innerText.includes('EPS Rating')) {
                    const listItems = ul.querySelectorAll('li');
                    for (let li of listItems) {
                        const text = li.innerText.trim();
                        if (text && /^[0-9]+$/.test(text)) {
                            return text;
                        }
                    }
                }
            }
            return null;
        });               

        await browser.close();

        if (eps) {
            res.json({ symbol, epsRating: eps });
        } else {
            res.json({ symbol, epsRating: null, message: "EPS Rating non trouvé sur la page IBD." });
        }
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`EPS API listening at http://localhost:${PORT}`);
});
