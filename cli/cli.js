#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

program.version('1.0.0');

// 1 -- login

// 2 -- logout

// 3 -- adduser

// 4 -- user

// 5 -- healthcheck
program
    .command('healthcheck')
    .description('Perform a health check of the ntuaflix API')
    .action(healthcheck);

async function healthcheck() {
    try {
        const response = await axios.get('http://localhost:7117/admin/healthcheck');
        
        // Directory where the file will be saved
        const dir = './cli_responses';

        // Create the directory if it doesn't exist
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        // Path for the new file
        const filePath = path.join(dir, 'healthcheck.json');

        // Save the response data to a JSON file
        fs.writeFile(filePath, JSON.stringify(response.data, null, 2), (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('Health check data saved to ' + filePath);
            }
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

program.parse(process.argv);

// 6 -- resetall

// 7 -- newtitles

// 8 -- newakas

// 9 -- newnames

// 10 -- newcrew

// 11 -- newepisode

// 12 -- newprincipals

// 13 -- newratings
program
    .command('newratings')
    .description('Upload new title ratings to the ntuaflix API')
    .requiredOption('--filename <filename>', 'The filename of the ratings to upload')
    .action(newratings);

async function newratings(options) {
    try {
        const response = await axios.post('http://localhost:7117/admin/upload/titleratings', {
            filename: options.filename
        });
        
        // Directory where the file will be saved
        const dir = './cli_responses';

        // Create the directory if it doesn't exist
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        // Path for the new file
        const filePath = path.join(dir, 'newratings.json');

        // Save the response data to a JSON file
        fs.writeFile(filePath, JSON.stringify(response.data, null, 2), (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('New ratings data saved to ' + filePath);
            }
        });
    } catch (error) {
        console.error('Error uploading data:', error);
    }
}

program.parse(process.argv);

// 14 -- title
program
    .command('title')
    .description('Retrieve a title by its ID from the ntuaflix API')
    .requiredOption('--titleID <id>', 'The ID of the title to retrieve')
    .action(title);

async function title(options) {
    try {
        const response = await axios.get(`http://localhost:7117/title/${options.titleID}`);
        
        // Handle the rest of the file saving similarly to healthcheck
    } catch (error) {
        console.error('Error fetching title:', error);
    }
}

program.parse(process.argv);

// 15 -- searchtitle
program
    .command('searchtitle')
    .description('Search for a title with a part of its name')
    .requiredOption('--titlepart <part>', 'The part of the title name to search for')
    .action(searchtitle);

async function searchtitle(options) {
    try {
        const response = await axios.get(`http://localhost:7117/searchtitle`, {
            params: { q: options.titlepart }
        });
        
        // Handle the rest of the file saving similarly to healthcheck
    } catch (error) {
        console.error('Error searching title:', error);
    }
}

program.parse(process.argv);

// 16 -- bygenre
program
    .command('bygenre')
    .description('Retrieve titles by genre with optional filters for minimum and maximum year')
    .requiredOption('--genre <genre>', 'The genre of the titles to retrieve')
    .option('--min <year>', 'The minimum year for filtering titles', '')
    .option('--max <year>', 'The maximum year for filtering titles', '')
    .action(bygenre);

async function bygenre(options) {
    try {
        const params = {
            genre: options.genre,
            ...(options.min && { min: options.min }),
            ...(options.max && { max: options.max }),
        };
        const response = await axios.get(`http://localhost:7117/bygenre`, { params });
        
        // Handle the rest of the file saving similarly to healthcheck
    } catch (error) {
        console.error('Error fetching by genre:', error);
    }
}

program.parse(process.argv);

// 17 -- name
program
    .command('name')
    .description('Retrieve a name by its ID from the ntuaflix API')
    .requiredOption('--nameid <id>', 'The ID of the name to retrieve')
    .action(name);

async function name(options) {
    try {
        const response = await axios.get(`http://localhost:7117/name/${options.nameid}`);
        
        // Handle the rest of the file saving similarly to healthcheck
    } catch (error) {
        console.error('Error fetching name:', error);
    }
}

program.parse(process.argv);

// 18 -- searchname 
program
    .command('searchname')
    .description('Search for a name in the ntuaflix API')
    .requiredOption('--name <name>', 'The name to search for')
    .action(searchname);

async function searchname(options) {
    try {
        const response = await axios.get(`http://localhost:7117/searchname`, {
            params: { q: options.name }
        });
        
        // Handle the rest of the file saving similarly to healthcheck
    } catch (error) {
        console.error('Error searching name:', error);
    }
}

program.parse(process.argv);





