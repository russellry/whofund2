DROP TABLE IF EXISTS Users CASCADE;
DROP TABLE IF EXISTS Follows CASCADE;
DROP TABLE IF EXISTS Projects CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS owns CASCADE;
DROP TABLE IF EXISTS Categories CASCADE;
DROP TABLE IF EXISTS TaggedWith CASCADE;
DROP TABLE IF EXISTS ProjectFeedbacks CASCADE;
DROP TABLE IF EXISTS ProjectMileStones CASCADE;
DROP TABLE IF EXISTS ProjectUpdates CASCADE;
DROP TABLE IF EXISTS ProjectBundles CASCADE;
DROP TABLE IF EXISTS Fundings CASCADE;

CREATE TABLE Users (
   userName VARCHAR (64) PRIMARY KEY,
   password CHAR (64) NOT NULL, 
   joinedDate TIMESTAMP NOT NULL
);

CREATE TABLE Follows(
   follower VARCHAR (64),
   followee VARCHAR (64),
   since TIMESTAMP NOT NULL,
   PRIMARY KEY (follower, followee),
   FOREIGN KEY (follower) REFERENCES Users(userName),
   FOREIGN KEY (followee) REFERENCES Users(userName)
);

CREATE TABLE Projects(
   projTitle VARCHAR(128) PRIMARY KEY,
   dateCreated DATE NOT NULL,
   description VARCHAR (512) NOT NULL,
   targetAmount INT NOT NULL,
   deadLine DATE NOT NULL,
   CHECK (targetAmount > 0)
);

CREATE TABLE Likes (
   userName VARCHAR (64),
   projTitle VARCHAR(128),
   PRIMARY KEY (userName, projTitle),
   FOREIGN KEY (userName) REFERENCES Users(userName),
   FOREIGN KEY (projTitle) REFERENCES Projects(projTitle)
);

CREATE TABLE Owns (
   userName VARCHAR (64),
   projTitle VARCHAR(128),
   UNIQUE (projTitle), /*ensure one project is owned by one user */
   PRIMARY KEY (userName, projTitle),
   FOREIGN KEY (userName) REFERENCES Users(userName),
   FOREIGN KEY (projTitle) REFERENCES Projects(projTitle)
);


CREATE TABLE Categories(
   type VARCHAR(64) PRIMARY KEY /*technology, design, agriculture and shit*/
);


CREATE TABLE TaggedWith(
   projTitle VARCHAR(128),
   type VARCHAR(64),
   PRIMARY KEY (projTitle, type),
   FOREIGN KEY (projTitle) REFERENCES Projects(projTitle),
   FOREIGN KEY (type) REFERENCES Categories(type)
);


CREATE TABLE ProjectFeedbacks(
	projTitle VARCHAR(128) REFERENCES projects ON DELETE CASCADE,
	userName VARCHAR (64) REFERENCES Users,
	commentTime TIMESTAMP NOT NULL,
	description VARCHAR(355) NOT NULL,
	PRIMARY KEY (projTitle, userName, commentTime)
);

CREATE TABLE ProjectMileStones(
	projTitle VARCHAR(128) REFERENCES projects ON DELETE CASCADE,
	milestoneNo INT NOT NULL,
	amount INT NOT NULL,
	description VARCHAR(355) NOT NULL,
	PRIMARY KEY (projTitle, milestoneNo),
	check (milestoneNo > 0)
);



CREATE TABLE ProjectUpdates(
	projTitle VARCHAR(128) REFERENCES projects ON DELETE CASCADE,
	updateTime TIMESTAMP NOT NULL,
	description VARCHAR(355) NOT NULL,
	PRIMARY KEY (projTitle, updateTime)
);



CREATE TABLE ProjectBundles(
	projTitle VARCHAR(128) REFERENCES projects ON DELETE CASCADE,
	tier INT NOT NULL,
	amount INT NOT NULL,
	description VARCHAR(355) NOT NULL,
	PRIMARY KEY (projTitle, tier),
	CHECK (tier > 0 )
);


CREATE TABLE Fundings(
	userName VARCHAR(64) REFERENCES Users,
	projTitle VARCHAR(128),
	tier INT,
	PRIMARY KEY (userName, projTitle, tier),
	FOREIGN KEY (projTitle, tier) REFERENCES ProjectBundles(projTitle, tier)
);

/* TRIGGERS each user cannot spam comments, only can comment after every 1 hours */

CREATE OR REPLACE FUNCTION
compare_time_hours(time1 timestamp, time2 timestamp)
returns numeric AS
$$
BEGIN
return DATE_PART('day', time1 - time2) * 24 + DATE_PART('hour', time1 - time2);
END;
$$
LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION not_within_an_hour()
returns TRIGGER AS
$$
DECLARE count NUMERIC;
BEGIN
	Select COUNT(*) INTO count 
	from ProjectFeedbacks pfb
	where compare_time_hours(NEW.commentTime , pfb.commentTime) < 1 and NEW.userName = pfb.userName and NEW.projTitle = pfb.projTitle;
	IF count > 0 THEN
	RAISE exception 'commenting too frequently, wait an hour later';
		return NULL; /* prevent */
	ELSE
		return NEW; /* allow */
	END IF;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_feedback_insert ON ProjectFeedbacks CASCADE;

CREATE TRIGGER check_feedback_insert
BEFORE INSERT OR UPDATE ON ProjectFeedbacks
FOR EACH ROW 
EXECUTE PROCEDURE not_within_an_hour();











/* TRIGGERS each user can own at most 5 projects */

CREATE OR REPLACE FUNCTION own_five_project()
returns TRIGGER AS
$$
DECLARE count NUMERIC;
BEGIN
	Select COUNT(*) INTO count 
	from Owns o
	where NEW.userName = o.userName;
	IF count >= 5 THEN
	RAISE exception 'cannot own more than 5 projects';
		return NULL; /* prevent */
	ELSE
		return NEW; /* allow */
	END IF;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_own_five_projects ON Owns CASCADE;

CREATE TRIGGER check_own_five_projects
BEFORE INSERT OR UPDATE ON Owns
FOR EACH ROW 
EXECUTE PROCEDURE own_five_project();




/*owner of the project should not be able to fund their own project through the portal, 
this defeats the purpose of asking for funding. */

CREATE OR REPLACE FUNCTION own_project()
returns TRIGGER AS
$$
DECLARE count NUMERIC;
BEGIN
	Select COUNT(*) INTO count 
	from owns o
	where NEW.userName = o.userName and NEW.projTitle = o.projTitle;
	IF count >= 1 THEN
	RAISE exception 'cannot fund your own project';
		return NULL; /* prevent */
	ELSE
		return NEW; /* allow */
	END IF;
END;
$$
LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_own_project ON Fundings CASCADE;

CREATE TRIGGER check_own_project
BEFORE INSERT OR UPDATE ON Fundings
FOR EACH ROW 
EXECUTE PROCEDURE own_project();

CREATE OR REPLACE FUNCTION
compare_time_day(time1 timestamp, time2 timestamp)
returns numeric AS
$$
BEGIN
return DATE_PART('day', time1 - time2);
END;
$$
LANGUAGE plpgsql;


/* procedure */
CREATE OR REPLACE PROCEDURE 
insert_project_own(projTitle VARCHAR(128), dateCreated DATE, 
description VARCHAR(512), targetAmount integer, deadLine DATE, userName VARCHAR(64))
AS 
$$
BEGIN
INSERT INTO Projects  VALUES (projTitle, dateCreated, description, targetAmount, deadLine);
INSERT INTO Owns VALUES (userName, projTitle);
END;
$$
LANGUAGE plpgsql;

/*function to compare time to hours , current time - time*/
CREATE OR REPLACE FUNCTION 
compare_time_hours(time1 timestamp,time2 timestamp) 
returns numeric AS 
$$ 
BEGIN
RETURN Date_part('day', time1 - time2) * 24 + Date_part('hour', time1 - time2);
END;
$$ 
LANGUAGE plpgsql;

/*function to compare time to day, current time - time*/
CREATE OR REPLACE FUNCTION compare_time_day(time1 timestamp, time2 timestamp) 
returns numeric AS  
$$ 
BEGIN 
RETURN Date_part('day', time1 - time2);
END;
$$
LANGUAGE plpgsql;


