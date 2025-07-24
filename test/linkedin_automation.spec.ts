import { test, expect } from '@playwright/test';

// Update these with your LinkedIn credentials
const LINKEDIN_EMAIL = 'your_email_here';
const LINKEDIN_PASSWORD = 'your_password_here';

// Update this with your resume file path
const RESUME_PATH = 'C:/Users/LENOVO/Desktop/final_draft/sridathu_CL.docx';

test('Login to LinkedIn and Easy Apply with Today filter', async ({ browser }) => {
    test.setTimeout(30 * 60 * 1000); // 30 minutes
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to LinkedIn login...');
    await page.goto('https://www.linkedin.com/login');
    await page.fill('input#username', 'sangishetti2000@gmail.com');
    await page.fill('input#password', 'srIdathu@0');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Take screenshot after login
    await page.screenshot({ path: 'test-results/after-login.png' });

    // Ensure we are on the main LinkedIn page after login
    let currentUrl = page.url();
    if (!currentUrl.includes('/feed')) {
        console.log('Redirecting to LinkedIn feed...');
        await page.goto('https://www.linkedin.com/feed/');
        await page.waitForLoadState('networkidle');
    }

    // Try to dismiss any modal/overlay by pressing Escape and clicking body
    try {
        await page.keyboard.press('Escape');
        await page.click('body', { timeout: 2000 });
        await page.waitForTimeout(1000);
    } catch (e) {
        console.log('No overlay to dismiss or error during overlay dismissal:', e);
    }

    // Dismiss possible popups after login
    try {
        // Dismiss "Turn on alerts" popup
        const alertsBtn = await page.$('button[aria-label="Dismiss"]');
        if (alertsBtn) {
            console.log('Dismissing alerts popup...');
            await alertsBtn.click();
            await page.waitForTimeout(1000);
        }
        // Dismiss cookie banner
        const cookieBtn = await page.$('button[aria-label*="Accept cookies"]');
        if (cookieBtn) {
            console.log('Accepting cookies...');
            await cookieBtn.click();
            await page.waitForTimeout(1000);
        }
    } catch (e) {
        console.log('No popups to dismiss or error during popup dismissal:', e);
    }

    // Go to Jobs page (force reload)
    console.log('Navigating to Jobs page...');
    await page.goto('https://www.linkedin.com/jobs/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/after-jobs-page.png' });

    // Wait for search fields to be visible and enabled, with retry
    let searchReady = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await page.waitForSelector('input[placeholder="Search jobs"]:not([disabled])', { state: 'visible', timeout: 10000 });
            await page.waitForSelector('input[placeholder="Search location"]:not([disabled])', { state: 'visible', timeout: 10000 });
            searchReady = true;
            break;
        } catch (e) {
            console.log(`Search fields not ready, retrying (${attempt + 1}/3)...`);
            await page.keyboard.press('Escape');
            await page.click('body', { timeout: 2000 });
            await page.waitForTimeout(2000);
        }
    }
    if (!searchReady) {
        await page.screenshot({ path: 'test-results/search-fields-failed.png' });
        throw new Error('Search fields not interactable after multiple attempts. See screenshot.');
    }
    await page.screenshot({ path: 'test-results/before-search.png' });

    // Fill in job title and location
    console.log('Filling job search fields...');
    await page.fill('input[placeholder="Search jobs"]', 'SDET');
    await page.fill('input[placeholder="Search location"]', 'United States');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Click on the Date Posted filter and select "Past 24 hours"
    console.log('Applying Date Posted filter...');
    await page.waitForSelector('button[aria-label*="Date posted filter"]', { timeout: 10000 });
    await page.click('button[aria-label*="Date posted filter"]');
    await page.waitForSelector('label[for*="timePostedRange-r86400"]', { timeout: 10000 });
    await page.click('label[for*="timePostedRange-r86400"]'); // Past 24 hours
    await page.waitForSelector('button[aria-label="Apply current filters to show results"]', { timeout: 10000 });
    await page.click('button[aria-label="Apply current filters to show results"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Loop through job cards and apply to Easy Apply jobs
    const jobCards = await page.$$('div.job-card-container--clickable');
    console.log(`Found ${jobCards.length} job cards.`);
    for (const [i, jobCard] of jobCards.entries()) {
        try {
            console.log(`Processing job card ${i + 1}...`);
            await jobCard.click();
            await page.waitForTimeout(2000);
            const easyApplyButton = await page.$('button.jobs-apply-button');
            if (easyApplyButton) {
                console.log('Easy Apply button found, clicking...');
                await easyApplyButton.click();
                await page.waitForTimeout(2000);
                // Upload resume if required
                const uploadInput = await page.$('input[type="file"]');
                if (uploadInput) {
                    console.log('Uploading resume...');
                    await uploadInput.setInputFiles(RESUME_PATH);
                    await page.waitForTimeout(2000);
                }
                // Click Next/Submit as needed (may need to handle multiple steps)
                let nextButton = await page.$('button[aria-label="Continue to next step"]');
                while (nextButton) {
                    console.log('Clicking Next...');
                    await nextButton.click();
                    await page.waitForTimeout(1500);
                    nextButton = await page.$('button[aria-label="Continue to next step"]');
                }
                const submitButton = await page.$('button[aria-label="Submit application"]');
                if (submitButton) {
                    console.log('Submitting application...');
                    await submitButton.click();
                    await page.waitForTimeout(2000);
                    // Optionally close the dialog
                    const closeButton = await page.$('button[aria-label="Dismiss"]');
                    if (closeButton) await closeButton.click();
                } else {
                    // If submit not found, close dialog
                    const discardButton = await page.$('button[aria-label="Dismiss"]');
                    if (discardButton) await discardButton.click();
                }
            } else {
                console.log('Easy Apply button not found for this job.');
            }
        } catch (err) {
            console.log(`Error processing job card ${i + 1}:`, err);
        }
    }
    await context.close();
    console.log('Automation complete.');
});
