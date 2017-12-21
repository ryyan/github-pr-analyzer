'use strict';
const https = require('https');
const config = require('./config.json');

class Repository {

  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.pullRequests = [];
  }

  get prOpenCount() {
    return this.pullRequests.filter(pr => pr.closed === false).length;
  }

  get prClosedCount() {
    return this.pullRequests.filter(pr => pr.closed === true).length;
  }

  get prMergedCount() {
    return this.pullRequests.filter(pr => pr.merged === true).length;
  }
}

class PullRequest {

  constructor(id, title, body) {
    this.id = id;
    this.title = title;
    this.body = body;
  }
}

/**
 * Handles Github Graphql API calls
 *
 * @class Github
 * @constructor
 */
class Github {

  constructor(githubToken) {
    // HTTPS request options
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

  /**
   * Makes a Graphql API call
   *
   * @method request
   * @param {String} query Graphql query
   * @return {Object} Returns parsed JSON data
   */
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

  /**
   * Get all repositories for an account
   *
   * @method getRepositories
   * @param {String} githubAccount Github account/organization name
   * @param {String} endCursor Github graphql endCursor for pagination
   * @return {Array} Returns array of Repository objects
   */
  async getRepositories(githubAccountType, githubAccount, endCursor) {

    try {
      // Set pagination argument
      let paginationArg = `first: 100`;
      if (endCursor) {
        paginationArg += `, after: "${endCursor}"`;
      }

      // Create query
      const query = `query {
        ${githubAccountType}(login: "${githubAccount}") {
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

      // Execute query
      const response = await this.request(query);

      // Extract pageInfo and edges from response
      const pageInfo = response[githubAccountType].repositories.pageInfo;
      const edges = response[githubAccountType].repositories.edges;

      // Convert edges to result objects
      let results = []
      for(let edge in edges) {
        let result = Object.assign(new Repository, edges[edge].node);
        process.stdout.write(`Fetch pull requests for ${result.name}`);
        result.pullRequests = await this.getPullRequests(githubAccount, result.name);
        results.push(result);
      }

      // Recursively get next page of results if available
      if (pageInfo.hasNextPage) {
        return results.concat(await this.getRepositories(githubAccount, pageInfo.endCursor));
      }

      // Return final results
      return results;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get all pull requests for a repository
   *
   * @method getPullRequests
   * @param {String} githubAccount Github account/organization name that owns the repo
   * @param {String} repositoryName Repository name
   * @param {String} endCursor Github graphql endCursor for pagination
   * @return {Array} Returns array of PullRequest objects
   */
  async getPullRequests(githubAccount, repositoryName, endCursor) {
    try {
      // Set pagination argument
      let paginationArg = `first: 100`;
      if (endCursor) {
        paginationArg += `, after: "${endCursor}"`;
      }

      // Create query
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

      // Execute query
      const response = await this.request(query);

      // Extract pageInfo and edges from response
      const pageInfo = response.repository.pullRequests.pageInfo;
      const edges = response.repository.pullRequests.edges;

      // Convert edges to result objects
      const results = edges.map(edge => Object.assign(new PullRequest, edge.node));

      // Recursively get next page of results if available
      if (pageInfo.hasNextPage) {
        process.stdout.write('.');
        return results.concat(await this.getPullRequests(githubAccount, repositoryName, pageInfo.endCursor));
      }

      // Return final results
      console.log();
      return results;
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Counts and displays the states (open/closed/merged/total) for all repositories and combined totals
 *
 * @method countState
 * @param {Array} repositories Array of repositories with fully populated nested elements
 */
function countState(repositories) {
  // Print header
  console.log('Count State');
  console.log('-----------');
  console.log('Repository\tOpen\tClosed\tMerged\tTotal');

  let totalOpen = 0, totalClosed = 0, totalMerged = 0, totalCount = 0;
  repositories.forEach(repo => {
    // Print repository row
    console.log(`${repo.name.substring(0,10)}\t${repo.prOpenCount}\t${repo.prClosedCount}\t${repo.prMergedCount}\t${repo.pullRequests.length}`);

    // Increment totals
    totalOpen += repo.prOpenCount;
    totalClosed += repo.prClosedCount;
    totalMerged += repo.prMergedCount;
    totalCount += repo.pullRequests.length;
  });

  // Print total row
  console.log(`Total\t\t${totalOpen}\t${totalClosed}\t${totalMerged}\t${totalCount}`);
}

/**
 * @method main
 */
async function main() {
  try {
    console.log('Load config.json values and command line args');
    const githubToken = config.githubToken;
    const githubAccountType = process.argv[2];
    const githubAccount = process.argv[3];

    console.log('Initialize github client');
    const github = new Github(githubToken);

    console.log('Fetch repositories');
    const repositories = await github.getRepositories(githubAccountType, githubAccount);

    /* Debug block
    for (let i = 0; i < repositories.length; i++) {
      console.log(repositories[i]);
    }
    */

    // Analysis functions
    console.log();
    countState(repositories);
  } catch (err) {
    console.error(err);
  }
}

console.log('Start pull request analyzer');
main();
