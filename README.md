# WolfProductions | Photos

This application takes your photo gallery to the next level. I wanted a way to group albums together for different organisations or categories. So I wanted to group my personal albums together and seperate them from other albums. I also wanted to share a single album as a gallery where you can have the photos grouped into sections like pixieset can do, and I want to share a whole collection of albums from a category or organisation in a grid view. Overall I wanted to create a platform to share my photos and have lots of grouping I can do.

I run this app myself on [wolfproductions.photos](https://wolfproductions.photos), but it is also open source and free available for you to use and deploy yourself. Just follow the instructions below to get started.

## Getting started

The application uses the following which we don't provide:

- A folder with your photos (for example a mounted NAS share). The app only reads from it.
- [MongoDB](https://mongodb.com/) for storing information about the albums and sections.

The application itself runs on [Node.js](https://nodejs.org/) (20.9 or newer) and [Express.js](https://expressjs.com/), and uses [sharp](https://sharp.pixelplumbing.com/) to make small versions of the photos once, when you add them to an album. Those are stored in a second folder and served straight from disk.

1. Copy `backend/.env.example` to `backend/.env` and fill in the database, the photo folder (`PHOTOS_ROOT`), the folder for the generated versions (`VARIANTS_ROOT`) and an admin token.
2. `cd backend && npm install && npm start` starts the API on port 3002.
3. `npm install && npm run dev` in the root starts the site on port 3000. For production run `npm run build` instead; the backend then serves the built site as well, so one process on one port is all there is.

Creating and editing albums asks for the admin token once and remembers it in your browser.

## To-Do list

- [x] Fancy up the gallery for different size images
- [x] Create smaller images for the gallery
- [x] Working show gallery button
- [x] Download images
- [ ] Edit existing albums
