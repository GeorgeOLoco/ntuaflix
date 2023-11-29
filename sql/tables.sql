DROP DATABASE IF EXISTS ntuaflix;

CREATE DATABASE ntuaflix;
USE ntuaflix;

CREATE TABLE users (
    userID INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    email VARCHAR(255),
    password_hashed VARCHAR(255)
);

CREATE TABLE people (
    nconst VARCHAR(255) PRIMARY KEY,
    primaryName VARCHAR(255),
    birthYear VARCHAR(255),
    deathYear VARCHAR(255),
    primaryProfession VARCHAR(255),
    knownForTitles VARCHAR(255),
    img_url_asset VARCHAR(255)
);

CREATE TABLE Titles (
    tconst VARCHAR(255) PRIMARY KEY,
    titletype VARCHAR(255),
    primarytitle VARCHAR(255),
    originaltitle VARCHAR(255),
    isAdult BOOLEAN,
    startYear VARCHAR(255),
    endYear VARCHAR(255),
    runtimeMinutes VARCHAR(255),
    genres VARCHAR(255),
    img_url_asset VARCHAR(255)
);

CREATE TABLE Episodes (
    episodeID INT AUTO_INCREMENT PRIMARY KEY,
    seriesID VARCHAR(255),
    seasonN VARCHAR(255),
    episodeN VARCHAR(255),
    FOREIGN KEY (seriesID) REFERENCES Titles(tconst)
);

CREATE TABLE Title_ratings (
    ratingID INT AUTO_INCREMENT PRIMARY KEY,
    titleid VARCHAR(255),
    averageRate DECIMAL(3, 2),
    numVotes INT,
    FOREIGN KEY (titleid) REFERENCES Titles(tconst)
);

CREATE TABLE title_crew (
    tconst VARCHAR(255),
    directors VARCHAR(255),
    writers VARCHAR(255),
    PRIMARY KEY (tconst),
    FOREIGN KEY (tconst) REFERENCES Titles(tconst)
);

CREATE TABLE title_principals (
    tconst VARCHAR(255),
    ordering INT,
    nconst VARCHAR(255),
    category VARCHAR(255),
    job VARCHAR(255),
    characters VARCHAR(255),
    img_url_assets VARCHAR(255),
    PRIMARY KEY (tconst, ordering),
    FOREIGN KEY (tconst) REFERENCES Titles(tconst),
    FOREIGN KEY (nconst) REFERENCES people(nconst)
);

CREATE TABLE title_akas (
    tconst VARCHAR(255),
    ordering INT,
    title VARCHAR(255),
    region VARCHAR(255),
    language VARCHAR(255),
    types VARCHAR(255),
    attributes VARCHAR(255),
    isOriginalTitle BOOLEAN,
    PRIMARY KEY (tconst, ordering),
    FOREIGN KEY (tconst) REFERENCES Titles(tconst)
);

CREATE TABLE watchlist (
    userID INT,
    tconst VARCHAR(255),
    watched BOOLEAN,
    PRIMARY KEY (userID, tconst),
    FOREIGN KEY (userID) REFERENCES users(userID),
    FOREIGN KEY (tconst) REFERENCES Titles(tconst)
);

CREATE TABLE forum (
    forumID INT AUTO_INCREMENT PRIMARY KEY,
    tconst VARCHAR(255),
    title VARCHAR(255),
    description VARCHAR(255),
    FOREIGN KEY (tconst) REFERENCES Titles(tconst)
);

CREATE TABLE comments (
    commentID INT AUTO_INCREMENT PRIMARY KEY,
    forumID INT,
    userID INT,
    commentText VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (forumID) REFERENCES forum(forumID),
    FOREIGN KEY (userID) REFERENCES users(userID)
);
