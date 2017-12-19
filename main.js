const https = require('https');
const config = require('./config.json');

class Github {
  constructor(github_token) {
    this.options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `token ${github_token}`,
        'User-Agent': 'github-pr-analyzer',
        'Content-Type': 'application/json'
      }
    };
  }

  getPRs(github_organization) {
    return new Promise((resolve, reject) => {
      const req = https.request(this.options, (res) => {
        let result = ''

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          result += chunk
        });

        res.on('error', (err) => {
          reject(e.message);
        });

        res.on('end', () => {
          resolve(JSON.parse(result));
        });
      });

      const query = `query {
        organization(login:"${github_organization}") {
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
    });
  }
}

async function main() {
  try {
    let github = new Github(config.github_token);
    let prs = await github.getPRs(config.github_organization);
    console.log(JSON.stringify(prs, null, 4));
  } catch (e) {
    console.error(e);
  }
}

main();
