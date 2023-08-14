// ~ Notion to Outlook ~
// Author: Dylan Ravel
// LICENSE: MIT

const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_TOKEN,
});

async function fetchData() {
    try {
        const response = await notion.databases.query({
            database_id: process.env.NOTION_UNI_DEADLINES_DATABASE_ID,
        });

        const data = response.results;

        console.log("Retrieved data:");
        data.forEach(item => {
            console.log(item.properties);
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

fetchData();