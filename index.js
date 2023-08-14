// ~ Notion to Outlook ~
// Author: Dylan Ravel
// LICENSE: MIT

const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_TOKEN,
});

let assignmentName;
let assignmentDeadline;
let assignmentType;
let assignmentProgress;

async function fetchData() {
    try {
        const response = await notion.databases.query({
            database_id: process.env.NOTION_UNI_DEADLINES_DATABASE_ID,
        });

        const data = response.results;

        console.log("Retrieved data:");
        data.forEach(item => {
            // Access and log the "name" property
            if (item.properties.name && item.properties.name.title && item.properties.name.title[0]) {
                assignmentName = item.properties.name.title[0].plain_text;
            } else {
                console.error("Item has no 'name' property.");
            }

            // Access and log the "deadline" property
            if (item.properties.deadline && item.properties.deadline.date && item.properties.deadline.date.start) {
                assignmentDeadline = item.properties.deadline.date.start;
            } else {
                console.error("Item has no 'deadline' property.");
            }

            // Access and log the "type" property
            if (item.properties.type && item.properties.type.select && item.properties.type.select.name) {
                assignmentType = item.properties.type.select.name;
            } else {
                console.error("Item has no 'type' property.");
            }

            // Access and log the "progress" property
            if (item.properties.progress && item.properties.progress.status && item.properties.progress.status.name) {
                assignmentProgress = item.properties.progress.status.name;
            } else {
                console.error("Item has no 'progress' property.");
            }

            console.log(
                "\n",
                "Assignment Name: " + assignmentName + "\n",
                "Assignment Deadline: " + assignmentDeadline + "\n",
                "Assignment Type: " + assignmentType + "\n",
                "Assignment Progress: " + assignmentProgress
            );

            console.log(""); // Print an empty line for separation
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

fetchData();
