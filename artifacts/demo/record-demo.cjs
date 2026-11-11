const { chromium, expect } = require('@playwright/test');
(async () => {
 const browser = await chromium.launch({slowMo:180});
 const context = await browser.newContext({baseURL:'http://localhost:3000', viewport:{width:1440,height:900},recordVideo:{dir:'artifacts/demo',size:{width:1440,height:900}}});
 await context.addInitScript(() => {
  const mount = () => {
   const style = document.createElement('style');
   style.textContent = `* {cursor:none!important} #demo-pointer {position:fixed;left:0;top:0;width:25px;height:31px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 2px #555)} .demo-click {position:fixed;width:52px;height:52px;border:4px solid #f59e0b;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483646;animation:demo-ring .65s ease-out forwards} @keyframes demo-ring {from{opacity:1;scale:.5}to{opacity:0;scale:1.4}}`;
   document.documentElement.append(style);
   const pointer=document.createElement('div');pointer.id='demo-pointer';
   pointer.innerHTML='<svg width="25" height="31" viewBox="0 0 25 31"><path d="M2 2 L2 24 L8 18 L13 29 L18 26 L13 16 L22 16 Z" fill="black" stroke="white" stroke-width="2"/></svg>';
   document.documentElement.append(pointer);
   document.addEventListener('mousemove',e=>{pointer.style.left=e.clientX+'px';pointer.style.top=e.clientY+'px'},true);
   document.addEventListener('mousedown',e=>{const ring=document.createElement('div');ring.className='demo-click';ring.style.left=e.clientX+'px';ring.style.top=e.clientY+'px';document.documentElement.append(ring);setTimeout(()=>ring.remove(),700)},true);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);else mount();
 });
 const page = await context.newPage();
 const prototype=Object.getPrototypeOf(page.locator('body'));
 for(const method of ['click','check','fill','selectOption']) {
  const original=prototype[method];
  prototype[method]=async function(...args) {
   await this.scrollIntoViewIfNeeded();
   const box=await this.boundingBox();
   if(box) {await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:18});await page.waitForTimeout(350);}
   if(method==='fill'||method==='selectOption') await this.click();
   const result=await original.apply(this,args);await page.waitForTimeout(450);return result;
  };
 }
 const pause = () => page.waitForTimeout(2200);
 async function login(email) {
  await page.goto('/sign-in');
  await page.getByLabel('Campus email',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill('CampusTrade-Demo-2026!');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL(/\/listings$/); await pause();
 }
 async function logout(){await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/sign-in$/);}
 try {
  await login('a.student@campus.example');
  await page.goto('/listings?q=Demo%3A'); await pause();
  await page.goto('/listings/d3e00000-0000-4000-8000-000000000001'); await pause();
  await page.getByRole('link',{name:'Edit listing',exact:true}).click();
  await page.getByLabel('Price (rupees)',{exact:true}).fill('425'); await pause();
  await page.getByRole('button',{name:'Save changes'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Demo: Engineering mathematics textbook'); await pause();
  await page.goto('/listings/d3e00000-0000-4000-8000-000000000002');await expect(page.getByText('Donation - free to take')).toBeVisible();await pause();
  await page.getByRole('button',{name:'Mark as unavailable',exact:true}).click();await expect(page.getByRole('button',{name:'Mark as available',exact:true})).toBeVisible();await pause();
  await page.getByRole('button',{name:'Mark as available',exact:true}).click();await pause();
  await logout();await login('b.student@campus.example');
  await page.goto('/listings?q=Demo%3A');await pause();
  await page.goto('/listings/d3e00000-0000-4000-8000-000000000001');
  await page.getByLabel('Message to the owner (optional)').fill('Hi! I would like this textbook. Can we arrange a campus pickup?');await pause();
  await page.getByRole('button',{name:'Express interest',exact:true}).click();await expect(page.getByText(/Interest recorded for/)).toBeVisible();await pause();
  await page.goto('/contacts');await pause();await logout();
  await login('a.student@campus.example');await page.goto('/contacts');await pause();await logout();
  await login('admin@campus.example');await page.goto('/admin/reports');await pause();
  const report=page.locator('li').filter({hasText:'Demo: Calculator needing review'}).first();
  await report.getByRole('radio',{name:'Remove listing',exact:true}).check();
  await report.getByLabel('Review reason (recorded in the audit log)').fill('Reviewed report: the calculator condition does not match its description.');await pause();
  await report.getByRole('button',{name:'Remove listing',exact:true}).click();await expect(page.getByText('Listing removed',{exact:true}).first()).toBeVisible();await pause();
  await logout();await login('b.student@campus.example');await page.goto('/listings?q=Demo%3A');await pause();
  await expect(page.getByRole('region',{name:'Search results'})).not.toContainText('Demo: Calculator needing review');
  console.log('Recorded owner, donation, buyer contact, owner inbox, moderation and removal flows.');
 } finally {const video=page.video();await context.close();await video.saveAs('artifacts/demo/campustrade-demo.webm');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
