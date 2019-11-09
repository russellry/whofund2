# whofund2

## First Step: Setting up IDE
```
git clone https://github.com/russellry/whofund2.git
cd whofund2
npm i
nodemon ./bin/www
```

## Second Step: Setting up PostgreSQL
Open up SchemaCreation.sql, copy & paste it in your database

Ctrl find all and replace your connection string with your personal one
connectionString: "postgres://[postgres username]:[postgres pass]@localhost:5432/[postgres database]"
