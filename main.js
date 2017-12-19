const https = require('https');
const config = require('./config.json');

function main() {
  const options = {
    hostname: 'api.github.com',
    path: '/graphql',
    method: 'POST',
    headers: {
      'Authorization': `token ${config.github_token}`,
      'User-Agent': 'github-pr-analyzer',
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let result = ''

    res.setEncoding('utf8');

    res.on('data', (chunk) => {
      result += chunk
    });

    res.on('error', (err) => {
      console.error(`${e.message}`);
    });

    res.on('end', () => {
      console.log(JSON.stringify(JSON.parse(result), 0, 4));
    });
  });

  const query = `query {
    organization(login:"${config.github_organization}") {
      repositories(first:10) {
        edges {
          node {
            id
            name
            pullRequests(first:10) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        }
      }
    }
  }`;

  req.write(JSON.stringify({query}));
  req.end();
}

main();
