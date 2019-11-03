var express = require("express");
var router = express.Router();
var api = require("../api/index");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://postgres:cs2102haha@localhost:5433/postgres"
});

module.exports = function(passport) {
  /* GET home page. */
  router.post("/signup", function(req, res) {
    var body = req.body;
    var username = body.username,
      password = body.password;
    var queryString =
      "INSERT INTO users (username, password, joineddate) VALUES(";
    var todayDate = api.getDateNow();
    queryString +=
      "'" + username + "', '" + password + "', '" + todayDate + "')";
    console.log(queryString);
    try {
      pool.query(queryString, (err, result) => {
        if (result) {
          console.log("user creaated");
          res.redirect("/login");
        } else {
          res.status(500).send("Username already exists");
        }
      });
    } catch {
      res.status(500).send("error occurred");
    }
  });
  router.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login"
    })
  );
  return router;
};
