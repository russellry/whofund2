var localStategy = require("passport-local").Strategy;
const { Pool } = require("pg");

const pool = new Pool({
  // connectionString: "postgres://postgres:cs2102haha@localhost:5433/postgres"
  connectionString: "postgres://postgres:Pokemon2424!!@localhost:5432/whofund"
});

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user);
  });
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

  passport.use(
    new localStategy(function(username, password, done) {
      console.log(username, password);
      var loginQuery =
        "Select * from users u where " +
        "'" +
        username +
        "' = u.username and u.password = '" +
        password +
        "'";
      console.log(loginQuery);
      try {
        pool.query(loginQuery, (err, results) => {
          if (results.rows[0] != undefined) {
            return done(null, [
              {
                username: results.rows[0].username,
                password: results.rows[0].password
              }
            ]);
          } else {
            return done(null, false);
          }
        });
      } catch (e) {
        console.log(e);
        return done(null, false);
      }
    })
  );
};
