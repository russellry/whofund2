var localStategy = require("passport-local").Strategy;
var crypto = require("crypto");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: "postgres://postgres:cs2102haha@localhost:5433/postgres"
  // connectionString: "postgres://postgres:Pokemon2424!!@localhost:5432/whofund"
});

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  passport.use(
    new localStategy(async function(username, password, done) {
      console.log(username, password);
      var enteredPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex")
        .toUpperCase();
      var loginQuery =
        "Select * from users where username = '" +
        username +
        "' and password = '" +
        enteredPassword +
        "'";

      console.log(loginQuery);

      try {
        const results = await pool.query(loginQuery);
        if (results.rows[0] != undefined) {
          // console.log("stored password is: " + results.rows[0].password);
          return done(null, [
            {
              username: results.rows[0].username,
              password: results.rows[0].password
            }
          ]);
        } else {
          return done(null, false);
        }
      } catch (e) {
        console.log(e);
        return done(null, false);
      }
    })
  );
};
