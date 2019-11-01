var express = require("express");
var router = express.Router();
var api = require("../api");

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://postgres:Pokemon2424!!@localhost:5432/whofund"
});

// static files
router.use("/", express.static("images"));
router.use("/", express.static("javascripts"));
router.use("/", express.static("stylesheets"));

var loggedIn = function(req, res, next) {
  console.log(req.isAuthenticated());
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/login", function(req, res, next) {
  res.render("login");
});

router.get("/signup", function(req, res, next) {
  res.render("signup");
});

router.get("/home", loggedIn, function(req, res, next) {
  res.render("home");
});

router.get("/logout", function(req, res, next) {
  req.logOut();
  req.redirect("/login");
});

//Imported from old code part a

router.post("/project-signup", (req, res, next) => {
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

// project exists error page
router.get("/error/projectexists", (res, req) => {
  res.render("project-exists");
});

router.get("/user-signup", function(req, res, next) {
  res.render("user-signup");
});
router.get("/", (request, response) => response.render("home"));

// user pages
router.get("/users", async (req, res) => {
  const rows = await readUsers();
  res.render("users", { data: rows });
});

router.get("/profile/:username", async (req, res) => {
  const row = await getUserInfo(req.params.username);
  // await getUserInfo(req.params.username);
  res.render("profile", { data: row });
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

//project pages
router.get("/project/new", (req, res) => res.render("project-signup"));

router.get("/projects", async (req, res) => {
  const rows = await readProjects();
  res.render("projects", { data: rows });
  // var queryString = "Select * from projects";
  // pool.query(queryString, (err, data) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     document.getElementById("project-list-data").innerHTML = data.rows;
  //     console.log("got all of the projects");
  //   }
  // });
});

router.get("/project/:projtitle", async (req, res) => {
  const row = await getProjectInfo(req.params.projtitle);
  res.render("project-detail", { data: row });
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

//End import part a

module.exports = router;
