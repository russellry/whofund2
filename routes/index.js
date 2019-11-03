var express = require("express");
var router = express.Router();
var api = require("../api");

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://postgres:cs2102haha@localhost:5433/postgres"
});

// static files
router.use("/", express.static("images"));
router.use("/", express.static("javascripts"));
router.use("/", express.static("stylesheets"));

var loggedIn = function(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/login");
  }
};

var loggedOut = function(req, res, next) {
  if (!req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/home");
  }
};

/* GET home page. */
router.get("/", loggedOut, function(req, res, next) {
  res.redirect("/login");
});

router.get("/login", loggedOut, function(req, res, next) {
  res.render("login");
});

router.get("/signup", loggedOut, function(req, res, next) {
  res.render("signup");
});

router.get("/home", loggedIn, function(req, res, next) {
  res.render("home");
});

router.get("/logout", loggedIn, function(req, res, next) {
  req.logOut();
  res.redirect("/login");
});

//Imported from old code part a

router.post("/project-signup", loggedIn, (req, res, next) => {
  var projTitle = req.body.projectTitle;
  var projDesc = req.body.projectDesc;
  var projTargetAmt = req.body.projectTargetAmt;
  var projDeadline = req.body.projectDeadline;
  var queryString =
    "INSERT INTO projects (projtitle, datecreated, description, targetamount, deadline) VALUES(";
  var projDateCreated = api.getDateNow();
  queryString +=
    "'" +
    projTitle +
    "', '" +
    projDateCreated +
    "', '" +
    projDesc +
    "', '" +
    projTargetAmt +
    "', '" +
    projDeadline +
    "')";
  pool.query(queryString, err => {
    if (err) {
      res.redirect("/error/projectexists");
    } else {
      console.log("new project created");
      res.redirect(`/projects`);
    }
    res.end();
  });
});

// get all users
router.get("/users", loggedIn, async (req, res) => {
  const rows = await readUsers();
  res.render("users", { data: rows });
});

// get specific user profile
router.get("/profile/:username", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  const likes = await getUserLikes(req.params.username);
  const following = await getUserFollows(req.params.username);
  const followed = await getUserFollowed(req.params.username);

  var currentUser = req.user[0].username;
  var toFollowUser = req.params.username;
  const isFollowing = await checkIfUserFollowing(currentUser, toFollowUser);

  // console.log(req.user[0].username);
  res.render("profile", { userinfo: userinfo, likes: likes, following: following, followed: followed,
    currentuser: req.user[0].username,  isFollow: isFollowing });
});

// follow/unfollow
router.get("/profile/:username/follow", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  const likes = await getUserLikes(req.params.username);
  const follows = await getUserFollows(req.params.username);

  var currentUser = req.user[0].username;
  var toFollowUser = req.params.username;
  var followDate = api.getDateNow();
  
  const isFollowing = await checkIfUserFollowing(currentUser, toFollowUser);
  
  if(isFollowing) {
    var msg = "Already following " + toFollowUser + "!";
  } else {
    var queryString = "INSERT INTO follows (follower, followee, since) VALUES (";
    queryString +=
      "'" +
      currentUser +
      "', '" +
      toFollowUser +
      "', '" +
      followDate +
      "')";
    
    pool.query(queryString, err => {
      if (err) {
        console.log("invalid values for inserting to follows");
      } else {
        console.log("new follow created");
      }
    });
    var msg = "Successfully followed " + toFollowUser + "!";
  }
  res.render("followResult", { userinfo: userinfo, currentuser: req.user[0].username, msg: msg });
})

router.get("/profile/:username/unfollow", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);

  var currentUser = req.user[0].username;
  var followedUser = req.params.username;
  const isFollowing = await checkIfUserFollowing(currentUser, followedUser);
  // console.log("reached point #1");
  // console.log(isFollowing);
  if(!isFollowing) {
    var msg = "You are not even following " + followedUser + "!";
  } else {
    try {
      var queryString = "delete from follows where follower = $1 and followee = $2";
      // console.log("reached point #2");
      await pool.query(queryString, [currentUser, followedUser], err => {
        if (err) {
          console.log("problem deleting follow");
        } else {
          console.log("follow deleted");
        }
      });
      var msg = "Successfully unfollowed " + followedUser + "!";
      console.log(currentUser + " unfollowed " + followedUser)
    } catch(e) {
      console.log("unknown error");
    }
  }
  res.render("followResult", {userinfo: userinfo, msg: msg})
})


// user page functions
async function readUsers() {
  try {
    const results = await pool.query("select * from users");
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getUserInfo(username) {
  try {
    var queryString = "select * from users where username = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getUserLikes(username) {
  try {
    var queryString = "select projtitle from likes where username = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch(e) {
    return [];
  }
}

async function getUserFollows(username) {
  try {
    var queryString = "select followee, since from follows where follower = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch(e) {
    return [];
  }
}

async function getUserFollowed(username) {
  try {
    var queryString = "select follower, since from follows where followee = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch(e) {
    return [];
  }
}

async function checkIfUserFollowing(follower, followee) {
  try {
    var queryString = "select * from follows where follower = '" + follower + "' and followee = '" + followee + "'";
    const results = await pool.query(queryString);
    console.log(results.rows)
    if(results.rows == undefined) return false;
    return results.rows[0].follower == follower;
  } catch(e) {
  }
}

//project pages
router.get("/project/new", loggedIn, (req, res) =>
  res.render("project-signup")
);

router.get("/projects", loggedIn, async (req, res) => {
  const rows = await readProjects();
  res.render("projects", { projInfo: rows });
});

router.get("/project/:projtitle", loggedIn, async (req, res) => {
  const projInfo = await getProjectInfo(req.params.projtitle);

  const isLiked = await checkIfUserLikesProject(req.user[0].username, req.params.projtitle);
  res.render("project-detail", { projInfo: projInfo, isLiked: isLiked });
});

router.get("/project/:projtitle/like", loggedIn, async (req,res) => {
  var currentUser = req.user[0].username;
  var projTitle = req.params.projtitle;

  const projInfo = await getProjectInfo(projTitle);
  const likes = await checkIfUserLikesProject(currentUser, projTitle)
  if(likes) {
    var msg = "You have already liked '" + projTitle + "'!";
  } else {
    var queryString = "INSERT INTO likes (username, projtitle) VALUES (";
    queryString +=
      "'" +
      currentUser +
      "', '" +
      projTitle +
      "')";

    await pool.query(queryString, err => {
      if (err) {
        console.log("invalid values for inserting to likes");
      } else {
        console.log("new like created");
      }
    });
    var msg = "Successfully liked " + projTitle + "!";
  }
  res.render("likeResult", {projInfo: projInfo, currentuser: req.user[0].username, msg: msg})
})

router.get("/project/:projtitle/unlike", loggedIn, async (req,res) => {
  var currentUser = req.user[0].username;
  var projTitle = req.params.projtitle;

  const projInfo = await getProjectInfo(projTitle);
  const likes = await checkIfUserLikesProject(currentUser, projTitle)
  if(!likes) {
    var msg = "You have not liked '" + projTitle + "' yet!";
  } else {
    var queryString = "DELETE FROM likes where username = $1 and projtitle = $2";
    await pool.query(queryString, [currentUser, projTitle], err => {
      if (err) {
        console.log("unable to remove like entry");
      } else {
        console.log("removed like");
      }
    });
    var msg = "Successfully unliked " + projTitle + "!";
  }
  res.render("likeResult", {projInfo: projInfo, currentuser: req.user[0].username, msg: msg})
})

// project page functions
async function readProjects() {
  try {
    const results = await pool.query("select * from projects");
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectInfo(projTitle) {
  try {
    var queryString =
      "select * from projects where projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectTierInfo(projTitle) {
  try {
    var queryString = "select tier, avg(amount) from projectbundles where projtitle = '" + projTitle + "' group by tier";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectCurrentFundingInfo(projTitle) {
  try {
    var queryString = "select tier, count(*) from fundings where projtitle = '" + projTitle + "' group by tier order by tier asc";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectCurrentFunds(projTitle) {
  try {
    const tierInfo = getProjectTierInfo(projtitle);
    const fundingInfo = getProjectCurrentFundingInfo(projTitle);
    return 0;
  } catch (e) {
    return 0;
  }
}

async function checkIfUserLikesProject(username, projTitle) {
  try {
    var queryString = "select * from likes where username = '" + username + "' and projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    console.log(results.rows)
    if(results.rows == undefined) return false;
    return results.rows[0].username == username;
  } catch(e) {
  }
}

//End import part a

module.exports = router;
