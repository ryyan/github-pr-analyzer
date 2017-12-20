'use strict';

const https = require('https');
const config = require('./config.json');

class Repository {

  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.pullRequests = [];
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

  constructor(githubToken) {
    // HTTP request options
    this.options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'github-pr-analyzer',
        'Content-Type': 'application/json'
      }
    };
  }

  request(query) {
    return new Promise((resolve, reject) => {
      const req = https.request(this.options, (res) => {
        let result = ''

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          result += chunk
        });

        res.on('error', (err) => {
          return reject(e.message);
        });

        res.on('end', () => {
          result = JSON.parse(result);
          if(result.errors) {
            return reject(result.errors);
          } else {
            return resolve(result.data);
          }
        });
      });

      req.write(JSON.stringify({query}));
      req.end();
    });
  };

  async getRepositories(githubAccount, endCursor) {
    try {
      let paginationArg = `first: 100`;
      if (endCursor) {
        paginationArg += `, after: "${endCursor}"`;
      }

      const query = `query {
        organization(login: "${githubAccount}") {
          repositories(${paginationArg}) {
            edges {
              node {
                id
                name
              }
            }

            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }`;

      const response = await this.request(query);
      const pageInfo = response.organization.repositories.pageInfo;
      const edges = response.organization.repositories.edges;
      const result = edges.map(edge => Object.assign(new Repository, edge.node));

      if (pageInfo.hasNextPage) {
        return result.concat(await this.getRepositories(githubAccount, pageInfo.endCursor));
      }
      return result;
    } catch (e) {
      throw e;
    }
  }

  async getPullRequests(githubAccount, repositoryName, endCursor) {
    try {
      let paginationArg = `first: 100`;
      if (endCursor) {
        paginationArg += `, after: "${endCursor}"`;
      }

      const query = `query {
        repository(owner: "${githubAccount}", name: "${repositoryName}") {
          pullRequests(${paginationArg}) {
            edges {
              node {
                id
                number
                title
                body
                baseRefName
                author {
                  login
                }

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

            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }`;

      const response = await this.request(query);
      const pageInfo = response.repository.pullRequests.pageInfo;
      const edges = response.repository.pullRequests.edges;
      const result = edges.map(edge => Object.assign(new PullRequest, edge.node));

      if (pageInfo.hasNextPage) {
        return result.concat(await this.getPullRequests(githubAccount, repositoryName, pageInfo.endCursor));
      }
      return result;
    } catch (e) {
      throw e;
    }
  }
}

async function main() {
  try {
    // Initialize github client
    let github = new Github(config.githubToken);

    // Get repositories
    let repositories = await github.getRepositories(config.githubAccount);

    // Populate repositories with their PRs
    for (let i = 0; i < repositories.length; i++) {
      repositories[i].pullRequests = await github.getPullRequests(config.githubAccount, repositories[i].name);
      console.log(repositories[i]);
    }
  } catch (e) {
    console.error(e);
  }
}

main();
