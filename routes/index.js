var express = require('express');
var router = express.Router();
var axios = require('axios');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
var fs = require('fs').promises;
var path = require('path');
var config = require('../config/config.json');

let memesData;
let viewedMemes = [];

// Initialize Passport and use sessions
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      // Authenticate the user against the users.json file
      var data = await fs.readFile(path.join(__dirname, 'users.json'), 'utf8');
      var users = JSON.parse(data);
      var user = users.find(u => u.username === username && u.password === password);
      return user ? done(null, user) : done(null, false, { message: 'Incorrect username or password' });
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser(async (username, done) => {
  try {
    var data = await fs.readFile(path.join(__dirname, 'users.json'), 'utf8');
    var users = JSON.parse(data);
    var user = users.find(u => u.username === username);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Use sessions
router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

router.use(passport.initialize());
router.use(passport.session());

// Fetch memes from the API
async function fetchMemes() {
  try {
    var apiURL = config.apiURL;
    var response = await axios.get(apiURL);
    return response.data.memes;
  } catch (error) {
    console.error('Failed to fetch memes:', error.message);
    throw new Error('Failed to fetch memes');
  }
}

// Define isAuthenticated middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login'); // Redirect to login page if not authenticated
}

// Render home page
router.get('/', (req, res) => {
  res.render('index', { loggedIn: req.isAuthenticated(), username: req.user ? req.user.username : null });
});

// Render memes overview page
router.get('/memes/overview', async (req, res, next) => {
  try {
    if (!memesData) {
      memesData = await fetchMemes();
    }

    // Check if the request expects JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      // Send JSON response
      res.json({ memes: memesData, loggedIn: req.isAuthenticated() });
    } else {
      // Pass the loggedIn and username variables to the view
      res.render('memesOverview', { memes: memesData, loggedIn: req.isAuthenticated(), username: req.user ? req.user.username : null });
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Render meme details page
router.get('/memes/details/:id', isAuthenticated, async (req, res, next) => {
  var memeId = req.params.id;

  try {
    if (!memesData) {
      memesData = await fetchMemes();
    }

    // Use parseInt to convert memeId to an integer for comparison
    var memeDetails = memesData.find(meme => meme.id === parseInt(memeId));

    if (memeDetails) {
      // Check if the meme is viewed and update the data
      memeDetails.viewed = viewedMemes.includes(memeId);

      // Pass the loggedIn variable to the view
      res.render('memeDetails', { meme: memeDetails, loggedIn: req.isAuthenticated(), username: req.user ? req.user.username : null });
    } else {
      throw new Error(`Meme with ID ${memeId} not found`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error');
  }
});

// Function for marking a meme as viewed
function markMemeAsViewed(memeId) {
  if (!viewedMemes.includes(memeId)) {
    viewedMemes.push(memeId);
    console.log(`Meme ${memeId} marked as viewed`);
  } else {
    console.log(`Meme ${memeId} is already marked as viewed`);
  }
}

// Handle POST request for meme details
router.post('/memes/details', async (req, res) => {
  var memeId = req.body.memeId;

  try {
    if (!memeId) {
      throw new Error('Meme ID not provided');
    }

    if (!memesData) {
      memesData = await fetchMemes();
    }

    // Use parseInt to convert memeId to an integer for comparison
    var memeDetails = memesData.find(meme => meme.id === parseInt(memeId));

    if (memeDetails) {
      markMemeAsViewed(memeId);
      res.json({ success: true, message: 'Meme marked as viewed', id: memeId });
    } else {
      throw new Error(`Meme with ID ${memeId} not found`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update the route for handling meme search
router.get('/memes/search/:query', async (req, res, next) => {
  var query = req.params.query.toLowerCase();

  try {
    if (!memesData) {
      memesData = await fetchMemes();
    }

    // Filter memes based on the search query
    var searchResults = memesData.filter(meme => meme.name.toLowerCase().includes(query));

    res.json({ searchResults, loggedIn: req.isAuthenticated() }); // Send JSON response for search results
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update the route 
router.get('/login', (req, res) => {

  // Check if the user is already authenticated
  if (req.isAuthenticated()) {
    return res.redirect('/memes/overview');
  }

  // If not authenticated, render the login page
  var username = req.isAuthenticated() ? req.user.username : null;
  res.render('login', { error: req.flash('error'), loggedIn: req.isAuthenticated(), username: username });
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/memes/overview',
  failureRedirect: '/login',
  failureFlash: true,
}));

// Handle logout request
router.get('/logout', (req, res) => {
  // Check if the user is authenticated
  if (req.isAuthenticated()) {
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error during logout:', err);
        res.status(500).render('error');
      } else {
        // Redirect to the logout page
        res.redirect('/logout');
      }
    });
  } else {
    // If the user is not authenticated, directly render the logout page
    res.render('logout', { loggedIn: false });
  }
});

// Handle logout page
router.get('/logout', (req, res) => {
  // Render the logout page
  res.render('logout', { loggedIn: false });
});

module.exports = router;
