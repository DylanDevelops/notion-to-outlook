/*-----------------------------------------------*
 *                                               *
 *             ~ Notion to Outlook ~             *
 *                By: Dylan Ravel                *
 *                  LICENSE: MIT                 *
 *                                               *
 *-----------------------------------------------*/

// This is a setting added just for testing
const justTestingNotion = true;

const { Client: NotionClient } = require('@notionhq/client');
const express = require('express');
const axios = require('axios');
const qs = require('querystring');

const app = express();
const PORT = 3000;

require('dotenv').config();

const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0/me/events';
const REDIRECT_URI = 'http://localhost:3000/callback';

// * Initiate Notion Client
const notion = new NotionClient({
    auth: process.env.NOTION_INTEGRATION_TOKEN,
});

// * Fetches notion data
async function fetchNotionData() {
    try {
        const response = await notion.databases.query({
            database_id: process.env.NOTION_UNI_DEADLINES_DATABASE_ID,
        });

        return response.results;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

app.get('/authorize', (req, res) => {
    const authEndpoint = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize';
    const params = {
        client_ID: process.env.APPLICATION_CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: 'offline_access Calendars.ReadWrite',
        response_mode: 'query',
        state: '12345',
    };

    const authorizeUrl = `${authEndpoint}?${qs.stringify(params)}`;
    res.redirect(authorizeUrl);
});

app.get('/callback', async (req, res) => {
    const tokenEndpoint = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token';
    const code = req.query.code;

    const tokenParams = {
        client_id: process.env.APPLICATION_CLIENT_ID,
        client_secret: process.env.APPLICATION_SECRET_CLIENT_VALUE,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
    };

    try {
        const response = await axios.post(tokenEndpoint, qs.stringify(tokenParams));
        const accessToken = response.data.access_token;

        const data = await fetchNotionData();

        console.log("Retrieved Data:");

        for(const item of data) {
            let assignmentName;
            let assignmentDeadline;
            let assignmentNotes;
            let assignmentType;
            let assignmentProgress;
            let assignmentCourseNames = []; // Use an array to store multiple course names

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

            // Access and log the "notes" property
            //
            if (item.properties.notes) {
                assignmentNotes = item.properties.progress.notes;
            } else {
                console.error("Item has no 'progress' property.");
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

            // Inside the loop, after retrieving the related course pages
            if (item.properties.course && item.properties.course.relation && item.properties.course.relation.length > 0) {
                const relatedCourseIds = item.properties.course.relation.map(relation => relation.id);

                // Retrieve the related course pages
                const relatedCourses = await Promise.all(relatedCourseIds.map(async courseId => {
                    return await notion.pages.retrieve({
                        page_id: courseId,
                    });
                }));

                // Access and log the 'course name' property of each related course
                assignmentCourseNames = relatedCourses.map(relatedCourse => {
                    if (relatedCourse.properties['course name'] && relatedCourse.properties['course name'].rich_text && relatedCourse.properties['course name'].rich_text[0]) {
                        return relatedCourse.properties['course name'].rich_text[0].plain_text;
                    } else {
                        console.error("Related course has no 'course name' property.");
                        return null;
                    }
                });
            } else {
                console.error("Item has no 'course' property.");
            }

            // Format course names based on the number of courses
            let formattedCourseNames = '';
            const numCourses = assignmentCourseNames.length;

            if (numCourses === 1) {
                formattedCourseNames = assignmentCourseNames[0];
            } else if (numCourses === 2) {
                formattedCourseNames = assignmentCourseNames.join(' & ');
            } else if (numCourses > 2) {
                formattedCourseNames = assignmentCourseNames.slice(0, -1).join(', ') + ', & ' + assignmentCourseNames.slice(-1)[0];
            }

            console.log(
                "\n",
                "Assignment Name: " + assignmentName + "\n",
                "Course Names: " + formattedCourseNames + "\n",
                "Assignment Deadline: " + assignmentDeadline + "\n",
                "Assignment Type: " + assignmentType + "\n",
                "Assignment Progress: " + assignmentProgress + "\n",
                "Assignment Notes: " + assignmentNotes,
                "\n"
            );

            const eventPayload = {
                subject: `(${formattedCourseNames}) ${assignmentName}`,
                body: {
                    contentType: 'HTML',
                    content: assignmentNotes,
                },
                start: {
                    dateTime: assignmentDeadline,
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: assignmentDeadline,
                    timeZone: 'UTC',
                },
            };

            const headers = {
                Authorization: `Bearer ${accessToken}`,
            };

            if(!justTestingNotion) {
                const createEventResponse = await axios.post(GRAPH_API_URL, eventPayload, { headers });
                console.log('Event created:', createEventResponse.data);
                res.send('Event created successfully!');
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.send('Error creating event.');
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT}/authorize to start the OAuth flow.`)
});