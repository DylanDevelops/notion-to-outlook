// ~ Notion to Outlook ~
// Author: Dylan Ravel
// LICENSE: MIT

const { Client, ClientCredentialsAuthProvider } = require('@notionhq/client');
const { Client: MicrosoftGraphClient } = require('@microsoft/microsoft-graph-client');
require('dotenv').config();

// Initialize Notion client
const notion = new Client({
    auth: process.env.NOTION_INTEGRATION_TOKEN,
});

// Initialize Microsoft Graph authentication provider
const authProvider = new ClientCredentialsAuthProvider({
    clientId: process.env.APPLICATION_CLIENT_ID,
    clientSecret: process.env.APPLICATION_SECRET_CLIENT_ID,
});

// Initialize Microsoft Graph client
const graphClient = MicrosoftGraphClient.init({
    authProvider,
});

async function createOutlookEvent(assignmentName, assignmentDeadline) {
    try {
        const event = {
            subject: `Assignment: ${assignmentName}`,
            start: {
                dateTime: new Date(assignmentDeadline).toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(assignmentDeadline).toISOString(),
                timeZone: 'UTC',
            },
        };

        const response = await graphClient.api('/me/events').post(event);
        console.log('Outlook event created:', response);
    } catch (error) {
        console.error('Error creating Outlook event:', error);
    }
}

async function fetchDataAndCreateEvents() {
    try {
        const response = await notion.databases.query({
            database_id: process.env.NOTION_UNI_DEADLINES_DATABASE_ID,
        });

        const data = response.results;

        console.log("Retrieved data:");
        data.forEach(async item => {
            let assignmentName;
            let assignmentDeadline;
            let assignmentType;
            let assignmentProgress;
            let assignmentCourseNames = []; // Use an array to store multiple course names

            // ... (property access and data processing)

            console.log(
                "\n",
                "Assignment Name: " + assignmentName + "\n",
                "Course Names: " + formattedCourseNames + "\n",
                "Assignment Deadline: " + assignmentDeadline + "\n",
                "Assignment Type: " + assignmentType + "\n",
                "Assignment Progress: " + assignmentProgress
            );

            // Create Outlook event
            if (assignmentName && assignmentDeadline) {
                await createOutlookEvent(assignmentName, assignmentDeadline);
            }

            console.log(""); // Print an empty line for separation
        });
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Start the process
fetchDataAndCreateEvents();
