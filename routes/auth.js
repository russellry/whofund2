var express = require("express");
var router = express.Router();
var api = require("../api/index");
var crypto = require("crypto");
const { Pool } = require("pg");

const pool = new Pool({
  // connectionString: "postgres://postgres:cs2102haha@localhost:5433/postgres"
  connectionString: "postgres://postgres:Pokemon2424!!@localhost:5432/whofund"
});

module.exports = function(passport) {
  /* GET home page. */
  router.post("/signup", async function(req, res) {
    var body = req.body;
    var username = body.username;
    var hashedPassword = await crypto
      .createHash("sha256")
      .update(body.password)
      .digest("hex");
    console.log("hashed pw = " + hashedPassword);
    var queryString =
      "INSERT INTO users (username, password, joineddate) VALUES(";
    var todayDate = api.getDateNow();
    queryString +=
      "'" +
      username +
      "', '" +
      hashedPassword.toString() +
      "', '" +
      todayDate +
      "')";
    console.log(queryString);
    try {
      pool.query(queryString, async (err, result) => {
        if (result) {
          console.log("user creaated");
          // const queryres = await pool.query("select * from users where username = '" + username + "'");
          // console.log("actual stored pw = " + queryres.rows[0].password);
          res.redirect("/login");
        } else {
          res.redirect("/login-userexists");
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
