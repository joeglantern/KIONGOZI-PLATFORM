# App Publishing Costs Table

| Item | Google Play Developer | Apple Developer Program | Expo EAS Starter | Supabase Pro | Render Starter |
|------|----------------------|------------------------|---------------------|--------------|----------------|
| **Cost** | $25 (one-time) | $99/year | $19/month ($228/year) | $25/month ($300/year) | $7/month ($84/year) |

## What Each Service Does

**Google Play Developer Account**
To get the app on the Google Play Store, I need to pay Google a one-time fee of $25. Once I pay this, I can publish as many Android apps as I want forever. It's basically the entry ticket to sell or distribute apps to Android users.

**Apple Developer Program**
Apple works differently - they charge $99 every year to keep the app on their App Store. If I want iPhone and iPad users to download the app, this annual membership is required. No way around it if I want to be on iOS.

**Expo EAS (Starter Plan)**
This service takes the code I write and turns it into actual app files that phones can install. I can't just send raw code to users - it needs to be built and packaged properly for Android and iOS. Expo handles that process for me. It also lets me push updates to users instantly without them having to download anything new from the app stores.

**Supabase Pro**
This is where all the app's data lives - user accounts, stored information, everything the app needs to remember. When someone logs in or saves something in the app, Supabase handles storing that data. It's like the filing system of the app, keeping everything organized and accessible. **This needs to stay up and running at all times - if Supabase goes down, the entire app stops working. Without the database service, nothing functions properly.**

**Render Starter**
**This is the actual backend server that runs the app's core logic and acts as the proxy between the app and everything else.** When users interact with the app, Render processes those requests, talks to Supabase to get or save data, and handles all the business logic. It's like the engine room that makes everything work - processing payments, sending emails, managing authentication, and doing all the heavy lifting. **If Render goes down, the app becomes completely non-functional even if Supabase is still running.** This is mission-critical infrastructure.

## Mobile App Testing

The mobile app was tested on multiple devices to make sure it works properly across different phones and tablets. Tested on iPhone 14 Pro, iPad Air, Pixel 7, and Galaxy S22 to cover both iOS and Android platforms.

## How the LMS and Moderator Dashboard Work Together

Think of it like a school system. The LMS is where students go to take classes - they can browse courses, enroll in what they want, and learn from the modules. The moderator dashboard is like the teacher's office - that's where instructors create the courses, write the lessons, manage students, and see who's actually learning. When a moderator creates a course in the dashboard, it shows up in the LMS for students to find and enroll in. Both systems talk to the same database, so everything stays in sync. Students see what moderators publish, and moderators can track what students are doing.
