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




/*data entry*/
/*data for Users table*/
INSERT INTO Users VALUES('ahkao', 'D9FBD65654E2D8678281D701E049239C6221F48DC76252B8D7E5F8252B909C87', '2010-06-22 19:10:25'); /* pw is ahkao converted to sha256 */
INSERT INTO Users VALUES('ahkaofollow', '8F5C816EF0886D95DEC94DE8CE32395223765556B38EE5BDCE1677B715BFE092', '2010-07-22 19:10:25'); /* pw is ahkaofollow converted to sha256 */
INSERT INTO Users VALUES('russ1', 'd55953edc753b67c25bff1d656136304f34167f602ca2df5d905cfd371418d1b', '2011-07-22 19:10:25'); 
INSERT INTO Users VALUES('russ2', 'b12fef31456253cf508ccce7f52317efc32cd9b1b611c45c6cde16b013d2f77e', '2012-07-22 19:10:25'); 
INSERT INTO Users VALUES('waynetest', 'ec8ee911354ba731e7ca46077c2fad2024e00a74c2fd9f2f2603fb2a1a1545b4', '2012-08-22 19:10:25'); 


/*data for Projects table*/
INSERT INTO Projects VALUES ('AhKaoPhoneMagicRepairer', '2017-01-26', 'this is a special product that will magically fix your spoilt phone', '5000', '2019-11-26');
INSERT INTO Projects VALUES ('russspecialproject', '2017-02-26', 'this will make you fail exams', '5000', '2019-11-26');
INSERT INTO Projects VALUES ('russspecialproject2', '2017-02-26', 'this will make you fail exams2', '5000', '2019-11-28');
INSERT INTO Projects VALUES ('russspecialproject3', '2017-02-26', 'this will make you fail exams3', '5000', '2019-11-29');
INSERT INTO Projects VALUES ('testingforwayne', '2017-02-26', 'bopipass', '500', '2019-11-29');

/*data for owns table*/
INSERT INTO Owns VALUES ('ahkao', 'AhKaoPhoneMagicRepairer');
INSERT INTO Owns VALUES ('russ2', 'russspecialproject');
INSERT INTO Owns VALUES ('russ2', 'russspecialproject2');
INSERT INTO Owns VALUES ('russ2', 'russspecialproject3');
INSERT INTO Owns VALUES ('waynetest', 'testingforwayne');

/*data for projectfeedback table*/
INSERT INTO ProjectFeedbacks VALUES ('AhKaoPhoneMagicRepairer', 'ahkaofollow', '2016-07-24 19:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('AhKaoPhoneMagicRepairer', 'ahkaofollow', '2016-07-25 19:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('AhKaoPhoneMagicRepairer', 'ahkaofollow', '2016-07-26 19:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('AhKaoPhoneMagicRepairer', 'ahkaofollow', '2016-07-27 19:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject', 'russ1', '2016-07-26 19:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject2', 'russ1', '2016-07-27 20:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject3', 'russ1', '2016-07-28 21:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject', 'russ1', '2016-08-29 22:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject', 'russ2', '2016-08-2 19:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject3', 'russ2', '2016-08-25 20:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject3', 'russ2', '2016-08-26 20:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject2', 'russ2', '2016-08-27 21:10:25', 'i sincerely like your product');
INSERT INTO ProjectFeedbacks VALUES ('russspecialproject', 'russ2', '2016-08-28 22:10:25', 'i sincerely like your product');


/*data for follows table*/
INSERT INTO Follows VALUES ('ahkaofollow', 'ahkao', '2016-07-24 19:10:25');
INSERT INTO Follows VALUES ('russ1', 'russ2', '2012-07-24 19:10:25');
INSERT INTO Follows VALUES ('russ2', 'ahkao', '2012-07-24 19:10:25');

/*data for likes table*/
INSERT INTO Likes VALUES ('ahkaofollow', 'AhKaoPhoneMagicRepairer');
INSERT INTO Likes VALUES ('russ1', 'russspecialproject');

/*data for categories table*/
INSERT INTO Categories VALUES ('Art'), ('Comics'), ('Crafts'), ('Dance'), ('Design'), ('Fashion'), ('Film'), ('Food'), ('Games'), ('Journalism'), ('Music'), ('Photography'), ('Publishing'), ('Technology'), ('Theater');

/*data for taggedWith table*/
INSERT INTO TaggedWith VALUES ('AhKaoPhoneMagicRepairer', 'Technology'), ('AhKaoPhoneMagicRepairer', 'Crafts'),  ('russspecialproject', 'Technology'),  ('russspecialproject2', 'Technology'),  ('russspecialproject3', 'Technology'),  ('testingforwayne', 'Technology');


/*data for ProjectBundles table*/
INSERT INTO ProjectBundles VALUES('AhKaoPhoneMagicRepairer', '1', '20', 'This is only the product'), ('AhKaoPhoneMagicRepairer', '2', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('russspecialproject', '1', '50', 'This is only the product'), ('russspecialproject', '2', '150', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('russspecialproject2', '1', '50', 'This is only the product'), ('russspecialproject2', '2', '150', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('russspecialproject3', '1', '50', 'This is only the product'), ('russspecialproject3', '2', '150', 'This includes 3x the product');
INSERT INTO ProjectBundles(projtitle, tier, amount, description) VALUES ('AhKaoPhoneMagicRepairer', 3, 100, 'add this for fun');

/*data for ProjectMileStone table*/
INSERT INTO ProjectMileStones VALUES('AhKaoPhoneMagicRepairer','1','200','i will send a welcome letter to you'), ('AhKaoPhoneMagicRepairer','2','1000','Each bundle will have additional stickers :D');
INSERT INTO ProjectMileStones VALUES('russspecialproject','1','200','russ will send a welcome letter to you'), ('russspecialproject','2','1000','Each bundle will have additional russ message:D');
INSERT INTO ProjectMileStones VALUES('russspecialproject2','1','200','russ project 2 will send a welcome letter to you'), ('russspecialproject','2','1000','Each bundle will have additional russ project 2  message:D');
INSERT INTO ProjectMileStones VALUES('russspecialproject3','1','200','russ project 3 will send a welcome letter to you'), ('russspecialproject','2','1000','Each bundle will have additional russ project 3  message:D');

/*data for ProjectUpdates table*/
INSERT INTO ProjectUpdates VALUES('AhKaoPhoneMagicRepairer','2016-08-24 19:10:25', 'The product design and production is on track!');
INSERT INTO ProjectUpdates VALUES('russspecialproject','2017-08-24 19:10:25', 'The rus project design and production is on track!');

/*data for Fundings table*/
INSERT INTO Fundings VALUES ('ahkaofollow',  'AhKaoPhoneMagicRepairer', '2');
INSERT INTO Fundings VALUES ('russ1',  'russspecialproject', '2');
INSERT INTO Fundings VALUES ('russ1',  'russspecialproject', '1');
INSERT INTO Fundings VALUES ('russ1',  'russspecialproject2', '2');
INSERT INTO Fundings VALUES ('russ1',  'russspecialproject3', '1');
INSERT INTO Fundings VALUES ('russ1',  'russspecialproject3', '2');

/* data dummy */
/*User (11 rows) *username is the same as password*/
INSERT INTO Users VALUES('ahbeng', '7f23a0483f151083f8a9e136f3a3d60b1cb5073c1cbb60dec029eb17fdcc1c42 ', '2018-06-22 22:10:25');
INSERT INTO Users VALUES('ahlong', '8c4aa2f5d2e0057f95483c335296d5a578777d6e407f9d47cbae39263b535453', '2017-07-01 22:10:25');
INSERT INTO Users VALUES('ahmand', 'fd1e4690ea07be36b3b001892cd0bdf76fb125e0b42086153a21d9ac6a6e5455', '2018-07-01 02:10:25');
INSERT INTO Users VALUES('jane','81f8f6dde88365f3928796ec7aa53f72820b06db8664f5fe76a7eb13e24546a2', '2019-07-01 02:10:25');
INSERT INTO Users VALUES('john','96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a', '2019-01-01 02:10:25');
INSERT INTO Users VALUES('samuel','90cc33a41b541af2c1964e3e10a46088cbdedf63031efaa35d588a698c91193f', '2012-01-01 02:10:25');
INSERT INTO Users VALUES('sean','2d1d92b1f4cc7fd3ef215da88c2826ab3ec2ced95b388b395b658c41b349c90e', '2012-01-01 02:10:25');
INSERT INTO Users VALUES('tom','e1608f75c5d7813f3d4031cb30bfb786507d98137538ff8e128a6ff74e84e643', '2012-01-01 02:10:25');
INSERT INTO Users VALUES('arthur','befa156f0283eb0062beb9b86e16a413e1cf8c5135e5518d5c4fa321ce0c7b6b', '2014-01-01 02:10:25');
INSERT INTO Users VALUES('betty','061b67d6e7ab579da2610e27e631aa4beda1ffe75c0a1b3f3f1c0b97780b4052', '2014-01-01 02:10:25');
INSERT INTO Users VALUES('sarah','d233633d9524e84c71d6fe45eb3836f8919148e4a5fc2234cc9e6494ec0f11c2', '2014-07-01 02:10:25');



INSERT INTO Projects VALUES ('ShadyPhoneStore', '2017-02-26', 'buy phone cheap cheap ', '15000', '2020-11-26');
INSERT INTO Owns VALUES ('ahbeng', 'ShadyPhoneStore');
INSERT INTO Projects VALUES ('CheapLolexWatch', '2017-02-26', 'Invest in cheap real lolex watch', '1500', '2019-11-26');
INSERT INTO Owns VALUES ('ahbeng', 'CheapLolexWatch');
INSERT INTO Projects VALUES ('SimLimHardwareShop', '2017-02-26', 'make and buy cheap hardware parts', '1500', '2019-11-26');
INSERT INTO Owns VALUES ('ahbeng', 'SimLimHardwareShop');

INSERT INTO Projects VALUES ('jerryTheMouse', '2017-02-26', 'mouse catching machines', '15000', '2020-11-26');
INSERT INTO Owns VALUES ('tom', 'jerryTheMouse');
INSERT INTO Projects VALUES ('goodCatMachines', '2017-02-26', 'cat machines that can be a cat', '15000', '2018-11-26');
INSERT INTO Owns VALUES ('tom', 'goodCatMachines');
INSERT INTO Projects VALUES ('sandwichesmaker', '2017-02-26', 'this thing make good sandwiches', '25000', '2018-11-26');
INSERT INTO Owns VALUES ('sarah', 'sandwichesmaker');
INSERT INTO Projects VALUES ('toiletCleaner', '2017-02-26', 'clean toilet for you', '25000', '2018-11-26');
INSERT INTO Owns VALUES ('sarah', 'toiletCleaner');
INSERT INTO Projects VALUES ('goodcalculator', '2017-02-26', 'this calculator can calculate up to 3 decimal', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('sean', 'goodcalculator');
INSERT INTO Projects VALUES ('goodbook', '2017-02-26', 'this book is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('sean', 'goodbook');
INSERT INTO Projects VALUES ('goodluck', '2017-02-26', 'this luck is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('sean', 'goodluck');
INSERT INTO Projects VALUES ('goodyear', '2017-02-26', 'this year is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('sean', 'goodyear');
INSERT INTO Projects VALUES ('goodman', '2017-02-26', 'this man is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('sean', 'goodman');
INSERT INTO Projects VALUES ('goodday', '2017-02-26', 'this day is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('samuel', 'goodday');
INSERT INTO Projects VALUES ('goodcook', '2017-02-26', 'this cook is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('samuel', 'goodcook');
INSERT INTO Projects VALUES ('goodwife', '2017-02-26', 'this wife is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('samuel', 'goodwife');
INSERT INTO Projects VALUES ('gooddie', '2017-02-26', 'this die is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('samuel', 'gooddie');
INSERT INTO Projects VALUES ('goodson', '2017-02-26', 'this son is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('samuel', 'goodson');
INSERT INTO Projects VALUES ('goodbrush', '2017-02-26', 'this brush can calculate up to 3 decimal', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('arthur', 'goodbrush');
INSERT INTO Projects VALUES ('goodbottle', '2017-02-26', 'this bottle is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('arthur', 'goodbottle');
INSERT INTO Projects VALUES ('goodphone', '2017-02-26', 'this phone is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('arthur', 'goodphone');
INSERT INTO Projects VALUES ('goodspec', '2017-02-26', 'this spec is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('arthur', 'goodspec');
INSERT INTO Projects VALUES ('goodcontrol', '2017-02-26', 'this control is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('arthur', 'goodcontrol');
INSERT INTO Projects VALUES ('goodtv', '2017-02-26', 'this tv is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('john', 'goodtv');
INSERT INTO Projects VALUES ('goodstaple', '2017-02-26', 'this staple is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('john', 'goodstaple');
INSERT INTO Projects VALUES ('goodwire', '2017-02-26', 'this wire is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('john', 'goodwire');
INSERT INTO Projects VALUES ('goodeyes', '2017-02-26', 'this eyes is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('john', 'goodeyes');
INSERT INTO Projects VALUES ('goodchair', '2017-02-26', 'this chair is good', '25000', '2020-11-26');
INSERT INTO Owns VALUES ('john', 'goodchair');

INSERT INTO ProjectFeedbacks VALUES ('ShadyPhoneStore', 'betty', '2017-07-24 19:10:25', 'i want to see your manager');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'betty', '2017-07-24 19:10:25', 'i want to see your manager, no good');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'betty', '2017-07-25 19:10:25', 'this is so slow');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'betty', '2017-07-26 19:10:25', 'no fair');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'sarah', '2017-07-24 19:10:25', 'this is fake');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'john', '2017-07-24 19:10:25', 'this is fake news');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'sean', '2017-07-24 19:10:25', 'this is good stuff');
INSERT INTO ProjectFeedbacks VALUES ('CheapLolexWatch', 'ahmand', '2016-07-24 19:10:25', 'I no money buy');

INSERT INTO Follows VALUES ('ahmand', 'ahbeng', '2019-07-24 19:10:25');
INSERT INTO Follows VALUES ('sarah', 'ahbeng', '2019-07-24 19:10:25');
INSERT INTO Follows VALUES ('betty', 'ahbeng', '2019-07-24 19:10:25');
INSERT INTO Follows VALUES ('sean', 'ahbeng', '2019-07-24 19:10:25');
INSERT INTO Follows VALUES ('samuel', 'ahbeng', '2019-07-24 19:10:25');
INSERT INTO Follows VALUES ('ahbeng', 'betty', '2019-07-24 19:10:25');
INSERT INTO Follows VALUES ('ahbeng', 'sarah', '2019-07-24 19:10:25');
INSERT INTO Likes VALUES ('ahkaofollow', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('ahlong', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('ahmand', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('jane', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('john', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('samuel', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('sean', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('tom', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('arthur', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('betty', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('sarah', 'CheapLolexWatch');
INSERT INTO Likes VALUES ('ahkaofollow', 'ShadyPhoneStore');
INSERT INTO Likes VALUES ('ahlong', 'ShadyPhoneStore');
INSERT INTO Likes VALUES ('ahmand', 'ShadyPhoneStore');

INSERT INTO Categories VALUES ('Art'), ('Comics'), ('Crafts'), ('Dance'), ('Design'), ('Fashion'), ('Film'), ('Food'), ('Games'), ('Journalism'), ('Music'), ('Photography'), ('Publishing'), ('Technology'), ('Theater'), ('Film');


INSERT INTO TaggedWith VALUES ('ShadyPhoneStore', 'Technology'), ('CheapLolexWatch', 'Technology'), ('ShadyPhoneStore', 'Art'), ('ShadyPhoneStore', 'Design'), ('SimLimHardwareShop', 'Comics'), ('goodcalculator', 'Crafts'), ('goodbook', 'Crafts'), ('goodluck', 'Film'), ('goodyear', 'Film'), ('goodman', 'Journalism'), ('goodday', 'Crafts'), ('goodcook', 'Music'), ('goodwife', 'Design'), ('gooddie', 'Comics'), ('goodson', 'Crafts'), ('goodbottle', 'Crafts'), ('goodphone', 'Film'), ('goodspec', 'Film'), ('goodcontrol', 'Journalism'), ('goodtv', 'Crafts'), ('goodstaple', 'Music'), ('goodwire', 'Crafts'), ('goodeyes', 'Crafts'), ('goodchair', 'Film');






INSERT INTO ProjectBundles VALUES('CheapLolexWatch', '1', '20', 'This is only the product'), ('CheapLolexWatch', '2', '50', 'This includes 3x the product'), ('CheapLolexWatch', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('ShadyPhoneStore', '1', '20', 'This is only the product'), ('ShadyPhoneStore', '2', '50', 'This includes 3x the product'), ('ShadyPhoneStore', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('SimLimHardwareShop', '1', '20', 'This is only the product'), ('SimLimHardwareShop', '2', '50', 'This includes 3x the product'), ('SimLimHardwareShop', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodcalculator', '1', '20', 'This is only the product'), ('goodcalculator', '2', '50', 'This includes 3x the product'), ('goodcalculator', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodbook', '1', '20', 'This is only the product'), ('goodbook', '2', '50', 'This includes 3x the product'), ('goodbook', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodluck', '1', '20', 'This is only the product'), ('goodluck', '2', '50', 'This includes 3x the product'), ('goodluck', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodyear', '1', '20', 'This is only the product'), ('goodyear', '2', '50', 'This includes 3x the product'), ('goodyear', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodman', '1', '20', 'This is only the product'), ('goodman', '2', '50', 'This includes 3x the product'), ('goodman', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodday', '1', '20', 'This is only the product'), ('goodday', '2', '50', 'This includes 3x the product'), ('goodday', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodcook', '1', '20', 'This is only the product'), ('goodcook', '2', '50', 'This includes 3x the product'), ('goodcook', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodwife', '1', '20', 'This is only the product'), ('goodwife', '2', '50', 'This includes 3x the product'), ('goodwife', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('gooddie', '1', '20', 'This is only the product'), ('gooddie', '2', '50', 'This includes 3x the product'), ('gooddie', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodson', '1', '20', 'This is only the product'), ('goodson', '2', '50', 'This includes 3x the product'), ('goodson', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodbrush', '1', '20', 'This is only the product'), ('goodbrush', '2', '50', 'This includes 3x the product'), ('goodbrush', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodbottle', '1', '20', 'This is only the product'), ('goodbottle', '2', '50', 'This includes 3x the product'), ('goodbottle', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodphone', '1', '20', 'This is only the product'), ('goodphone', '2', '50', 'This includes 3x the product'), ('goodphone', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodspec', '1', '20', 'This is only the product'), ('goodspec', '2', '50', 'This includes 3x the product'), ('goodspec', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodcontrol', '1', '20', 'This is only the product'), ('goodcontrol', '2', '50', 'This includes 3x the product'), ('goodcontrol', '3', '50', 'This includes 3x the product');

INSERT INTO ProjectBundles VALUES('goodtv', '1', '20', 'This is only the product'), ('goodtv', '2', '50', 'This includes 3x the product'), ('goodtv', '3', '50', 'This includes 3x the product');
 INSERT INTO ProjectBundles VALUES('goodstaple', '1', '20', 'This is only the product'), ('goodstaple', '2', '50', 'This includes 3x the product'), ('goodstaple', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodwire', '1', '20', 'This is only the product'), ('goodwire', '2', '50', 'This includes 3x the product'), ('goodwire', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodeyes', '1', '20', 'This is only the product'), ('goodeyes', '2', '50', 'This includes 3x the product'), ('goodeyes', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectBundles VALUES('goodchair', '1', '20', 'This is only the product'), ('goodchair', '2', '50', 'This includes 3x the product'), ('goodchair', '3', '50', 'This includes 3x the product');
INSERT INTO ProjectMileStones VALUES('CheapLolexWatch','1','200','i will send a welcome letter to you'), ('CheapLolexWatch','2','1000','Each bundle will have additional stickers :D'),('CheapLolexWatch','3','2000','Company is closing to our target soon'), ('CheapLolexWatch','4','10000','Company giving free lolex');
INSERT INTO ProjectMileStones VALUES('ShadyPhoneStore','1','200','i will send a welcome letter to you'), ('ShadyPhoneStore','2','1000','Each bundle will have additional stickers :D'),( 'ShadyPhoneStore','3','2000','Company is closing to our target soon');
INSERT INTO ProjectMileStones VALUES('SimLimHardwareShop','1','200','i will send a welcome letter to you'), ('SimLimHardwareShop','2','1000','Each bundle will have additional stickers :D'),( 'SimLimHardwareShop','3','2000','Company is closing to our target soon');

INSERT INTO ProjectUpdates VALUES('CheapLolexWatch','2019-09-24 19:10:25', 'The product design and production is on track!');
INSERT INTO ProjectUpdates VALUES('CheapLolexWatch','2019-09-25 19:10:25', 'The product design and production is got delay!');
INSERT INTO ProjectUpdates VALUES('CheapLolexWatch','2019-10-25 19:10:25', 'The product design and production is back on track!');
INSERT INTO ProjectUpdates VALUES('ShadyPhoneStore','2019-09-24 19:10:25', 'The product design and production is on track!');
INSERT INTO ProjectUpdates VALUES('SimLimHardwareShop','2019-09-24 19:10:25', 'The product design and production is on track!');
INSERT INTO Fundings VALUES ('ahlong',  'CheapLolexWatch', '2');
INSERT INTO Fundings VALUES ('ahlong',  'ShadyPhoneStore', '2');
INSERT INTO Fundings VALUES ('ahlong',  'SimLimHardwareShop', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodcalculator', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodbook', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodluck', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodyear', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodman', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodday', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodcook', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodwife', '2');
INSERT INTO Fundings VALUES ('ahlong',  'gooddie', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodson', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodbrush', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodbottle', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodphone', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodspec', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodcontrol', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodtv', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodstaple', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodwire', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodeyes', '2');
INSERT INTO Fundings VALUES ('ahlong',  'goodchair', '2');
INSERT INTO Fundings VALUES ('ahmand',  'CheapLolexWatch', '2');
INSERT INTO Fundings VALUES ('jane',  'CheapLolexWatch', '1');
INSERT INTO Fundings VALUES ('john',  'CheapLolexWatch', '1');
INSERT INTO Fundings VALUES ('samuel',  'CheapLolexWatch', '2');
INSERT INTO Fundings VALUES ('tom',  'CheapLolexWatch', '2');
INSERT INTO Fundings VALUES ('arthur',  'CheapLolexWatch', '2');
INSERT INTO Fundings VALUES ('sarah',  'CheapLolexWatch', '2');







/* Test for good track record (ahmand should appear in good track record) and tom should appear in loyal funder list of ahmand */
INSERT INTO Projects VALUES ('fund me please', '2017-02-26',  'just give me money', '120', '2020-11-26');
INSERT INTO Owns VALUES ('ahmand', 'fund me please');
INSERT INTO ProjectBundles VALUES('fund me please', '1', '50', 'Donate and feel good'), ('fund me please', '2', '100', 'This includes 2x the good feeling');
INSERT INTO TaggedWith VALUES ('fund me please', 'Technology');
INSERT INTO ProjectMileStones VALUES('fund me please','1','100','i will say thanks to you');
INSERT INTO Follows VALUES ('tom', 'ahmand', '2011-07-24 19:10:25');
INSERT INTO Follows VALUES ('sarah', 'ahmand', '2017-07-24 19:10:25');
INSERT INTO Follows VALUES  ('sean', 'ahmand', '2011-07-24 19:10:25');
INSERT INTO ProjectUpdates VALUES('fund me please','2019-09-24 19:10:25', 'The product design and production is on track!');
INSERT INTO ProjectUpdates VALUES('fund me please','2019-11-24 19:10:25', 'The product design and production is ready!');
INSERT INTO Fundings VALUES ('ahlong',  'fund me please', '1');
INSERT INTO Fundings VALUES ('tom',  'fund me please', '1');
INSERT INTO Fundings VALUES ('sarah',  'fund me please', '2');

INSERT INTO Projects VALUES ('fund me thanks', '2017-02-26',  'just give me money', '120', '2020-11-26');

INSERT INTO Owns VALUES ('betty', 'fund me thanks');
INSERT INTO Projects VALUES ('fund them thx', '2017-02-26',  'just give me money', '120', '2020-11-26');
INSERT INTO Owns VALUES ('betty', 'fund them thx');
INSERT INTO ProjectBundles VALUES('fund me thanks', '1', '50', 'Donate and feel good'), ('fund me thanks', '2', '100', 'This includes 2x the good feeling');
INSERT INTO ProjectBundles VALUES('fund them thx', '1', '50', 'Donate and feel good'), ('fund them thx', '2', '100', 'This includes 2x the good feeling');
INSERT INTO TaggedWith VALUES ('fund me thanks', 'Technology');
INSERT INTO TaggedWith VALUES ('fund them thx', 'Technology');
INSERT INTO ProjectMileStones VALUES('fund me thanks','1','100','i will say thanks to you');
INSERT INTO ProjectMileStones VALUES('fund them thx','1','100','i will say thanks to you');
INSERT INTO Follows VALUES ('tom', 'betty', '2011-07-24 19:10:25');
INSERT INTO Follows VALUES ('sean', 'betty', '2017-07-24 19:10:25');
INSERT INTO Follows VALUES  ('ahmand', 'betty', '2011-07-24 19:10:25');
INSERT INTO ProjectUpdates VALUES('fund me thanks','2019-10-24 19:10:25', 'The product design and production is on track!');
INSERT INTO ProjectUpdates VALUES('fund me thanks','2019-11-24 19:10:25', 'The product design and production is ready!');
INSERT INTO ProjectUpdates VALUES('fund them thx','2019-09-24 19:10:25', 'The product design and production is ready!');
INSERT INTO Fundings VALUES ('ahmand',  'fund me thanks', '1');
INSERT INTO Fundings VALUES ('tom',  'fund me thanks', '1');
INSERT INTO Fundings VALUES ('sarah',  'fund me thanks', '2');
INSERT INTO Fundings VALUES ('ahmand',  'fund them thx', '1');
INSERT INTO Fundings VALUES ('sean',  'fund them thx', '1');
INSERT INTO Fundings VALUES ('jane', 'fund them thx', '2');
