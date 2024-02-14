#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const jwt = require('jsonwebtoken');
const { command } = require('yargs');
const csvtojson = require('csvtojson');
const { Parser } = require('json2csv');

program.version('1.0.0');

// Function to check if a user is admin
function isAdmin() {
    let tokenFilePath = path.join('./cli_responses', 'token.json');
    let isAdminFlag = false;

    if (fs.existsSync(tokenFilePath)) {
        // Process JSON file
        const tokenfile = fs.readFileSync(tokenFilePath, 'utf8');
        try {
            const jsonData = JSON.parse(tokenfile);
            const token = jsonData.token;
            const decoded = jwt.decode(token);
            isAdminFlag = decoded && decoded.is_admin == "1";
            //console.log(isAdminFlag);
        } catch (error) {
            console.error("Error processing JSON token file:", error);
        }
    } else {
        // Fallback to CSV file
        tokenFilePath = path.join('./cli_responses', 'token.csv');
        if (fs.existsSync(tokenFilePath)) {
            const tokenfile = fs.readFileSync(tokenFilePath, 'utf8');
            try {
                // Example CSV parsing logic (assuming a very simple format)
                const lines = tokenfile.split('\n');
                let token = '';
                for (const line of lines) {
                    if (!line.startsWith('token')) {
                        token += line;
                        //console.log(token);
                        break;
                    }
                }
                if (token) {
                    const decoded = jwt.decode(token);
                    isAdminFlag = decoded && decoded.is_admin == "1";
                }
            } catch (error) {
                console.error("Error processing CSV token file:", error);
            }
        }
    }
    return isAdminFlag;
}

async function convertToTsvString(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let data = [];
    if (ext === '.csv') {
        data = await csvtojson().fromFile(filePath);
    } else if (ext === '.json') {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
        throw new Error('Unsupported file format');
    }

    const parser = new Parser({ delimiter: '\t', eol: '\n' });
    const tsv = parser.parse(data);
    return tsv;
}

// Helper function to convert JSON to CSV
function jsonToCSV(json) {
    // Check if json is an array and not empty
    if (Array.isArray(json) && json.length > 0) {
        const rows = [Object.keys(json[0])]; // Header row from keys of the first object
        json.forEach(object => {
            rows.push(Object.values(object));
        });
        return rows.map(row => row.join(',')).join('\n');
    } else if (json && typeof json === 'object') {
        // Handle single object (non-array)
        const header = Object.keys(json);
        const values = Object.values(json);
        return header.join(',') + '\n' + values.join(',');
    } else {
        // Handle empty or unexpected data format
        return 'Unable to convert to CSV: Invalid data format';
    }
}

// 1 -- login
program
    .command('login')
    .description('Log in to the ntuaflix API')
    .requiredOption('--username <username>', 'Your username')
    .requiredOption('--passw <password>', 'Your password')
    .option('--format <format>', 'Format of the file to save the token (json or csv)', 'json')
    .action(login);

async function login(options) {
    if (isAdmin()) {
        console.log("Already logged in.");
    }
    else {
        try {
            const response = await axios.post('http://localhost:7117/ntuaflix_api/login', {
                username: options.username,
                password: options.passw
            });

            // Directory where the token will be saved
            const dir = './cli_responses';

            // Create the directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the token file
            const tokenFilePath = path.join(dir, `token.${options.format}`);

            // Save the token to a file in the specified format
            if (options.format === 'json') {
                fs.writeFile(tokenFilePath, JSON.stringify({ token: response.data.token }, null, 2), (err) => {
                    if (err) {
                        console.error('Error saving token:', err);
                    } else {
                        console.log('Logged in successfully. Token saved to ' + tokenFilePath);
                    }
                });
            } else if (options.format === 'csv') {
                fs.writeFile(tokenFilePath, `token\n${response.data.token}`, (err) => {
                    if (err) {
                        console.error('Error saving token:', err);
                    } else {
                        console.log('Logged in successfully. Token saved to ' + tokenFilePath);
                    }
                });
            } else {
                console.error('Invalid format. Please choose json or csv.');
            }
        } catch (error) {
            console.error('Login failed');
        }
    }
}

// 2 -- logout
program
    .command('logout')
    .description('Log out of the ntuaflix API')
    .option('--format <format>', 'Format of the token file to delete (json or csv)', 'json')
    .action(logout);

function logout(options) {
    if (isAdmin()) {
        // Path for the token file based on the specified format
        const tokenFilePath = path.join('./cli_responses', `token.${options.format}`);

        if (fs.existsSync(tokenFilePath)) {
            fs.unlinkSync(tokenFilePath);
            console.log(`Logged out successfully.`);
        } else {
            console.log(`No token file found in ${options.format} format.`);
        }
    }
    else {
        console.log("You are not logged in.");
    }
}

// 3 -- adduser
program
    .command('adduser')
    .description('Add a new user or update the password of an existing user')
    .requiredOption('--username <username>', 'Username for the user')
    .requiredOption('--passw <password>', 'Password for the user')
    .option('--format <format>', 'Format of the output (json or csv)', 'json')
    .action(addUser);


async function addUser(options) {
    if (isAdmin()) {
        try {
            // Create form data
            const formData = new FormData();
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', '1');

            // POST request with form data
            const response = await axios.post(`http://localhost:7117/admin/usermod/${options.username}/${options.passw}`, formData, {
                headers: formData.getHeaders(),
            });

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            const filePath = path.join(dir, `adduser_${options.username}.${options.format}`);

            // Save the response data
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`User modification details saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Error in adding/updating user:', error);
        }
    }
    else {
        console.log("Anauthorized");
    }
}


// 4 -- user
program
    .command('user')
    .description('Get details of a specific user')
    .requiredOption('--username <username>', 'Username of the user to retrieve')
    .option('--format <format>', 'Format of the output (json or csv)', 'json')
    .action(getUser);

async function getUser(options) {
    if (isAdmin()) {

        try {
            // Create form data
            const formData = new FormData();
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', '1');

            // POST request with form data
            const response = await axios.post(`http://localhost:7117/admin/users/${options.username}`, formData, {
                headers: formData.getHeaders(),
            });

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            const filePath = path.join(dir, `user_${options.username}.${options.format}`);

            // Save the response data
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`User details saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Error in user:', error);
        }
    }
    else {
        console.log("Anouthorized");
    }
}

// 5 -- healthcheck
program
    .command('healthcheck')
    .description('Perform a health check of the ntuaflix API')
    .option('--format <format>', 'Format of the file to save the health check data (json or csv)', 'json')
    .action(healthcheck);

async function healthcheck(options) {
    if (isAdmin()) {
        try {
            const response = await axios.get('http://localhost:7117/admin/healthcheck');

            // Directory where the file will be saved
            const dir = './cli_responses';

            // Create the directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the new file
            const filePath = path.join(dir, `healthcheck.${options.format}`);

            // Save the response data to a file in the specified format
            if (options.format === 'json') {
                fs.writeFile(filePath, JSON.stringify(response.data, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                    } else {
                        console.log('Health check data saved to ' + filePath);
                    }
                });
            } else if (options.format === 'csv') {
                // Convert JSON to CSV (simple implementation, might need adjustment based on actual JSON structure)
                const csv = jsonToCSV(response.data);
                fs.writeFile(filePath, csv, (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                    } else {
                        console.log('Health check data saved to ' + filePath);
                    }
                });
            } else {
                console.error('Invalid format. Please choose json or csv.');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 6 -- resetall

program
    .command('resetall')
    .description('Reset all data in the ntuaflix API')
    .option('--format <format>', 'Format of the response output (json or csv)', 'json')
    .action(resetall);

// Implementation of the resetall action function
async function resetall(options) {
    if (isAdmin()) {
        try {
            // Assuming authorization is needed
            const formData = new FormData();
            formData.append('secretKey', '3141592653589793236264'); // Adjust secretKey as needed
            formData.append('is_user_admin', 'true'); // Adjust is_user_admin as needed

            const response = await axios.post('http://localhost:7117/admin/resetall', formData, {
                headers: formData.getHeaders(),
            });

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the new file
            const filePath = path.join(dir, `resetall_response.${options.format}`);

            // Save the response data to a file in the specified format
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`Reset response saved to ${filePath}`);
                }
            });

        } catch (error) {
            console.error('Error resetting data:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 7 -- newtitles

program
    .command('newtitles')
    .description('Upload new title basics to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the title basics to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newtitles);

async function newtitles(options) {
    if (isAdmin()) {
        try {
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const tsvContent = await convertToTsvString(filePath);
            const formData = new FormData();
            formData.append('file', Buffer.from(tsvContent), { filename: 'upload.tsv', contentType: 'text/tab-separated-values' });
            formData.append('format', 'tsv');


            // Append the secretKey and is_user_admin fields
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true'); // or whatever value is appropriate
            // Additional fields like secretKey or is_user_admin should be appended here if required

            const response = await axios.post('http://localhost:7117/admin/upload/titlebasics', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading title basics:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}



// 8 -- newakas

program
    .command('newakas')
    .description('Upload new title akas to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the title akas to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newakas);

async function newakas(options) {
    if (isAdmin()) {
        try {
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('format', options.format);

            // Include the secretKey and is_user_admin if needed for authorization
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true');

            const response = await axios.post('http://localhost:7117/admin/upload/titleakas', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading title akas:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}


// 9 -- newnames

program
    .command('newnames')
    .description('Upload new name basics to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the name basics to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newnames);

// Implementation of the newnames action function
async function newnames(options) {
    if (isAdmin()) {
        try {
            // Assuming 'cli_posts' is in the same directory as your CLI script
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('format', options.format);

            // Include secretKey and is_user_admin if needed for authorization
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true');

            const response = await axios.post('http://localhost:7117/admin/upload/namebasics', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading name basics:', error);
        }
    }
    else {
        console.log("Anauthorized.")
    }
}

// 10 -- newcrew

program
    .command('newcrew')
    .description('Upload new title crew to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the title crew to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newcrew);

// Implementation of the newcrew action function
async function newcrew(options) {
    if (isAdmin()) {
        try {
            // Assuming 'cli_posts' is in the same directory as your CLI script
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('format', options.format);

            // Include secretKey and is_user_admin if needed for authorization
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true');

            const response = await axios.post('http://localhost:7117/admin/upload/titlecrew', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading title crew:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 11 -- newepisode

program
    .command('newepisode')
    .description('Upload new title episode to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the title episode to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newepisode);

// Implementation of the newepisode action function
async function newepisode(options) {
    if (isAdmin()) {
        try {
            // Assuming 'cli_posts' is in the same directory as your CLI script
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('format', options.format);

            // Include secretKey and is_user_admin if needed for authorization
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true');

            const response = await axios.post('http://localhost:7117/admin/upload/titleepisode', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading title episode:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 12 -- newprincipals

program
    .command('newprincipals')
    .description('Upload new title principals to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the title principals to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newprincipals);

// Implementation of the newprincipals action function
async function newprincipals(options) {
    if (isAdmin()) {
        try {
            // Assuming 'cli_posts' is in the same directory as your CLI script
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('format', options.format);

            // Include secretKey and is_user_admin if needed for authorization
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true');

            const response = await axios.post('http://localhost:7117/admin/upload/titleprincipals', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading title principals:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 13 -- newratings
program
    .command('newratings')
    .description('Upload new title ratings to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the ratings to upload')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(newratings);

async function newratings(options) {
    if (isAdmin()) {
        try {
            const filePath = path.join(process.cwd(), 'cli_posts', options.filename);
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('format', options.format);


            // Append the secretKey and is_user_admin fields
            formData.append('secretKey', '3141592653589793236264');
            formData.append('is_user_admin', 'true'); // or whatever value is appropriate
            // Additional fields like secretKey or is_user_admin should be appended here if required

            const response = await axios.post('http://localhost:7117/admin/upload/titleratings', formData, {
                headers: formData.getHeaders(),
            });

            console.log(response.data);
        } catch (error) {
            console.error('Error uploading title basics:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 14 -- title
program
    .command('title')
    .description('Fetch a title by its ID from the ntuaflix API')
    .requiredOption('--titleID <titleID>', 'The titleID of the movie or series to fetch')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(getTitleById);

async function getTitleById(options) {
    if (isAdmin()) {
        try {
            const response = await axios.get(`http://localhost:7117/ntuaflix_api/title/${options.titleID}`);

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the new file
            const filePath = path.join(dir, `title_${options.titleID}.${options.format}`);

            // Save the response data to a file in the specified format
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`Title data saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Error fetching title by ID:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 15 -- searchtitle
program
    .command('searchtitle')
    .description('Search for titles in the ntuaflix database by a part of the title')
    .requiredOption('--titlepart <titlePart>', 'The part of the title to search for')
    .option('--format <format>', 'Format of the file (json or csv)', 'json')
    .action(searchtitle);

async function searchtitle(options) {
    if (isAdmin()) {
        try {
            // Make the POST request to the searchtitle endpoint with the title part in the body
            const response = await axios.post('http://localhost:7117/ntuaflix_api/searchtitle', { titlePart: options.titlepart });

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the new file
            const filePath = path.join(dir, `searchtitle_${options.titlepart}.${options.format}`);

            // Save the response data to a file in the specified format
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`Title search results saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Error performing title search:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 16 -- bygenre
program
    .command('bygenre')
    .description('Fetch movies from the ntuaflix database')
    .requiredOption('--genre <qgenre>', 'The full name of the genre')
    .requiredOption('--min <minrating>', 'The minimum rating')
    .requiredOption('--from <yrFrom>', 'Year "From" ')
    .requiredOption('--to <yrTo>', 'Year "To" ')
    .option('--format <format>', 'Format of the response output (json or csv)', 'json')
    .action(getMovieByGenre);

    async function getMovieByGenre(options) {
        if (isAdmin()) {
            try {
    
                const response = await axios.post(`http://localhost:7117/ntuaflix_api/bygenre`,{
                    "secretKey": "3141592653589793236264",
                    "is_user_admin": 1,
                    "qgenre": options.genre,
                    "minrating": options.min,
                    "yrFrom": options.from,
                    "yrTo": options.to
                });
                //console.log(response);
    
                const dir = './cli_responses';
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir);
                }
    
                const filePath = path.join(dir, `movies_${options.genre}_${options.min}.${options.format}`);
                const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
    
                fs.writeFile(filePath, fileData, (err) => {
                    if (err) {
                        console.error('Error writing file:', err);
                    } else {
                        console.log(`Movies saved to ${filePath}`);
                    }
                });
            } catch (error) {
                console.error('Error fetching movies: ', error);
            }
        } else {
            console.log("Unauthorized.");
        }
    }


// 17 -- nameID
program
    .command('name')
    .description('Fetch details of a person by their name fidrom the ntuaflix database')
    .requiredOption('--nameid <nameid>', 'The nameid (nconst) of the person to fetch details for')
    .option('--format <format>', 'Format of the response output (json or csv)', 'json')
    .action(getNameById);

async function getNameById(options) {
    if (isAdmin()) {
        try {
            // Make the GET request to the name endpoint
            const response = await axios.get(`http://localhost:7117/ntuaflix_api/name/${options.nameid}`);

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the new file
            const filePath = path.join(dir, `name_${options.nameid}.${options.format}`);

            // Save the response data to a file in the specified format
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`Person details saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Error fetching person details:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

// 18 -- searchname
program
    .command('searchname')
    .description('Search for people in the ntuaflix database by a part of the name')
    .requiredOption('--name <namePart>', 'The part of the name to search for')
    .option('--format <format>', 'Format of the response output (json or csv)', 'json')
    .action(searchname);

async function searchname(options) {
    if (isAdmin()) {
        try {
            // Make the POST request to the searchname endpoint with the name part in the body
            const response = await axios.post('http://localhost:7117/ntuaflix_api/searchname', { namePart: options.name });

            // Directory where the file will be saved
            const dir = './cli_responses';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }

            // Path for the new file
            const filePath = path.join(dir, `searchname_${options.namePart}.${options.format}`);

            // Save the response data in the specified format
            const fileData = options.format === 'json' ? JSON.stringify(response.data, null, 2) : jsonToCSV(response.data);
            fs.writeFile(filePath, fileData, (err) => {
                if (err) {
                    console.error('Error writing file:', err);
                } else {
                    console.log(`Name search results saved to ${filePath}`);
                }
            });
        } catch (error) {
            console.error('Error performing name search:', error);
        }
    }
    else {
        console.log("Anauthorized.");
    }
}

program.parse(process.argv);