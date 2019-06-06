const {Builder, By, Key, until} = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const screen = {
    width: 640,
    height: 480
};
if (!process.argv[2])
    process.exit(0);
let config = require("./" + process.argv[2]);

async function main() {
    let driver = await new Builder().forBrowser("chrome").build();
    await login(driver);
}

async function login(driver) {
    console.log("Login called");
    await gotoPage(driver, "https://legacy.hackerexperience.com/index.php", true);
    await driver.findElement(By.id("login-username")).sendKeys(config.username);
    await driver.findElement(By.id("password")).sendKeys(config.password);
    let response = await solveWithAntiCaptcha("6Ld1KwITAAAAAB1taFKufv4_Tu5x_TEblkzWNDt8");
    await driver.executeScript("document.getElementById('g-recaptcha-response').value = '" + response + "';");
    await driver.findElement(By.id("login-submit")).click();
    await research(driver);
}

async function research(driver) {
    console.log("Research called");
    await gotoPage(driver, "https://legacy.hackerexperience.com/university");
    await driver.sleep(2000);
    await driver.findElement(By.id("s2id_research-list")).click();
    await driver.switchTo().activeElement().sendKeys(config.softwareName);
    let exists = await driver.findElement(By.id("select2-no-results")).then(function () {
        return false;
    }).catch(function () {
        return true;
    });
    if (!exists) {
        console.error("Cant find Software. Did you buy the license? " + softwareName);
        process.exit(0);
        return;
    }

    await driver.switchTo().activeElement().sendKeys(Key.RETURN);
    await driver.findElement(By.id("research")).click();
    if (config.deleteOld)
        await driver.findElement(By.name("delete")).click();
    if (config.captchaType === "anticaptcha") {
        let response = await solveWithAntiCaptcha("6LfCtBETAAAAAEJNqkKIAfLbH4mNx38wxGJV_ZUK");
        await driver.executeScript("document.getElementById('g-recaptcha-response').value = '" + response + "';");
        await driver.findElement(By.className("btn-success")).click();
    }
    let alreadyDone = await driver.findElement(By.className("btn-mini")).then(function () {
        return true;
    }).catch(function () {
        return false;
    });
    let source = await driver.getPageSource();
    let solvedCaptcha = !source.includes("The reCAPTCHA wasn't entered correctly.");
    if (!alreadyDone && solvedCaptcha) {
        let timeLeft = await driver.findElement(By.className("elapsed")).getAttribute("innerText");
        timeLeft += 10000;
        const parse = require("parse-duration");
        setTimeout(async function () {
            research(driver);
        }, parse(timeLeft));
    } else if (alreadyDone) {
        await driver.findElement(By.className("btn-mini")).click();
        research(driver);
    } else {
        research(driver);
    }
}

async function gotoPage(driver, link, loginVar = false) {
    console.log("GotoPage called");
    await driver.get(link);
    await driver.wait(until.titleContains("Hacker Experience"), 50000);
    let title = await driver.getTitle();
    if (title === "Hacker Experience" && loginVar === false) {
        await login(driver);
        await gotoPage(driver, link);
    }
}

async function solveWithAntiCaptcha(websiteKey) {
    console.log("solveWithAntiCaptcha called");
    const {AntiCaptcha} = require("anticaptcha");
    const AntiCaptchaAPI = new AntiCaptcha(config.apikey);
    try {
        const taskId = await AntiCaptchaAPI.createTask(
            "https://legacy.hackerexperience.com",
            websiteKey
        );
        console.log("Sent request to Anti-Captcha");
        const response = await AntiCaptchaAPI.getTaskResult(taskId, 100, 4000);
        console.log("Response from Anti-Captcha");
        return response.solution.gRecaptchaResponse;
    } catch (exc) {
        return solveWithAntiCaptcha(websiteKey);
    }
}

main();