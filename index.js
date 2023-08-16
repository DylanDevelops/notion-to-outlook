/*----------------------------------------------*
*                                               *
*             ~ Notion to Outlook ~             *
*                By: Dylan Ravel                *
*                  LICENSE: MIT                 *
*                                               *
*-----------------------------------------------*/

const { Client: MSGraphClient } = require('@microsoft/microsoft-graph-client');
const { Client: NotionClient } = require('@notionhq/client');
require('dotenv').config();

const notion = new NotionClient({
    auth: process.env.NOTION_INTEGRATION_TOKEN,
});

async function fetchData() {
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

// Obtain an access token using the client credentials flow
async function getAccessToken() {
    const tokenEndpoint = `https://login.microsoftonline.com/${process.env.APPLICATION_TENANT_ID}/oauth2/v2.0/token`;

    const data = `client_id=${process.env.APPLICATION_CLIENT_ID}&scope=https://graph.microsoft.com/.default&client_secret=${process.env.APPLICATION_SECRET_CLIENT_VALUE}&grant_type=client_credentials`;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
    };

    try {
        const fetch = require('cross-fetch');

        const response = await fetch(tokenEndpoint, options);
        const result = await response.json();

        return result.access_token;
    } catch (error) {
        console.error('Error obtaining access token:', error);
        throw error;
    }
}

// Create an event using the provided access token
async function createEvent(accessToken, eventDetails) {
    const client = MSGraphClient.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });

    try {
        console.log('Creating event...');
        const res = await client.api(`/me/calendars/${process.env.APPLICATION_TARGET_CALENDAR_ID}/events`).post(eventDetails);
        console.log('Event created', res);
    } catch (error) {
        console.error('Error creating event:', error.message);
    }
}

async function main() {
    try {
        // dynamic fetch
        const fetch = require('cross-fetch');

        const accessToken = await getAccessToken();
        const data = await fetchData();

        console.log("Retrieved Data:");

        for(const item of data) {
            let assignmentName;
            let assignmentDeadline;
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
                "Assignment Progress: " + assignmentProgress,
                "\n"
            );

            const eventDetails = {
                subject: `(${formattedCourseNames}) ${assignmentName}`,
                start: {
                    dateTime: assignmentDeadline,
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: assignmentDeadline,
                    timeZone: 'UTC',
                },
            };

            // creates an event
            await createEvent(accessToken, eventDetails);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();