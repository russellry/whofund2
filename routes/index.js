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

router.get("/login-userexists", loggedOut, function(req, res, next) {
  res.render("login-userexists");
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
  //TODO:
  const rows = await readUsers();
  const topKeyboardWarriors = await readKeyboardWarriors();
  const greatTrackRecord = await readTrackRec();
  res.render("users", {
    data: rows,
    kb: topKeyboardWarriors,
    tr: greatTrackRecord
  });
});

// get specific user profile
router.get("/profile/:username", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  const likes = await getUserLikes(req.params.username);
  const following = await getUserFollows(req.params.username);
  const followed = await getUserFollowed(req.params.username);

  var currentUser = req.user[0].username;
  var toFollowUser = req.params.username;
  const projects = await getProjectsByUser(req.params.username);
  const isFollowing = await checkIfUserFollowing(currentUser, toFollowUser);
  var loyalFundersFundeePair = await getLoyalFunders();
  var fundee = [];
  for (var i = 0; i < loyalFundersFundeePair.length; i++) {
    if (req.params.username == loyalFundersFundeePair[i].followee) {
      fundee.push(loyalFundersFundeePair[i].follower);
    }
  }
  console.log(fundee);

  // console.log(req.user[0].username);
  res.render("profile", {
    userinfo: userinfo,
    likes: likes,
    following: following,
    followed: followed,
    currentuser: req.user[0].username,
    isFollow: isFollowing,
    projects: projects,
    loyalFundees: fundee
  });
});

router.get("/my-profile", loggedIn, async (req, res) => {
  var currUser = req.user[0].username;
  console.log("current user is :" + currUser);
  res.redirect("/profile/" + currUser);
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
  } else if (currentUser == toFollowUser) {
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

router.get("/profile/:username/followers", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  const results = await getUserFollowed(req.params.username);

  res.render("followers", { followers: results, userinfo: userinfo });
});

router.get("/profile/:username/following", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  const results = await getUserFollows(req.params.username);

  // console.log(results);

  res.render("followees", { followees: results, userinfo: userinfo });
});

router.get("/profile/:username/liked", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.params.username);
  const results = await getUserLikes(req.params.username);

  // console.log(results);

  res.render("likedprojects", { likes: results, userinfo: userinfo });
});

router.get("/following/projects", loggedIn, async (req, res) => {
  const userinfo = await getUserInfo(req.user[0].username);
  const results = await getUserFollows(req.user[0].username);
  const projArr = await getProjectsOfFollowing(req.user[0].username);

  console.log(projArr);
  // // console.log("user following : " + results);
  // console.log("initial projArr is " + projArr);
  // results.forEach(async (followedUser) => {
  //   console.log(followedUser.followee);
  //   const userProjects = await getProjectsByUser(followedUser.followee);
  //   // console.log("projects = " + fetchProjects);
  //   if (userProjects.length > 0) {
  //     projArr.push(userProjects);
  //   }
  //   console.log(projArr)
  //   // userProjects.forEach((proj) => {
  //   //   projArr.push(proj);
  //   //   console.log(projArr);
  //   // });
  // });
  // // console.log("projArr after all is " + projArr);
  // await console.log(projArr + " is the final projArr");

  res.render("followeeprojects", { projArr: projArr });
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

async function readKeyboardWarriors() {
  try {
    const results = await pool.query(
      "select username, count(*) from ProjectFeedbacks pfb where ( select count(*) from  ProjectFeedbacks pfb2 where  pfb2.userName = pfb.userName and length(pfb2.description) >= 20) >= 2 group by userName ORDER BY count(*) DESC limit 3;"
    );
    console.log(results.rows);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function readTrackRec() {
  try {
    querys =
      "WITH project_total_amount AS (SELECT   projtitle, sum(amount) AS totalamount FROM     fundings NATURAL JOIN projectbundles GROUP BY projtitle ) SELECT owns.username FROM   owns NATURAL join projects NATURAL join project_total_amount WHERE  projects.targetamount <= project_total_amount.totalamount INTERSECT SELECT DISTINCT o1.username FROM   owns o1 WHERE  NOT EXISTS (SELECT 1 FROM   owns o2 WHERE  o2.username = o1.username AND NOT EXISTS (SELECT 1 FROM   projectupdates pu2 WHERE  o2.projtitle = pu2.projtitle GROUP  BY pu2.projtitle HAVING Count(*) >= 2)) INTERSECT SELECT DISTINCT o1.username FROM   owns o1 WHERE  NOT EXISTS (SELECT 1  FROM   owns o2 WHERE  o2.username = o1.username AND NOT EXISTS (SELECT 1 FROM   projectupdates pu2 WHERE  o2.projtitle = pu2.projtitle AND Compare_time_day(current_timestamp::timestamp, pu2.updatetime) <= 90))";
    console.log(querys);
    const results = await pool.query(querys);

    console.log(results.rows);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getLoyalFunders() {
  try {
    // var queryString = "select * from users where username = '" + username + "'";
    var queryString =
      "WITH follower_five_years AS (SELECT DISTINCT follower,followee FROM   follows WHERE  Compare_time_day(current_timestamp :: timestamp, since) >= 1825), projectwithbundle AS (SELECT DISTINCT projtitle, username AS oname FROM   projectbundles NATURAL join owns) SELECT  * FROM    follower_five_years ffy WHERE   EXISTS(SELECT 1 FROM   owns WHERE  owns.username = ffy.followee)AND NOT EXISTS(SELECT 1 FROM   projectwithbundle pwb WHERE  pwb.oname = ffy.followee AND NOT EXISTS (SELECT 1 FROM   projectwithbundle pwb2 join fundings f2 ON   ( pwb2.projtitle = f2.projtitle ) WHERE  pwb2.projtitle = pwb.projtitle AND    pwb2.oname = ffy.followee AND    ffy.follower = f2.username))";
    console.log(queryString);
    const results = await pool.query(queryString);
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

async function getProjectsOfFollowing(username) {
  try {
    const projArr = [];
    const following = await getUserFollows(username);
    console.log(following);
    for (const followedUser of following) {
      const userProjects = await getProjectsByUser(followedUser.followee);
      for (const proj of userProjects) {
        projArr.push(proj);
        // console.log("projArr is appended with " + proj.projtitle);
      }
    }
    // console.log("projArr returned from function is: " + projArr);
    return projArr;
  } catch (e) {
    return [];
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

router.get("/my-projects", loggedIn, async (req, res) => {
  var currentUser = req.user[0].username;

  const rows = await readMyProjects(currentUser);
  res.render("projects", { projInfo: rows });
});

router.get("/project/:projtitle", loggedIn, async (req, res) => {
  const projTitle = req.params.projtitle;

  // console.log(projTitle);
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

  const pastDeadline = await checkIfProjectPastDeadline(projTitle);
  // console.log("Is project past deadline: " + pastDeadline);
  const likers = await getUsersWhoLike(projTitle);
  const milestones = await getProjMilestones(projTitle);

  const bundles = await getAllProjectBundles(projTitle);
  const tierFunding = await getFundedTiersOfProjectByUser(projTitle, currUser); // array of bool for each tier of funding for this proj

  const milestoneHitArray = await getMilestoneHitArray(projTitle);
  // console.log("Milestone hit array is now: " + milestoneHitArray);
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
    milestones: milestones,
    milestoneHitArray: milestoneHitArray,
    bundles: bundles,
    tierFunding: tierFunding,
    pastDeadline: pastDeadline
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
  const projInfo = await getProjectInfo(projTitle);
  const funded = await checkIfUserHasFundedTier(
    currentUser,
    projTitle,
    fundTier
  );
  const tierExists = await checkIfProjectTierExists(projTitle, fundTier);

  if (funded) {
    // fundings has a row with projtitle and curruser and fundtier
    var msg =
      "You have already funded " + projTitle + " at tier " + fundTier + "!";
    res.render("fundResult", {
      projInfo: projInfo,
      currentuser: req.user[0].username,
      msg: msg
    });
  } else if (!tierExists) {
    // projectbundles does not contain this projtitle + tier
    var msg = "Tier '" + fundTier + "' doesn't exist!";
    res.render("fundResult", {
      projInfo: projInfo,
      currentuser: req.user[0].username,
      msg: msg
    });
  } else {
    // we can create a new record for funding with the variables provided
    var queryString =
      "INSERT INTO fundings (username, projtitle, tier) VALUES (";
    queryString +=
      "'" + currentUser + "', '" + projTitle + "', '" + fundTier + "')";
    await pool.query(queryString, err => {
      if (err) {
        // user funding his own project, caught with trigger
        console.log(err);
        var msg = "You cannot fund your own project!";
      } else {
        // success
        console.log("new funding created");
        var msg =
          "Successfully funded " + projTitle + " at tier " + fundTier + "!";
      }
      res.render("fundResult", {
        projInfo: projInfo,
        currentuser: req.user[0].username,
        msg: msg
      });
    });
  }
});

// remove funding by user
router.get("/project/:projtitle/unfund/:tier", loggedIn, async (req, res) => {
  var currentUser = req.user[0].username;
  var projTitle = req.params.projtitle;
  var fundTier = req.params.tier;
  // console.log("Current FundTier is :" + fundTier);
  const projInfo = await getProjectInfo(projTitle);
  const projOwnerInfo = await getOwner(projTitle);
  const projOwnerName = projOwnerInfo[0].username;
  const funded = await checkIfUserHasFundedTier(
    currentUser,
    projTitle,
    fundTier
  );
  // console.log("Funded status is: " + funded);
  if (currentUser == projOwnerName) {
    var msg = "You cannot fund your own project!";
  } else if (!funded) {
    var msg =
      "You have not funded " +
      projTitle +
      " at tier " +
      fundTier +
      " or the tier doesn't exist!";
  } else if (await checkIfProjectPastDeadline(projTitle)) {
    console.log(
      "Project past deadline in get: " +
        (await checkIfProjectPastDeadline(projTitle))
    );
    var msg = "Project deadline is already over! You cannot refund now!";
  } else {
    var queryString =
      "DELETE FROM fundings where username = $1 and projtitle = $2 and tier = $3";
    // console.log(queryString);
    await pool.query(queryString, [currentUser, projTitle, fundTier], err => {
      if (err) {
        // console.log(fundTier);
        console.log("could not delete funding!");
      } else {
        console.log("funding deleted");
      }
    });
    var msg =
      "Successfully unfunded " + projTitle + " at tier " + fundTier + "!";
  }

  res.render("unFundResult", {
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
  projTitle = projTitle.replace(/%20/g, " ");

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

router.get(
  "/project/:projtitle/comment-spam",
  loggedIn,
  async (req, res, next) => {
    var projTitle = req.params.projtitle;
    res.render("comment-spam", { projTitle, projTitle });
  }
);

router.post("/post-comments", loggedIn, async (req, res, next) => {
  curr_url = req.headers.referer;
  splitstr = curr_url.split("/");
  projTitle = splitstr[splitstr.length - 1];
  projTitle = projTitle.replace(/%20/g, " ");
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
      if (err) {
        console.log("stop spamming the comments!");
        res.redirect("/project/" + projTitle + "/comment-spam");
      } else {
        console.log("comment posted!");
        res.redirect(curr_url);
      }
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
  var currentUser = req.user[0].username;
  var categories = req.body.categories;

  const projTitleExists = await checkProjTitle(projTitle);
  if (projTitleExists) {
    res.redirect("/projectexists-error");
    res.end();
  }
  var procedureQuery = "CALL insert_project_own($1, $2, $3, $4, $5, $6);"; //projtitle, date created, desc, targetamt, deadline, ownerusername
  var projDateCreated = api.getDateNow();
  var projectAdded = false;
  try {
    if (typeof categories === "undefined") {
      throw "You must select more than one category.";
    }
    await pool.query(
      procedureQuery,
      [
        projTitle,
        projDateCreated,
        projDesc,
        projTargetAmt,
        projDeadline,
        currentUser
      ],
      async (err, result) => {
        try {
          if (err) {
            console.log("error creating project: " + err);
            throw err;
            // console.log("never redirect?");
          } else {
            // add the rest
            console.log("why this one running?");
            projectAdded = true;
            console.log(categories);

            console.log(typeof categories);
            if (typeof categories == "object") {
              for (var i = 0; i < categories.length; i++) {
                var categoryString =
                  "INSERT INTO taggedwith(projtitle, type) VALUES ('" +
                  projTitle +
                  "', '" +
                  categories[i] +
                  "')";
                console.log(categoryString);
                await pool.query(categoryString, err => {
                  if (err) {
                    console.log("problem adding category");
                  } else {
                    console.log("category added");
                  }
                });
              }
            } else if (typeof categories === "string") {
              var categoryString =
                "INSERT INTO taggedwith(projtitle, type) VALUES ('" +
                projTitle +
                "', '" +
                categories +
                "')";
              console.log(categoryString);
              await pool.query(categoryString, err => {
                if (err) {
                  console.log("problem adding category");
                } else {
                  console.log("category added");
                }
              });
            } else {
              throw "You must select more than one category.";
            }

            var tierOneAmount = req.body.tierOneAmount;
            var tierOneRewards = req.body.tierOneRewards;

            var queryString2 =
              "INSERT INTO projectbundles(projtitle, tier, amount, description) VALUES($1, $2, $3, $4)";
            await pool.query(
              queryString2,
              [projTitle, 1, tierOneAmount, tierOneRewards],
              err => {
                if (err) {
                  console.log("tier one bundle problem");
                } else {
                  console.log("tier one bundle ok");
                }
              }
            );
            if (projectAdded) {
              res.redirect("/projects");
            } else {
              res.redirect("/create-project-error");
            }
          }
        } catch (e) {
          console.log(e);
          res.render("general-error", {
            error: e
          });
        }
      }
    );
  } catch (e) {
    console.log(e);
    res.render("general-error", {
      error: e
    });
    // res.redirect("/create-project-error");
  }
});

router.get("/create-project-error", loggedIn, async (req, res) => {
  res.render("create-project-error");
});
router.get("/projectexists-error", loggedIn, async (req, res) => {
  res.render("projectexists-error");
});

router.get("/access-errorr", loggedIn, async (req, res, next) => {
  res.render("access-error");
});

router.get("/invalidproject-error", loggedIn, async (req, res, next) => {
  res.render("invalidproject-error");
});

router.get("/project/:projtitle/edit", loggedIn, async (req, res, next) => {
  var projInfo = await getProjectInfo(req.params.projtitle);
  var currUser = req.user[0].username;
  var projOwner = await getOwner(projInfo[0].projtitle);
  if (currUser != projOwner[0].username) {
    res.redirect("/access-error");
  }

  res.render("project-edit", { projInfo: projInfo });
});

router.post("/project/:projtitle/edit", loggedIn, async (req, res, next) => {
  var projTitle = req.params.projtitle;
  var projDesc = req.body.projectDesc;
  var projTargetAmt = req.body.projectTargetAmt;
  var projDeadline = req.body.projectDeadline;
  const projTitleExists = await checkProjTitle(projTitle);
  if (!projTitleExists) {
    res.redirect("/invalidproject-error");
  }
  // console.log(projDesc);
  // console.log(projTargetAmt);
  // console.log(projDeadline);
  // console.log(projTitle);
  var queryString =
    "UPDATE projects SET description = $1, targetamount = $2, deadline = $3 where projtitle = $4";
  await pool.query(
    queryString,
    [projDesc, projTargetAmt, projDeadline, projTitle],
    err => {
      if (err) {
        console.log("error updating project");
      } else {
        console.log("updated project");
      }
    }
  );

  var projCategory = req.body.projectCategory;
  console.log("Project Category is : " + projCategory);
  var categoryString = "UPDATE  taggedwith SET type = $1 where projtitle = $2";
  await pool.query(categoryString, [projCategory, projTitle], err => {
    if (err) {
      console.log("problem editing tag");
    } else {
      console.log("tag edited");
    }
  });

  res.redirect("/project/" + projTitle);
});

router.get(
  "/project/:projtitle/add-milestone",
  loggedIn,
  async (req, res, next) => {
    var projInfo = await getProjectInfo(req.params.projtitle);
    var currUser = req.user[0].username;
    var projOwner = await getOwner(projInfo[0].projtitle);
    if (currUser != projOwner[0].username) {
      res.redirect("/access-error");
    }
    res.render("project-add-milestone", { projInfo: projInfo });
  }
);

router.post(
  "/project/:projtitle/add-milestone",
  loggedIn,
  async (req, res, next) => {
    var projTitle = req.params.projtitle;
    var milestoneNumber = req.body.milestoneNumber;
    var milestoneDesc = req.body.milestoneDesc;
    var milestoneTargetAmt = req.body.milestoneTargetAmt;
    const projTitleExists = await checkProjTitle(projTitle);
    if (!projTitleExists) {
      res.redirect("/invalidproject-error");
    }
    var milestoneExist = await checkIfMilestoneExists(
      projTitle,
      milestoneNumber
    );
    if (milestoneExist) {
      res.redirect("/milestoneexists-error");
    }
    var queryString =
      "INSERT INTO projectmilestones(projtitle, milestoneno, amount, description) VALUES ($1, $2, $3, $4)";
    await pool.query(
      queryString,
      [projTitle, milestoneNumber, milestoneTargetAmt, milestoneDesc],
      err => {
        if (err) {
          console.log("problem adding milestone");
        } else {
          console.log("milestone added");
        }
      }
    );
    res.redirect("/project/" + projTitle);
  }
);

router.get("/milestoneexists-error", loggedIn, (req, res, next) => {
  res.render("milestoneexists-error");
});

router.get(
  "/project/:projtitle/add-bundle",
  loggedIn,
  async (req, res, next) => {
    var projInfo = await getProjectInfo(req.params.projtitle);
    var currUser = req.user[0].username;
    var projOwner = await getOwner(projInfo[0].projtitle);
    if (currUser != projOwner[0].username) {
      res.redirect("/access-error");
    }
    res.render("project-add-bundle", { projInfo: projInfo });
  }
);

router.get(
  "/project/:projtitle/bundleexists-error",
  loggedIn,
  (req, res, next) => {
    res.render("bundleexist-error", { projTitle: req.params.projtitle });
  }
);

router.post(
  "/project/:projtitle/add-bundle",
  loggedIn,
  async (req, res, next) => {
    var projTitle = req.params.projtitle;
    var bundleTierNumber = req.body.bundleTierNumber;
    var bundleTierDesc = req.body.bundleTierDesc;
    var bundleTierFundAmt = req.body.bundleTierFundAmt;
    const projTitleExists = await checkProjTitle(projTitle);
    if (!projTitleExists) {
      res.redirect("/invalidproject-error");
    }

    var bundleExists = await checkIfBundleExists(projTitle, bundleTierNumber);
    if (bundleExists) {
      res.redirect("/project/" + projTitle + "/bunddleexists-error");
    } else {
      var queryString =
        "INSERT INTO projectbundles(projtitle, tier, amount, description) VALUES ($1, $2, $3, $4)";
      await pool.query(
        queryString,
        [projTitle, bundleTierNumber, bundleTierFundAmt, bundleTierDesc],
        err => {
          if (err) {
            console.log("problem adding bundle");
          } else {
            console.log("bundle added");
          }
        }
      );
      res.redirect("/project/" + projTitle);
    }
  }
);

router.get("/project/:projtitle/delete", loggedIn, async (req, res, next) => {
  var projTitle = req.params.projtitle;
  const results = await deleteProject(projTitle);
  console.log("trying to delete project now");
  if (results) {
    console.log("project deleted");
    res.redirect("/projects");
  } else {
    console.log("failed to delete project");
    res.redirect("/project/" + projTitle);
  }
});

router.get("/projects/categories", loggedIn, async (req, res, next) => {
  const results = await getProjectCategories();
  console.log(results);
  res.render("project-categories", { categories: results });
});

router.get("/projects/category/:type", loggedIn, async (req, res, next) => {
  var type = req.params.type;
  const results = await getProjectsByCategory(type);
  res.render("project-list-by-category", { projects: results, type: type });
});

// project page functions
//
//

async function getProjectsByUser(username) {
  try {
    var queryString = "select * from owns where username = '" + username + "'";
    const results = await pool.query(queryString);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectsByCategory(type) {
  try {
    var queryString = "select * from taggedwith where type = $1";
    const results = await pool.query(queryString, [type]);
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function getProjectCategories() {
  try {
    const results = await pool.query("select * from categories");
    return results.rows;
  } catch (e) {
    return [];
  }
}

async function checkIfBundleExists(projTitle, bundleTierNumber) {
  try {
    var queryString =
      "select * from projectbundles where projtitle = $1 and tier = $2";
    const results = await pool.query(queryString, [
      projTitle,
      bundleTierNumber
    ]);
    if (results == undefined) return false;
    return (results.rows[0].projtitle = projTitle);
  } catch (e) {
    return false;
  }
}

async function readProjects() {
  try {
    const results = await pool.query(
      "select * from projects natural join owns"
    );
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
    var queryString =
      "select username from owns where projtitle = '" + projTitle + "'";
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
    // console.log(results.rows);
    if (results.rows == undefined) return false;
    return results.rows[0].username == username;
  } catch (e) {}
}

async function checkIfProjectTierExists(projTitle, fundTier) {
  try {
    var queryString =
      "select * from projectbundles where projtitle = $1 and tier = $2";
    const results = await pool.query(queryString, [projTitle, fundTier]);
    // console.log(results.rows);
    if (results.rows[0] == undefined) return false;
    return results.rows[0].projtitle == projTitle;
  } catch (e) {
    console.log(e);
  }
}

async function checkIfUserHasFundedTier(currentUser, projTitle, fundTier) {
  try {
    var queryString =
      "select * from fundings where username = $1 and projtitle = $2 and tier = $3";
    const results = await pool.query(queryString, [
      currentUser,
      projTitle,
      fundTier
    ]);
    // console.log(results.rows);
    if (results.rows == undefined) return false;
    return results.rows[0].username == currentUser;
  } catch (e) {}
}

async function getUsersWhoLike(projTitle) {
  try {
    var queryString = "select * from likes where projtitle = $1";
    const results = await pool.query(queryString, [projTitle]);
    // console.log(results.rows);
    if (results.rows == undefined) return [];
    return results.rows;
  } catch (e) {}
}

async function checkIfMilestoneExists(projTitle, milestoneNumber) {
  try {
    var queryString =
      "select * from projectmilestones where projtitle = $1 and milestoneno = $2";
    const results = await pool.query(queryString, [projTitle, milestoneNumber]);
    // console.log(results.rows);
    if (results.rows == undefined) return false;
    return (results.rows[0].projtitle = projTitle);
  } catch (e) {
    return false;
  }
}

async function getProjMilestones(projTitle) {
  try {
    var queryString = "select * from projectmilestones where projtitle = $1";
    const results = await pool.query(queryString, [projTitle]);
    // console.log(results.rows);
    if (results.rows == undefined) return [];
    return results.rows;
  } catch (e) {}
}

async function getAllProjectBundles(projTitle) {
  try {
    var queryString =
      "select * from projectbundles where projtitle = $1 order by tier asc";
    const results = await pool.query(queryString, [projTitle]);
    // console.log(results.rows);
    if (results.rows == undefined) return [];
    return results.rows;
  } catch (e) {}
}

async function getProjectBundleItem(projTitle, tier) {
  try {
    var queryString =
      "select * from projectbundles where projtitle = $1 and tier = $2";
    // console.log("Tier is " + tier)
    const results = await pool.query(queryString, [projTitle, tier]);
    // console.log(results.rows);
    if (results.rows == undefined) return [];
    return results.rows;
  } catch (e) {}
}

async function getFundedTiersOfProjectByUser(projTitle, currUser) {
  const arr = [];
  try {
    var queryString =
      "select * from fundings where projtitle = $1 and username = $2";
    const results = await pool.query(queryString, [projTitle, currUser]);
    console.log(results.rows);
    if (results.rows == undefined) return [];
    results.rows.forEach(item => {
      arr.push(item.tier);
    });
    return arr;
  } catch (e) {
    return [];
  }
}

async function deleteProject(projTitle) {
  try {
    var queryString = "delete from owns where projtitle = $1";
    var queryString1 = "delete from fundings where projtitle = $1";
    var queryString2 = "delete from likes where projtitle = $1";
    var queryString3 = "delete from taggedwith where projtitle = $1";
    var queryString4 = "delete from projects where projtitle = $1";

    await pool.query(queryString, [projTitle]);
    await pool.query(queryString1, [projTitle]);
    await pool.query(queryString2, [projTitle]);
    await pool.query(queryString3, [projTitle]);
    await pool.query(queryString4, [projTitle]);
    return true;
  } catch (e) {
    console.log("error with deleting project!");
    console.log("Error is: " + e);
    return false;
  }
}

async function getMilestoneHitArray(projTitle) {
  const arr = [];
  try {
    var currentFunds = await getProjectTotalCurrentFunds(projTitle);
    // console.log(currentFunds);
    var queryString =
      "select * from projectmilestones where projtitle = '" + projTitle + "'";
    const results = await pool.query(queryString);
    // console.log("milestone hit array calculation : " + results.rows);
    if (results.rows == undefined) return [];
    results.rows.forEach(milestone => {
      if (milestone.amount <= currentFunds) {
        arr.push(milestone.milestoneno);
      }
    });
    return arr;
  } catch (e) {
    return arr;
  }
}

async function checkIfProjectPastDeadline(projTitle) {
  try {
    var queryString =
      "select date(deadline) from projects where projtitle = '" +
      projTitle +
      "'";
    const results = await pool.query(queryString);
    // console.log(results.rows);
    var currentDate = api.getDateNow();
    var currYear = currentDate.slice(0, 4);
    var currMonth = currentDate.slice(5, 7);
    var currDate = currentDate.slice(8, 10);
    // console.log("Current: Year: " + currYear + ", Month: " + currMonth + ", Date: " + currDate)
    var projDeadline = results.rows[0].date;
    var deadlineYear = projDeadline.getFullYear();
    var deadlineMonth = projDeadline.getMonth() + 1;
    var deadlineDate = projDeadline.getDate();
    // console.log("Deadline: Year: " + deadlineYear + ", Month: " + deadlineMonth + ", Date: " + deadlineDate );
    if (currYear > deadlineYear) {
      // current year is > deadline year
      return true;
    } else if (currYear == deadlineYear) {
      // curr year == deadline year
      if (currMonth > deadlineMonth) {
        // curr year == deadline year, curr month > deadline month
        return true;
      } else if (currMonth == deadlineMonth) {
        // same year, same month, check day
        return currDate > deadlineDate;
      } else {
        // same year, but curr month < deadline month
        return false;
      }
    } else {
      // curr year < deadline year
      return false;
    }
  } catch (e) {
    console.log(e);
  }
}

//End import part a

module.exports = router;
