import { test, expect } from '@playwright/test';

var context;
test('Login to Dice.com and Search and Apply', async ({ browser }) => {
    // Configure test timeout
    test.setTimeout(30 * 60 * 1000); // 30 minutes


    // Open a new browser context with full-screen dimensions
    context = await browser.newContext({
        // viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Go to the Dice login page
    await page.goto('https://www.dice.com/login');

    //open browser in full screen
    // Fill in the email and password fields
    await page.fill('input[name="email"]', 'sridathuqa@gmail.com');
    await page.click('button[type="submit"]');
    await page.fill('input[name="password"]', 'srIdathu@012');
    await page.waitForTimeout(2000);
    await page.click('button[type="submit"]');

    // Take a screenshot after login and after search page loads for debugging
    await page.screenshot({ path: 'test-results/after-login.png' });

    await page.waitForSelector('input[placeholder="Job title, skill, company, keyword"]', { state: 'visible' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/after-search-bar.png' });
    await page.getByRole('combobox', { name: 'Job title, skill, company,' }).fill('Automation Engineer');
    await page.getByRole('combobox', { name: 'Job title, skill, company,' }).press('Tab');
    await page.waitForTimeout(2000);
    await page.getByRole('combobox', { name: 'Location Field' }).fill('United States');
    await page.waitForSelector('//section[@role="group"]//div[@slot="option"]//span[text()="United States"]', { state: 'visible' });
    await page.getByText('United States', { exact: true }).nth(1).click();
    // Take a screenshot after location selection
    await page.screenshot({ path: `test-results/after-location.png` });
    await page.getByTestId('job-search-search-bar-search-button').click();
    await page.getByRole('button', { name: 'All filters' }).click();
    await page.locator('//label[contains(text(),"No preference")]').click();
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.screenshot({ path: 'test-results/after-filters.png' });

    let currentPage = 1;
    let totalPages = await page.locator('//section[contains(@aria-label,"Page 1 of ")]/span').nth(1).textContent();
    totalPages = parseInt(totalPages);
    console.log(`Total Pages: ${totalPages}`);
    // Loop through all pages
    while (currentPage <= totalPages) {
        console.log(`Current Page: ${currentPage}`);
        //wait for the search results to load
        await page.waitForSelector('div[data-testid="job-search-results-container"]', { state: 'visible' });
        await page.waitForTimeout(5000);
        //collect all easy apply buttons
        const easyApplyButtons1 = await page.$$('//span[text()="Easy Apply"]');
        console.log(`Easy Apply Buttons: ${easyApplyButtons1.length}`);
        if (easyApplyButtons1.length > 0) {
            //apply for each job
            await page.waitForTimeout(5000);
            await singlePageApply(easyApplyButtons1);
        }

        // Click on the page number
        await page.locator('//span[@aria-label="Next"]').click();

        currentPage++;
    }


})

async function singlePageApply(easyApplyButtons) {
    for (const [index, button] of easyApplyButtons.entries()) {
        // Check if the button is visible and enabled before clicking
        const isVisible = await button.isVisible();
        const isDisabled = await button.getAttribute('disabled');
        if (!isVisible || isDisabled) {
            console.log(`Skipping button ${index + 1}: not visible or disabled.`);
            continue;
        }
        // Take a screenshot before clicking Easy Apply
        await button.page().screenshot({ path: `test-results/before-easy-apply-${Date.now()}.png` });
        let newPage;
        try {
            // Click button and wait for new page
            [newPage] = await Promise.all([
                context.waitForEvent('page', { timeout: 10000 }),
                button.click({ force: true })
            ]);
        } catch (err) {
            console.log(`Failed to open new page for button ${index + 1}, skipping. Error:`, err);
            continue;
        }
        try {
            //wait for the new page to load
            await newPage.bringToFront();
            await newPage.waitForLoadState('domcontentloaded');
            //wait for the easy apply button to be visible
            await newPage.waitForSelector('#applyButton', { state: 'visible', timeout: 10000 });
            const jobTitle = await newPage.locator('//div[@id="applyButton"]/preceding::h1').textContent();
            console.log("On page with Job Title: " + jobTitle);
            // Take a screenshot before applying
            await newPage.screenshot({ path: `test-results/before-apply-${Date.now()}.png` });
            // Click the Easy Apply button
            await newPage.click('#applyButton', { force: true });
            //wait for the new page to load
            await newPage.waitForLoadState('domcontentloaded');
            //wait for the upload  application button to be visible
            (await newPage.waitForSelector('seds-icon[icon="cloud-upload"]', { state: 'visible', timeout: 10000 })).click();
            //upload the resume
            await newPage.setInputFiles('input[type="file"]', 'C:/Users/LENOVO/Desktop/final_draft/sridathu_CL.docx');
            //wait for the upload to complete
            await newPage.waitForTimeout(4000);//5 seconds

            await newPage.getByRole('button', { name: 'Upload', exact: true }).click();
            await newPage.getByRole('button', { name: 'Next' }).click();
            await newPage.getByRole('button', { name: 'Submit' }).click();

            //wait for the confirmation message to be visible
            await newPage.waitForSelector('//h1[text()="Application submitted. We\'re rooting for you."]', { state: 'visible', timeout: 10000 });
        } catch (err) {
            console.log(`Error during application process for button ${index + 1}, skipping to next. Error:`, err);
        } finally {
            if (newPage) {
                await newPage.close();
            }
        }
    }
}