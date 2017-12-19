const https = require('https');
const config = require('./config.json');

class Repository {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.PullRequests = [];
  }
}

class PullRequest {
  constructor(id, title, body) {
    this.id = id;
    this.title = title;
    this.body = body;
  }
}

class Github {
  constructor(github_token) {
    const options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `token ${github_token}`,
        'User-Agent': 'github-pr-analyzer',
        'Content-Type': 'application/json'
      }
    };

    this.request = (query) => {
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
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

        req.write(JSON.stringify({query}));
        req.end();
      });
    };
  }

  async getRepositories(owner) {
    try {
      const query = `query {
        organization(login: "${owner}") {
          repositories(first:100) {
            edges {
              node {
                id
                name
                nameWithOwner
              }
            }
          }
        }
      }`;

      let result = await this.request(query);
      return result['data']['organization']['repositories']['edges']
        .map(repository => Object.assign(new Repository, repository['node']));
    } catch (e) {
      throw e;
    }
  }

  async getPRs(repository_owner, repository_name) {
    try {
      const query = `query {
        repository(owner: "${repository_owner}", name: "${repository_name}") {
          pullRequests(first:100) {
            edges {
              node {
                id
                number
                title
                body
                author {
                  login
                }
                baseRefName
                additions
                deletions
                changedFiles
                state
                createdAt
                closed
                closedAt
                merged
                mergedAt
                mergeable
              }
            }
          }
        }
      }`;

      let result = await this.request(query);
      console.log(JSON.stringify(result, null, 4));
      return result['data']['repository']['pullRequests']['edges']
        .map(pr => Object.assign(new PullRequest, pr['node']));
    } catch (e) {
      throw e;
    }
  }
}

async function main() {
  try {
    let github = new Github(config.github_token);
    let repositories = await github.getRepositories(config.github_organization);
    console.log(repositories);

    let prs = await github.getPRs(config.github_organization, repositories[0].name);
    console.log(prs);
  } catch (e) {
    console.error(e);
  }
}

main();
