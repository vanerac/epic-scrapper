const base_url = 'https://www.epicgames.com';
const pupeteer = require('puppeteer');
var browser, page;
const creds = require("./creds.json");


async function login(usernameOrEmail, password)
{
	console.log(`Logging in as ${usernameOrEmail}`);
	page.goto(`${base_url}/login/`);
	const response = await page.waitForNavigation({waituntil: 'domcontentloaded'});
	await response.request().redirectChain();

	await page.screenshot();
	await page.screenshot();
	await page.click('#login-with-epic');
	await page.type('#usernameOrEmail', usernameOrEmail);
	await page.type('#password', password);
	await page.click('[type=submit]');

	for (let i = 0; page.url() != 'https://www.epicgames.com/store/en-US/' && i < 10; ++i) {
			await page.waitFor(1000);
	}
	if (page.url() != 'https://www.epicgames.com/store/en-US/')
		return 0;
	console.log(`Logged in as ${usernameOrEmail}`);
	return 1;
}

async function get_games()
{
	await page.goto('https://www.epicgames.com/store/en-US/browse?sortBy=releaseDate&sortDir=DESC&pageSize=1000');
	await page.waitForSelector('img', {visible : true});

	let bite = await page.evaluate(() => {
			arr = [];
			let values = document.querySelectorAll("li")

			for (val of values) {
				if (String(val.className).includes("BrowseGrid-card") && val.outerText.includes('Free') && (val.outerText.includes('$') || val.outerText.includes('€'))) {

					let el = document.createElement( 'html' )
					el.innerHTML = val.innerHTML;

					val = el.getElementsByTagName('a')[0].getAttribute('href');
					arr.push(`https://www.epicgames.com${val}`)
				}
			}
			return arr;

	});
	console.log(bite);
	return bite;
}

async function buy_game(game_url)
{
	await page.goto(game_url);
	await page.waitForSelector('img', {visible : true});

		let status = await page.evaluate(() => {
			let values = [];
			let iter = document.querySelectorAll("button");

			for (val of iter) {
				if (val.innerHTML.includes('<span>Get</span>')) {
					values.push(val)
				}
			}
			if (values.length == 0)
				return 1;
			else {
				values[0].click();
			}
			return 0;
		});

		if (status)
			return 1;
		await page.waitFor(5000);
		status = await page.evaluate(() => {
			 v = document.getElementsByClassName("btn btn-primary");
			 if (v == 0)
			 		return 1;
			 v[0].click();
		});

		if (status)
			return;
		await page.waitFor(5000);
		await page.evaluate(() => {
			document.getElementsByClassName("btn btn-primary")[1].click()
		});

		await page.waitFor(5000);
		return 0;
}

async function main()
{
	browser = await pupeteer.launch({headless : true});
	page = await browser.newPage();
	await page.setJavaScriptEnabled(true);
	await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.61 Safari/537.36");

	const games = await get_games();

	console.log(`Found ${games.length} free games`);
	for (let cred of creds) {
		let status = await login(cred.usernameOrEmail, cred.password);

		if (!status) {
				console.log(`Failed to log in as ${cred.usernameOrEmail}`);
				continue;
		}

		for (let game of games) {
			if (await buy_game(game))
				console.log(`${game} Already Owned, skipping`);
			else
				console.log(`${game} Baught`);
		}
	}
	await browser.close();
}


main();