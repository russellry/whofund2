var express = require("express");
var router = express.Router();
var api = require("../api");

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://postgres:cs2102haha@localhost:5433/postgres"
  // connectionString: "postgres://postgres:Pokemon2424!!@localhost:5432/whofund"
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
  res.render("profile", {
    userinfo: userinfo,
    likes: likes,
    following: following,
    followed: followed,
    currentuser: req.user[0].username,
    isFollow: isFollowing
  });
});

// follow/unfollow
router.get("/profile/:username/follow", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  // const likes = await getUserLikes(req.params.username);
  // const follows = await getUserFollows(req.params.username);

  var currentUser = req.user[0].username;
  var toFollowUser = req.params.username;
  var followDate = api.getDateNow();

  const isFollowing = await checkIfUserFollowing(currentUser, toFollowUser);

  if (isFollowing) {
    var msg = "Already following " + toFollowUser + "!";
  } else if(currentUser == toFollowUser) {
    var msg = "Cannot follow yourself!";
  } else {
    var queryString =
      "INSERT INTO follows (follower, followee, since) VALUES (";
    queryString +=
      "'" + currentUser + "', '" + toFollowUser + "', '" + followDate + "')";

    pool.query(queryString, err => {
      if (err) {
        console.log("invalid values for inserting to follows");
      } else {
        console.log("new follow created");
      }
    });
    var msg = "Successfully followed " + toFollowUser + "!";
  }
  res.render("followResult", {
    userinfo: userinfo,
    currentuser: req.user[0].username,
    msg: msg
  });
});

router.get("/profile/:username/unfollow", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);

  var currentUser = req.user[0].username;
  var followedUser = req.params.username;
  const isFollowing = await checkIfUserFollowing(currentUser, followedUser);
  // console.log("reached point #1");
  // console.log(isFollowing);
  if (!isFollowing) {
    var msg = "You are not even following " + followedUser + "!";
  } else {
    try {
      var queryString =
        "delete from follows where follower = $1 and followee = $2";
      // console.log("reached point #2");
      await pool.query(queryString, [currentUser, followedUser], err => {
        if (err) {
          console.log("problem deleting follow");
        } else {
          console.log("follow deleted");
        }
      });
      var msg = "Successfully unfollowed " + followedUser + "!";
      console.log(currentUser + " unfollowed " + followedUser);
    } catch (e) {
      console.log("unknown error");
    }
  }
  res.render("followResult", { userinfo: userinfo, msg: msg });
});

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
    var queryString =
      "select projtitle from likes where username = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getUserFollows(username) {
  try {
    var queryString =
      "select followee, since from follows where follower = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getUserFollowed(username) {
  try {
    var queryString =
      "select follower, since from follows where followee = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function checkIfUserFollowing(follower, followee) {
  try {
    var queryString =
      "select * from follows where follower = '" +
      follower +
      "' and followee = '" +
      followee +
      "'";
    const results = await pool.query(queryString);
    console.log(results.rows);
    if (results.rows == undefined) return false;
    return results.rows[0].follower == follower;
  } catch (e) {}
}

//project pages
router.get("/project/new", loggedIn, (req, res) =>
  res.render("project-signup")
);

router.get("/projects", loggedIn, async (req, res) => {
  const rows = await readProjects();
  res.render("projects", { projInfo: rows });
});

router.get("/my-projects", loggedIn, async (req, res) => {
  var currentUser = req.user[0].username;

  const rows = await readMyProjects(currentUser);
  res.render("projects", { projInfo: rows });
});

router.get("/project/:projtitle", loggedIn, async (req, res) => {
  const projTitle = req.params.projtitle;
  const projInfo = await getProjectInfo(projTitle);
  const totalCurrFunds = await getProjectTotalCurrentFunds(
    req.params.projtitle
  );
  const projFunders = await getProjectFunders(projTitle);

  const targetHit = await checkIfProjectTargetHit(projTitle);
  const isLiked = await checkIfUserLikesProject(
    req.user[0].username,
    req.params.projtitle
  );
  const comments = await getComments(projTitle);
  const updates = await getUpdates(projTitle);

  const owner = await getOwner(projTitle);
  console.log(comments);

  const currUser = req.user[0].username;
  const checkTier1Funded = await checkIfUserHasFundedTier(currUser, projTitle, 1);
  const checkTier2Funded = await checkIfUserHasFundedTier(currUser, projTitle, 2);
  const checkTier3Funded = await checkIfUserHasFundedTier(currUser, projTitle, 3);
  
  const likers = await getUsersWhoLike(projTitle);

  res.render("project-detail", {
    projInfo: projInfo,
    isLiked: isLiked,
    totalCurrFunds: totalCurrFunds,
    targetHit: targetHit,
    projFunders: projFunders,
    likers: likers,
    comments: comments,
    owner: owner,
    currUser: currUser,
    updates: updates,
    tier1Funded: checkTier1Funded,
    tier2Funded: checkTier2Funded,
    tier3Funded: checkTier3Funded
  });
});

router.get("/project/:projtitle/like", loggedIn, async (req, res) => {
  var currentUser = req.user[0].username;
  var projTitle = req.params.projtitle;

  const projInfo = await getProjectInfo(projTitle);
  const likes = await checkIfUserLikesProject(currentUser, projTitle);
  if (likes) {
    var msg = "You have already liked '" + projTitle + "'!";
  } else {
    var queryString = "INSERT INTO likes (username, projtitle) VALUES (";
    queryString += "'" + currentUser + "', '" + projTitle + "')";

    await pool.query(queryString, err => {
      if (err) {
        console.log("invalid values for inserting to likes");
      } else {
        console.log("new like created");
      }
    });
    var msg = "Successfully liked " + projTitle + "!";
  }
  res.render("likeResult", {
    projInfo: projInfo,
    currentuser: req.user[0].username,
    msg: msg
  });
});

router.get("/project/:projtitle/unlike", loggedIn, async (req, res) => {
  var currentUser = req.user[0].username;
  var projTitle = req.params.projtitle;

  const projInfo = await getProjectInfo(projTitle);
  const likes = await checkIfUserLikesProject(currentUser, projTitle);
  if (!likes) {
    var msg = "You have not liked '" + projTitle + "' yet!";
  } else {
    var queryString =
      "DELETE FROM likes where username = $1 and projtitle = $2";
    await pool.query(queryString, [currentUser, projTitle], err => {
      if (err) {
        console.log("unable to remove like entry");
      } else {
        console.log("removed like");
      }
    });
    var msg = "Successfully unliked " + projTitle + "!";
  }
  res.render("likeResult", {
    projInfo: projInfo,
    currentuser: req.user[0].username,
    msg: msg
  });
});

// funding by users 
router.get("/project/:projtitle/fund/:tier", loggedIn, async (req, res) => {
  var currentUser = req.user[0].username;
  var projTitle = req.params.projtitle;
  var fundTier = req.params.tier;
  console.log("Current FundTier is :" + fundTier);
  const projInfo = await getProjectInfo(projTitle);
  const projOwnerInfo = await getOwner(projTitle);
  const projOwnerName = projOwnerInfo[0].username;
  const funded = await checkIfUserHasFundedTier(currentUser, projTitle, fundTier);
  console.log("Funded status is: " + funded);
  if(currentUser == projOwnerName) {
    var msg = "You cannot fund your own project!";
  } else if (funded) {
    var msg = "You have already funded " + projTitle + " at tier " + fundTier + "!";
  } else {
    var queryString = "INSERT INTO fundings (username, projtitle, tier) VALUES (";
    queryString += "'" + currentUser + "', '" + projTitle + "', '" + fundTier + "')";
    console.log(queryString);
    await pool.query(queryString, err => {
      if (err) {
        console.log(fundTier);
        console.log("invalid values for inserting to fundings");
      } else {
        console.log("new funding created");
      }
    });
    var msg = "Successfully funded " + projTitle + " at tier " + fundTier + "!";
  }

  res.render("fundResult", {
    projInfo: projInfo,
    currentuser: req.user[0].username,
    msg: msg
  });
});

// post project updates by owner
router.post("/project-update", loggedIn, async (req, res, next) => {
  curr_url = req.headers.referer;
  splitstr = curr_url.split("/");
  projTitle = splitstr[splitstr.length - 1];
  projTitle = projTitle.replace("%20", " ");

  var update = req.body.updates;
  var updateDateCreated = api.getDateNow();
  var queryString =
    "INSERT INTO projectupdates (projtitle, updatetime, description) VALUES('" +
    projTitle +
    "', '" +
    updateDateCreated +
    "', '" +
    update +
    "')";
  console.log(queryString);
  try {
    await pool.query(queryString, (err, results) => {
      console.log("comment posted!");
      res.redirect(curr_url);
    });
  } catch (e) {
    console.log(e);
  }
});

router.post("/post-comments", loggedIn, async (req, res, next) => {
  curr_url = req.headers.referer;
  splitstr = curr_url.split("/");
  projTitle = splitstr[splitstr.length - 1];
  // var projTitle = req.body.projTitle;
  var comment = req.body.comments;
  var currentUser = req.user[0].username;
  var commentDateCreated = api.getDateNow();
  var queryString =
    "INSERT INTO projectfeedbacks (projtitle, username, commenttime, description) VALUES('" +
    projTitle +
    "', '" +
    currentUser +
    "', '" +
    commentDateCreated +
    "', '" +
    comment +
    "')";
  console.log(queryString);
  try {
    await pool.query(queryString, (err, results) => {
      console.log("comment posted!");
      res.redirect(curr_url);
    });
  } catch (e) {
    console.log(e);
  }
});

router.post("/project-signup", loggedIn, async (req, res, next) => {
  var projTitle = req.body.projectTitle;
  var projDesc = req.body.projectDesc;
  var projTargetAmt = req.body.projectTargetAmt;
  var projDeadline = req.body.projectDeadline;
  const projTitleExists = await checkProjTitle();
  if (projTitleExists) {
    res.redirect("/error/projectexists");
  }
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
  var currentUser = req.user[0].username;
  var complementQueryString =
    "INSERT INTO owns (username, projtitle) VALUES('" +
    currentUser +
    "', '" +
    projTitle +
    "')";
  console.log(queryString);
  console.log(complementQueryString);
  try {
    await pool.query(queryString);
    await pool.query(complementQueryString);
  } catch (e) {}

  var projCategory = req.body.projectCategory;
  console.log("Project Category is : " + projCategory);
  var categoryString = "INSERT INTO taggedwith(projtitle, type) VALUES ('" + projTitle + "', '" + projCategory + "')";
  await pool.query(categoryString, err => {
    if(err) {
      console.log("problem adding category");
    } else {
      console.log("category added");
    }
  });
  

  var tierOneAmount = req.body.tierOneAmount;
  var tierOneRewards = req.body.tierOneRewards;
  var tierTwoAmount = req.body.tierTwoAmount;
  var tierTwoRewards = req.body.tierTwoRewards;
  var tierThreeAmount = req.body.tierThreeAmount;
  var tierThreeRewards = req.body.tierThreeRewards;

  var queryString2 =
    "INSERT INTO projectbundles(projtitle, tier, amount, description) VALUES($1, $2, $3, $4)";
  await pool.query(
    queryString2,
    [projTitle, 1, tierOneAmount, tierOneRewards],
    err => {
      if (err) {
        console.log("tier one problem");
      } else {
        console.log("tier one ok");
      }
    }
  );

  await pool.query(
    queryString2,
    [projTitle, 2, tierTwoAmount, tierTwoRewards],
    err => {
      if (err) {
        console.log("tier two problem");
      } else {
        console.log("tier two ok");
      }
    }
  );

  await pool.query(
    queryString2,
    [projTitle, 3, tierThreeAmount, tierThreeRewards],
    err => {
      if (err) {
        console.log("tier three problem");
      } else {
        console.log("tier three ok");
      }
    }
  );
  // try {
  //   pool.query(queryString, [projTitle, 1, tierOneAmount, tierOneRewards]);
  // } catch(e) {
  // }

  // try {
  //   pool.query(queryString, [projTitle, 3, tierTwoAmount, tierTwoRewards]);
  // } catch(e) {
  // }

  // try {
  //   pool.query(queryString, [projTitle, 3, tierThreeAmount, tierThreeRewards]);
  // } catch(e) {
  // }

  res.redirect("/projects");
});

// project page functions
async function readProjects() {
  try {
    const results = await pool.query("select * from projects");
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function readMyProjects(username) {
  try {
    const results = await pool.query(
      "select * from projects p, owns o where p.projtitle = o.projtitle and o.username = '" +
        username +
        "'"
    );
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function checkProjTitle(projTitle) {
  try {
    var queryString =
      "select * from projects where projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    if (results == undefined) return false;
    return (results.rows[0].projtitle = projTitle);
  } catch (e) {
    return false;
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

async function getOwner(projTitle) {
  try {
    var queryString = "select username from owns where projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getComments(projTitle) {
  try {
    var queryString =
      "select * from projectfeedbacks where projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getUpdates(projTitle) {
  try {
    var queryString =
      "select * from projectupdates where projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectTotalCurrentFunds(projTitle) {
  try {
    var queryString =
      "select sum(pb.amount) from projectbundles pb natural join fundings f where f.projtitle = '" +
      projTitle +
      "'";
    const results = await pool.query(queryString);
    return results.rows[0].sum;
  } catch (e) {
    return 0;
  }
}

async function getProjectFunders(projTitle) {
  try {
    var queryString =
      "select distinct username from fundings where projtitle = '" +
      projTitle +
      "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function checkIfProjectTargetHit(projTitle) {
  try {
    const projInfo = await getProjectInfo(projTitle);
    const targetAmount = projInfo[0].targetamount;
    const currAmount = await getProjectTotalCurrentFunds(projTitle);
    return targetAmount - currAmount <= 0;
  } catch (e) {
    return false;
  }
}

async function checkIfUserLikesProject(username, projTitle) {
  try {
    var queryString =
      "select * from likes where username = '" +
      username +
      "' and projtitle = '" +
      projTitle +
      "'";
    const results = await pool.query(queryString);
    console.log(results.rows);
    if (results.rows == undefined) return false;
    return results.rows[0].username == username;
  } catch (e) {}
}

async function checkIfUserHasFundedTier(currentUser, projTitle, fundTier) {
  try {
    var queryString = "select * from fundings where username = $1 and projtitle = $2 and tier = $3";
    const results = await pool.query(queryString, [currentUser, projTitle, fundTier]);
    console.log(results.rows);
    if (results.rows == undefined) return false;
    return results.rows[0].username == currentUser  ;
  } catch (e) {}
}

async function getUsersWhoLike(projTitle) {
  try {
    var queryString = "select * from likes where projtitle = $1";
    const results = await pool.query(queryString, [projTitle]);
    console.log(results.rows);
    if (results.rows == undefined) return [];
    return results.rows;
  } catch (e) {}
}

//End import part a

module.exports = router;
