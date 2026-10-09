import { test, expect } from '@playwright/test';

test('registration, validation, logout, login and saved session', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.selectOption('#language','en');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByLabel('Username',{exact:true}).fill('test_adventurer');
  await page.getByLabel('Password',{exact:true}).fill('test-only-pass');
  await page.getByLabel('Confirm password',{exact:true}).fill('different');
  await page.getByRole('button',{name:'Create account & play'}).click();
  await expect(page.getByRole('alert')).toHaveText('Passwords do not match');
  await page.getByLabel('Confirm password',{exact:true}).fill('test-only-pass');
  await page.getByRole('button',{name:'Create account & play'}).click();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('#player-name')).toHaveText('test_adventurer');
  const saved = await page.evaluate(()=>localStorage.getItem('mr.demo.accounts.v1'));
  expect(saved).not.toContain('test-only-pass');
  await page.reload();
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.getByRole('button',{name:'Leave game'}).click();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByLabel('Username',{exact:true}).fill('test_adventurer');
  await page.getByLabel('Password',{exact:true}).fill('wrong-password');
  await page.getByRole('button',{name:'Enter the world'}).click();
  await expect(page.getByRole('alert')).toHaveText('Incorrect username or password');
  await page.getByLabel('Password',{exact:true}).fill('test-only-pass');
  await page.getByRole('button',{name:'Enter the world'}).click();
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.getByRole('button',{name:'Leave game'}).click();
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await page.getByLabel('Username',{exact:true}).fill('test_adventurer');
  await page.getByLabel('Password',{exact:true}).fill('test-only-pass');
  await page.getByLabel('Confirm password',{exact:true}).fill('test-only-pass');
  await page.getByRole('button',{name:'Create account & play'}).click();
  await expect(page.getByRole('alert')).toHaveText('This username already exists in this browser');
  expect(errors).toEqual([]);
});

test('guest identity survives refresh and logout; locales persist', async ({page})=>{
  await page.goto('/');
  await page.selectOption('#language','en');
  await page.getByRole('button',{name:'Play as Guest'}).click();
  await expect(page.locator('#game canvas')).toBeVisible();
  const name=await page.locator('#player-name').textContent();
  await page.reload();
  await expect(page.locator('#player-name')).toHaveText(name!);
  await page.getByRole('button',{name:'Leave game'}).click();
  await page.getByRole('button',{name:'Play as Guest'}).click();
  await expect(page.locator('#player-name')).toHaveText(name!);
  await page.getByRole('button',{name:'Leave game'}).click();
  await page.selectOption('#language','th');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','th');
  await expect(page.getByRole('button',{name:'เข้าเกม',exact:true})).toBeVisible();
});

test('mobile form preserves input on language switch and providers are unavailable', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.locator('#username').fill('traveler');
  await page.locator('#password').fill('some-test-pass');
  await page.selectOption('#language','en');
  await expect(page.locator('#username')).toHaveValue('traveler');
  await expect(page.locator('#password')).toHaveValue('some-test-pass');
  await expect(page.locator('#google-status')).not.toBeEmpty();
  await expect(page.getByRole('button',{name:'Sign in with email',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/login-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'test-results/login-desktop.png',fullPage:true});
});

test('configured Google button forwards a credential and uses the server identity (mocked provider)',async({page})=>{
  let signedIn=false;
  const user={id:'google:test-sub',username:'Verified <player>',kind:'google'};
  await page.route('**/api/auth/config',r=>r.fulfill({json:{enabled:true,clientId:'test.apps.googleusercontent.com'}}));
  await page.route('**/api/auth/challenge',r=>r.fulfill({json:{nonce:'browser-bound-test-nonce'}}));
  await page.route('**/api/auth/session',r=>r.fulfill({json:{user:signedIn?user:null}}));
  await page.route('**/api/auth/logout',r=>{signedIn=false;return r.fulfill({status:204});});
  await page.route('**/api/auth/google',r=>{
    expect(r.request().postDataJSON()).toEqual({credential:'signed-test-credential'});
    signedIn=true;
    return r.fulfill({json:{user}});
  });
  await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({
    contentType:'application/javascript',
    body:`window.google={accounts:{id:{
      initialize(options){window.testGoogleOptions=options;},
      renderButton(host){const button=document.createElement('button');button.textContent='Test Google chooser';
        button.onclick=()=>window.testGoogleOptions.callback({credential:'signed-test-credential'});host.append(button);},
      disableAutoSelect(){}
    }}};`
  }));
  await page.goto('/');
  await page.selectOption('#language','en');
  await page.getByRole('button',{name:'Test Google chooser'}).click();
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('#player-name')).toHaveText('Verified <player>');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('signed-test-credential');
  await page.reload();
  await expect(page.locator('#player-name')).toHaveText('Verified <player>');
  await page.getByRole('button',{name:'Leave game'}).click();
  await expect(page.locator('#auth-form')).toBeVisible();
  expect(signedIn).toBe(false);
});
