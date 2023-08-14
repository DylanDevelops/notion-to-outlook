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
let assignmentCourseName;

async function fetchData() {
    try {
        const response = await notion.databases.query({
            database_id: process.env.NOTION_UNI_DEADLINES_DATABASE_ID,
        });

        const data = response.results;

        console.log("Retrieved data:");
        data.forEach(async item => {
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

            // Inside the loop, after retrieving the related course page
            if (item.properties.course && item.properties.course.relation && item.properties.course.relation[0]) {
                const relatedCourseId = item.properties.course.relation[0].id;

                // Retrieve the related course page
                const relatedCourse = await notion.pages.retrieve({
                    page_id: relatedCourseId,
                });

                // Access and log the 'course name' property of the related course
                if (relatedCourse.properties['course name'] && relatedCourse.properties['course name'].rich_text && relatedCourse.properties['course name'].rich_text[0]) {
                    assignmentCourseName = relatedCourse.properties['course name'].rich_text[0].plain_text;
                } else {
                    console.error("Related course has no 'course name' property.");
                }

                // ... (rest of the code)
            } else {
                console.error("Item has no 'course' property.");
            }

            console.log(
                "\n",
                "Assignment Name: " + assignmentName + "\n",
                "Course Name: " + assignmentCourseName + "\n",
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
