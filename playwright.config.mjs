import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./backend/tests/browser',workers:1,timeout:45000,
  expect:{timeout:10000},reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://localhost:8080',trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}
  ]
});
